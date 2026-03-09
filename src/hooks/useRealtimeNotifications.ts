import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return "mobile";
  return "desktop";
}

async function subscribeToPush() {
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("❌ Push API not supported");
        return false;
      }

      console.log(`🔄 Subscribe attempt ${retryCount + 1}/${MAX_RETRIES}`);

      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SW ready timeout")), 15000)
        ),
      ]);

      console.log("✅ SW ready, scope:", registration.scope);

      if (!registration.active) {
        throw new Error("SW registered but not active yet");
      }

      let subscription = await registration.pushManager.getSubscription();
      const deviceType = detectDeviceType();
      const userAgent = navigator.userAgent;

      if (subscription) {
        console.log("✅ Existing subscription found, validating...");
        const subJson = subscription.toJSON();

        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          console.warn("⚠️ Invalid subscription, unsubscribing...");
          await subscription.unsubscribe();
          subscription = null;
        } else {
          console.log("🔄 Re-syncing subscription to database...");
          const { error } = await cloudSupabase.from("push_subscriptions").upsert(
            {
              endpoint: subJson.endpoint,
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
              device_type: deviceType,
              user_agent: userAgent,
            } as any,
            { onConflict: "endpoint" }
          );

          if (error) {
            console.error("❌ Sync failed:", error.message);
            await subscription.unsubscribe();
            subscription = null;
          } else {
            console.log("✅ Subscription validated and synced (device:", deviceType, ")");
            return true;
          }
        }
      }

      console.log("🔄 Creating new subscription...");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const vapidRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/web-push?action=vapid-key`,
        { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } }
      );

      if (!vapidRes.ok) {
        throw new Error(`VAPID fetch failed: ${vapidRes.status}`);
      }

      const { publicKey } = await vapidRes.json();
      if (!publicKey) {
        throw new Error("No VAPID key received");
      }

      console.log("🔑 Got VAPID key, subscribing...");

      const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log("✅ New push subscription created");

      const subJson = subscription.toJSON();
      const { error } = await cloudSupabase.from("push_subscriptions").upsert(
        {
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
          device_type: deviceType,
          user_agent: userAgent,
        } as any,
        { onConflict: "endpoint" }
      );

      if (error) {
        throw new Error(`Failed to store subscription: ${error.message}`);
      }

      console.log("✅ Push subscription stored (device:", deviceType, ")");

      if ('periodicSync' in registration) {
        try {
          await (registration as any).periodicSync.register('keep-alive', {
            minInterval: 12 * 60 * 60 * 1000,
          });
        } catch (_e) {
          // not available
        }
      }

      return true;
    } catch (err: any) {
      console.error(`❌ Push subscription attempt ${retryCount + 1} failed:`, err.message);
      retryCount++;

      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("❌ All push subscription attempts failed");
  return false;
}

export function useRealtimeNotifications() {
  const hasSubscribed = useRef(false);
  const revalidationInterval = useRef<number>();

  useEffect(() => {
    if ("Notification" in window && !hasSubscribed.current) {
      hasSubscribed.current = true;

      const setupPush = async () => {
        let permission = Notification.permission;
        console.log("🔔 Initial notification permission:", permission);

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
          await new Promise((r) => setTimeout(r, 1000));
          const success = await subscribeToPush();

          if (success) {
            revalidationInterval.current = window.setInterval(async () => {
              await subscribeToPush();
            }, 6 * 60 * 60 * 1000);
          }
        } else {
          console.warn("⚠️ Notification permission denied");
        }
      };

      setupPush();
    }

    supabase
      .from("notification1")
      .select("*", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) {
          console.error("❌ notification1 error:", error.message);
        } else {
          console.log(`✅ notification1 accessible. Rows: ${count}`);
        }
      });

    console.log("🔔 Subscribing to notification1...");
    const channel = supabase
      .channel("notification1-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification1" },
        (payload) => {
          console.log("🔔 New notification:", payload);
          toast("New Pick List 📋", {
            description: "تمت إضافة بيك لست جديدة",
            duration: 10000,
          });
        }
      )
      .subscribe((status, err) => {
        console.log("🔔 Realtime status:", status);
        if (err) console.error("❌ Realtime error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
      if (revalidationInterval.current) {
        clearInterval(revalidationInterval.current);
      }
    };
  }, []);
}

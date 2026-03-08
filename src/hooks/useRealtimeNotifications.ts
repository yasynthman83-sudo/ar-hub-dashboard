import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("❌ Push API not supported on this device");
      return;
    }

    // Wait for SW with timeout
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW ready timeout")), 10000)
      ),
    ]);

    console.log("✅ Service Worker ready, scope:", registration.scope);

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Validate subscription is still valid by checking permissionState
      const permState = await registration.pushManager.permissionState({
        userVisibleOnly: true,
      });
      console.log("🔑 Push permission state:", permState);

      if (permState !== "granted") {
        console.warn("⚠️ Push permission revoked, unsubscribing...");
        await subscription.unsubscribe();
        subscription = null;
      } else {
        console.log("✅ Existing push subscription valid, re-syncing to server");
        const subJson = subscription.toJSON();
        await cloudSupabase.from("push_subscriptions").upsert(
          {
            endpoint: subJson.endpoint!,
            p256dh: subJson.keys!.p256dh!,
            auth: subJson.keys!.auth!,
          },
          { onConflict: "endpoint" }
        );
        console.log("✅ Subscription synced. Endpoint:", subJson.endpoint?.substring(0, 60));
        return;
      }
    }

    // Get VAPID public key from edge function
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const vapidRes = await fetch(
      `https://${projectId}.supabase.co/functions/v1/web-push?action=vapid-key`,
      { headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey } }
    );
    const { publicKey } = await vapidRes.json();

    if (!publicKey) {
      console.error("❌ No VAPID public key received");
      return;
    }

    console.log("🔑 Got VAPID key, creating new subscription...");

    // Convert base64url to Uint8Array
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

    console.log("✅ New push subscription created:", subscription.endpoint.substring(0, 60));

    // Store subscription in Cloud database
    const subJson = subscription.toJSON();
    const { error } = await cloudSupabase.from("push_subscriptions").upsert(
      {
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("❌ Failed to store subscription:", error);
    } else {
      console.log("✅ Push subscription stored successfully");
    }
  } catch (err) {
    console.error("❌ Push subscription failed:", err);
  }
}

export function useRealtimeNotifications() {
  const hasSubscribed = useRef(false);

  useEffect(() => {
    // Request notification permission and subscribe to push
    if ("Notification" in window && !hasSubscribed.current) {
      hasSubscribed.current = true;

      const setupPush = async () => {
        let permission = Notification.permission;
        console.log("🔔 Current notification permission:", permission);

        if (permission === "default") {
          permission = await Notification.requestPermission();
          console.log("🔔 Permission result:", permission);
        }

        if (permission === "granted") {
          // Small delay to ensure SW is registered
          await new Promise((r) => setTimeout(r, 1500));
          await subscribeToPush();
        } else {
          console.warn("⚠️ Notification permission denied");
        }
      };

      setupPush();
    }

    // Test Supabase connection
    supabase
      .from("notification1")
      .select("*", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) {
          console.error("❌ Cannot access notification1 table:", error.message);
        } else {
          console.log(`✅ notification1 table accessible. Row count: ${count}`);
        }
      });

    console.log("🔔 Subscribing to notification1 realtime channel...");

    const channel = supabase
      .channel("notification1-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification1" },
        (payload) => {
          console.log("🔔 New notification received:", payload);

          // In-app toast only - Push is handled by Database Webhook
          toast("New Pick List 📋", {
            description: "تمت إضافة بيك لست جديدة",
            duration: 10000,
          });
        }
      )
      .subscribe((status, err) => {
        console.log("🔔 Realtime subscription status:", status);
        if (err) console.error("❌ Realtime error:", err);
        if (status === "SUBSCRIBED") console.log("✅ Subscribed to notification1!");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

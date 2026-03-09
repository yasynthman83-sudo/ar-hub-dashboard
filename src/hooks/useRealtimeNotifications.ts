import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      // Wait for SW ready with timeout
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("SW ready timeout")), 15000)
        ),
      ]);

      console.log("✅ SW ready, scope:", registration.scope);

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        console.log("✅ Existing subscription found, validating...");
        const subJson = subscription.toJSON();
        
        // Validate subscription has required keys
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          console.warn("⚠️ Invalid subscription, unsubscribing...");
          await subscription.unsubscribe();
          subscription = null;
        } else {
          // Re-sync to database to ensure it's stored
          console.log("🔄 Re-syncing subscription to database...");
          const { error } = await cloudSupabase.from("push_subscriptions").upsert(
            {
              endpoint: subJson.endpoint,
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
            { onConflict: "endpoint" }
          );
          
          if (error) {
            console.error("❌ Sync failed:", error.message);
            // If sync fails, try to unsubscribe and resubscribe
            await subscription.unsubscribe();
            subscription = null;
          } else {
            console.log("✅ Subscription validated and synced successfully");
            return true;
          }
        }
      }

      // No valid subscription, create new one
      console.log("🔄 Creating new subscription...");
      
      // Get VAPID key
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

      console.log("✅ New push subscription created");

      // Store in database
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
        throw new Error(`Failed to store subscription: ${error.message}`);
      }

      console.log("✅ Push subscription stored successfully");

      // Try to register periodic sync to keep SW alive
      if ('periodicSync' in registration) {
        try {
          await (registration as any).periodicSync.register('keep-alive', {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
          });
          console.log("✅ Periodic sync registered");
        } catch (e) {
          console.log("ℹ️ Periodic sync not available");
        }
      }

      return true;
    } catch (err: any) {
      console.error(`❌ Push subscription attempt ${retryCount + 1} failed:`, err.message);
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`⏱️ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("❌ All push subscription attempts failed");
  return false;
}

export function useRealtimeNotifications() {
  const hasSubscribed = useRef(false);

  useEffect(() => {
    // Subscribe to push notifications
    if ("Notification" in window && !hasSubscribed.current) {
      hasSubscribed.current = true;

      const setupPush = async () => {
        let permission = Notification.permission;
        console.log("🔔 Notification permission:", permission);

        if (permission === "default") {
          permission = await Notification.requestPermission();
          console.log("🔔 Permission result:", permission);
        }

        if (permission === "granted") {
          // Small delay for SW to stabilize
          await new Promise((r) => setTimeout(r, 1000));
          await subscribeToPush();
        } else {
          console.warn("⚠️ Notification permission denied");
        }
      };

      setupPush();
    }

    // Test external Supabase connection
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

    // Subscribe to realtime inserts for in-app toast
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
    };
  }, []);
}

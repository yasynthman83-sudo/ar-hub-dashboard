import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("❌ Push API not supported");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log("✅ Service Worker ready for push");

    // Check existing subscription - unsubscribe if VAPID key changed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log("✅ Already subscribed to push, re-sending to server");
      // Re-store in case it wasn't saved
      const subJson = subscription.toJSON();
      await cloudSupabase.from("push_subscriptions").upsert(
        {
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
        { onConflict: "endpoint" }
      );
      return;
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
      console.error("❌ No VAPID public key");
      return;
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

    console.log("✅ Push subscription created:", subscription.endpoint);

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
      console.log("✅ Push subscription stored in database");
    }
  } catch (err) {
    console.error("❌ Push subscription failed:", err);
  }
}

export function useRealtimeNotifications() {
  const permissionGranted = useRef(false);

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        permissionGranted.current = true;
        console.log("✅ Notification permission already granted");
        // Subscribe to Web Push
        subscribeToPush();
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((result) => {
          console.log("🔔 Notification permission result:", result);
          if (result === "granted") {
            permissionGranted.current = true;
            subscribeToPush();
          }
        });
      }
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

          // In-app toast
          toast("New Pick List 📋", {
            description: "تمت إضافة بيك لست جديدة",
            duration: 10000,
          });

          // Also trigger push via edge function (for other devices)
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          fetch(`https://${projectId}.supabase.co/functions/v1/web-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            },
            body: JSON.stringify({
              action: "send",
              title: "📋 New Pick List",
              body: "بكلست جديدة",
            }),
          }).catch((err) => console.error("❌ Push send failed:", err));
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

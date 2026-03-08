import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function useRealtimeNotifications() {
  const permissionGranted = useRef(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('✅ Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.error('❌ Service Worker registration failed:', err);
      });
    }

    // Request notification permission immediately
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        permissionGranted.current = true;
        console.log("✅ Notification permission already granted");
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((result) => {
          console.log("🔔 Notification permission result:", result);
          if (result === "granted") {
            permissionGranted.current = true;
          }
        });
      } else {
        console.warn("❌ Notification permission denied by user");
      }
    } else {
      console.warn("❌ Browser does not support Notifications API");
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

          // Native notification - ALWAYS use Service Worker first (required for mobile)
          if (Notification.permission === 'granted') {
            const notifTitle = '📋 New Pick List';
            const notifOptions = {
              body: 'بكلست جديدة',
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'picklist-' + Date.now(),
              requireInteraction: true,
              vibrate: [200, 100, 200],
              silent: false,
              renotify: true,
            };

            // Try Service Worker first (works on mobile + desktop)
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(notifTitle, notifOptions as NotificationOptions)
                  .then(() => console.log('✅ SW Notification sent successfully'))
                  .catch((err) => {
                    console.warn('⚠️ SW Notification failed:', err);
                    // Fallback to direct API (desktop only)
                    try {
                      const n = new Notification(notifTitle, notifOptions);
                      console.log('✅ Direct Notification fallback:', n);
                    } catch (e2) {
                      console.error('❌ All notification methods failed:', e2);
                    }
                  });
              });
            } else {
              // No SW controller yet, try direct API
              try {
                const n = new Notification(notifTitle, notifOptions);
                console.log('✅ Direct Notification (no SW):', n);
                n.onclick = () => { window.focus(); n.close(); };
              } catch (e) {
                console.error('❌ Direct Notification failed:', e);
              }
            }
          } else {
            console.warn('❌ Permission status:', Notification.permission);
          }
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

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

          // Native notification - try direct API first, then SW fallback
          if (Notification.permission === 'granted') {
            try {
              // Direct Notification API (works when page is open)
              const n = new Notification('📋 New Pick List', {
                body: 'بكلست جديدة',
                icon: '/favicon.ico',
                tag: 'picklist-' + Date.now(),
                requireInteraction: true,
              });
              console.log('✅ Direct Notification created:', n);
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch (e) {
              console.warn('⚠️ Direct Notification failed, trying SW:', e);
              // Fallback to Service Worker (for mobile/restricted environments)
              navigator.serviceWorker?.ready.then((reg) => {
                reg.showNotification('📋 New Pick List', {
                  body: 'بكلست جديدة',
                  icon: '/favicon.ico',
                  tag: 'picklist-sw-' + Date.now(),
                  requireInteraction: true,
                  vibrate: [200, 100, 200],
                } as NotificationOptions);
                console.log('✅ SW Notification sent');
              });
            }
          } else {
            console.warn('❌ Permission status:', Notification.permission);
            alert('إذن الإشعارات: ' + Notification.permission + '. يرجى تفعيله من إعدادات المتصفح.');
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

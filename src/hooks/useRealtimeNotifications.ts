import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function useRealtimeNotifications() {
  const permissionGranted = useRef(false);

  useEffect(() => {
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
            // Send a test notification to confirm it works
            new Notification("تم تفعيل الإشعارات ✅", {
              body: "ستصلك إشعارات عند إضافة بيك لست جديدة",
              icon: "/favicon.ico",
            });
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

          // Native browser notification (shows in OS notification panel)
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const notification = new Notification("📋 New Pick List", {
                body: "تمت إضافة بيك لست جديدة",
                icon: "/favicon.ico",
                tag: "picklist-" + Date.now(),
                requireInteraction: true,
              });
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
              console.log("✅ Native notification sent successfully");
            } catch (e) {
              console.error("❌ Native notification failed:", e);
            }
          } else {
            console.warn("⚠️ Cannot send native notification. Permission:", 
              "Notification" in window ? Notification.permission : "not supported");
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

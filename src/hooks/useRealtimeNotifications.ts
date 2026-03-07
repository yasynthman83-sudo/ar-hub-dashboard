import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function useRealtimeNotifications() {
  useEffect(() => {
    // Request browser notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    console.log("🔔 Subscribing to notification1 realtime channel...");

    const channel = supabase
      .channel("notification1-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification1" },
        (payload) => {
          console.log("🔔 New notification received:", payload);

          // Always show in-app toast
          toast("New Pick List 📋", {
            description: "تمت إضافة بيك لست جديدة",
            duration: 10000,
          });

          // Try browser notification too
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("New Pick List", {
                body: "تمت إضافة بيك لست جديدة",
                icon: "/favicon.ico",
              });
            } catch (e) {
              console.log("Browser notification failed (likely iframe):", e);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

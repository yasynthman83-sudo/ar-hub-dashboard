import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useRealtimeNotifications() {
  useEffect(() => {
    // Request browser notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("notification1-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification1" },
        () => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Pick List", {
              body: "تمت إضافة بيك لست جديدة",
              icon: "/favicon.ico",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

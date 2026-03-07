import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function useRealtimeNotifications() {
  useEffect(() => {
    // Request browser notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Test Supabase connection first
    supabase
      .from("notification1")
      .select("*", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) {
          console.error("❌ Cannot access notification1 table:", error.message);
          console.error("💡 You need to add an RLS policy: ALTER TABLE notification1 ENABLE ROW LEVEL SECURITY; CREATE POLICY \"Allow anon select\" ON notification1 FOR SELECT USING (true);");
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
      .subscribe((status, err) => {
        console.log("🔔 Realtime subscription status:", status);
        if (err) {
          console.error("❌ Realtime subscription error:", err);
        }
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to notification1 realtime changes!");
        }
        if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error - check if Realtime is enabled for notification1 table and RLS allows SELECT");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

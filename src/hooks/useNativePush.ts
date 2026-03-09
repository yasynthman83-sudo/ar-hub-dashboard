import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Native push notifications via Firebase FCM (Capacitor).
 * Only activates on native Android/iOS platforms.
 * Falls back to web push (useRealtimeNotifications) on web.
 */
export function useNativePush() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        console.log("🔔 Native push permission:", permResult.receive);

        if (permResult.receive !== "granted") {
          console.warn("⚠️ Native push permission denied");
          return;
        }

        // Register for push
        await PushNotifications.register();
        console.log("✅ Native push registration initiated");

        // On registration success - store FCM token
        PushNotifications.addListener("registration", async (token) => {
          console.log("✅ FCM Token received:", token.value.substring(0, 20) + "...");

          // Store FCM token in database
          const { error } = await cloudSupabase.from("push_subscriptions").upsert(
            {
              endpoint: `fcm:${token.value}`,
              p256dh: "native-fcm",
              auth: "native-fcm",
            },
            { onConflict: "endpoint" }
          );

          if (error) {
            console.error("❌ Failed to store FCM token:", error.message);
          } else {
            console.log("✅ FCM token stored successfully");
          }
        });

        // On registration error
        PushNotifications.addListener("registrationError", (error) => {
          console.error("❌ FCM registration error:", error);
        });

        // On push received (foreground)
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("🔔 Push received (foreground):", notification);
          toast(notification.title || "New Pick List 📋", {
            description: notification.body || "تمت إضافة بيك لست جديدة",
            duration: 10000,
          });
        });

        // On push action (user tapped notification)
        PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("🔔 Push action:", action);
          // Navigate if needed
          const url = action.notification.data?.url;
          if (url) {
            window.location.href = url;
          }
        });
      } catch (err) {
        console.error("❌ Native push setup error:", err);
      }
    };

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
}

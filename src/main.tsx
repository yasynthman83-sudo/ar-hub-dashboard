import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker explicitly for push notification support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      console.log("🔄 Registering Service Worker...");
      
      // Unregister old workers first to ensure clean state
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.scope !== window.location.origin + "/") {
          console.log("🧹 Removing old SW with scope:", reg.scope);
          await reg.unregister();
        }
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      console.log("✅ SW registered successfully, scope:", registration.scope);

      // Force update check on every load
      registration.update().then(() => {
        console.log("🔄 SW update check completed");
      }).catch((err) => {
        console.warn("⚠️ SW update check failed:", err);
      });

      // Listen for new SW waiting
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("🆕 New Service Worker found");
        
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            console.log("🔄 SW state changed to:", newWorker.state);
            if (newWorker.state === "activated") {
              console.log("✅ New SW activated successfully");
              // Reload to use new SW
              if (navigator.serviceWorker.controller) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for controller change (new SW took over)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("🔄 Service Worker controller changed");
      });

    } catch (err) {
      console.error("❌ SW registration failed:", err);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

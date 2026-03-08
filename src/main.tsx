import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker explicitly for push notification support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      console.log("✅ SW registered, scope:", registration.scope);

      // Force update check on every load
      registration.update().catch(() => {});

      // Listen for new SW waiting
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              console.log("✅ New SW activated");
            }
          });
        }
      });
    } catch (err) {
      console.error("❌ SW registration failed:", err);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

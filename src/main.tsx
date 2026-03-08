import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register PWA Service Worker (handled by vite-plugin-pwa)
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);

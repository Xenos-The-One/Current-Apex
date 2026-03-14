import { useState, useEffect } from "react";

/**
 * usePWA — registers the service worker and tracks online/offline state.
 * Call this once at the app root level (main.tsx or App.tsx).
 */
export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect standalone/installed mode
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsStandalone(mq.matches || (navigator as any).standalone === true);
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener("change", handler);

    // Track online/offline
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA] Service worker registered:", reg.scope);
          // Check for updates periodically (every 60 seconds when app is open)
          const interval = setInterval(() => reg.update(), 60_000);
          return () => clearInterval(interval);
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }

    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { isOnline, isStandalone };
}

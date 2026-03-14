import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PWAUpdateBanner — listens for SW_UPDATED messages from the service worker
 * and shows a non-intrusive "Update available" prompt.
 */
export function PWAUpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for update messages from the service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setShowUpdate(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Also detect when a new SW is waiting (e.g., page was already open)
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      if (reg.waiting) {
        setShowUpdate(true);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    // Tell the waiting SW to skip waiting and activate
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    // Reload after a brief delay to let the new SW activate
    setTimeout(() => window.location.reload(), 300);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
        <RefreshCw className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-emerald-300 leading-tight">Update Available</p>
        <p className="text-xs text-muted-foreground mt-0.5">A new version of the app is ready</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleUpdate}
        >
          Update
        </Button>
        <button
          className="text-muted-foreground hover:text-foreground p-1"
          onClick={handleDismiss}
          aria-label="Dismiss update"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * OfflineBanner — shows a non-intrusive banner at the top of the app
 * when the user loses internet connectivity. Auto-hides when back online.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => {
          setShowReconnected(false);
          setWasOffline(false);
        }, 3000);
      }
    };
    const onOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-500/15 text-emerald-400 border-b border-emerald-500/20 transition-all">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        Back online — data syncing…
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-amber-500/15 text-amber-400 border-b border-amber-500/20">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>No internet connection — some features may be unavailable</span>
    </div>
  );
}

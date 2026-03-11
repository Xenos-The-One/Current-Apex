import { useState, useEffect } from "react";
import { X, Download, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ── PWA Install Banner ────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Check if previously dismissed (persist for 7 days)
  useEffect(() => {
    const dismissedAt = localStorage.getItem("pwa_install_dismissed");
    if (dismissedAt) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - Number(dismissedAt) < sevenDays) {
        setDismissed(true);
      }
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", String(Date.now()));
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
        <Download className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-indigo-300 leading-tight">Install CRM App</p>
        <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for instant access & push alerts</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleInstall}>
          Install
        </Button>
        <button className="text-muted-foreground hover:text-foreground p-1" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Push Notification Prompt ──────────────────────────────────────────────────
export function PushNotificationPrompt() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("push_prompt_dismissed");
    if (dismissedAt) {
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - Number(dismissedAt) < threeDays) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push_prompt_dismissed", String(Date.now()));
  };

  // Don't show if: not supported, already subscribed, denied, or dismissed
  if (!isSupported || isSubscribed || permission === "denied" || permission === "granted" || dismissed) return null;

  return (
    <div className="mx-4 mt-2 mb-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-300 leading-tight">Enable Push Notifications</p>
        <p className="text-xs text-muted-foreground mt-0.5">Get instant alerts when new leads arrive</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
          onClick={subscribe}
          disabled={loading}
        >
          {loading ? "..." : "Enable"}
        </Button>
        <button className="text-muted-foreground hover:text-foreground p-1" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── iOS Install Instructions Banner ──────────────────────────────────────────
export function IOSInstallBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissedAt = localStorage.getItem("ios_install_dismissed");
    const alreadyDismissed = dismissedAt
      ? Date.now() - Number(dismissedAt) < 14 * 24 * 60 * 60 * 1000
      : false;

    if (isIOS && !isStandalone && !alreadyDismissed) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("ios_install_dismissed", String(Date.now()));
  };

  if (!show || dismissed) return null;

  return (
    <div className="mx-4 mt-2 mb-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-blue-300 leading-tight">Add to Home Screen</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap <span className="inline-block px-1 py-0.5 bg-muted rounded text-xs">Share ↑</span> then <strong>"Add to Home Screen"</strong> to install the CRM app
            </p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-1 shrink-0" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

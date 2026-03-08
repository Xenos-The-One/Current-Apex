import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [loading, setLoading] = useState(false);

  const subscribeMutation = trpc.notifications.subscribe.useMutation();
  const unsubscribeMutation = trpc.notifications.unsubscribe.useMutation();

  // Check if push is supported
  const isSupported = "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;

  // Register service worker and check current state
  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }

    const init = async () => {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        setRegistration(reg);

        // Check permission state
        const perm = Notification.permission as PushPermissionState;
        setPermission(perm);

        // Check if already subscribed
        const existingSub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!existingSub);
      } catch (err) {
        console.error("[Push] Error initializing:", err);
      }
    };

    init();
  }, [isSupported]);

  // Listen for notification click messages from service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data?.url) {
        window.location.href = event.data.url;
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!registration || !VAPID_PUBLIC_KEY) return false;
    setLoading(true);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);

      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const subJson = subscription.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys!.p256dh!,
        auth: subJson.keys!.auth!,
      });

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("[Push] Error subscribing:", err);
      setLoading(false);
      return false;
    }
  }, [registration, subscribeMutation]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration) return false;
    setLoading(true);

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const subJson = subscription.toJSON();
        await subscription.unsubscribe();
        await unsubscribeMutation.mutateAsync({
          endpoint: subJson.endpoint!,
        });
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("[Push] Error unsubscribing:", err);
      setLoading(false);
      return false;
    }
  }, [registration, unsubscribeMutation]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}

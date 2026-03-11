// Agency CRM Service Worker — PWA + Push Notifications
const CACHE_NAME = "agency-crm-v1";
const OFFLINE_URL = "/offline.html";

// ── Install: cache shell assets ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", OFFLINE_URL]).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API/tRPC requests — always go to network
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML/JS/CSS responses
        if (
          response.ok &&
          (url.pathname === "/" ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css"))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Push: show notification ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Agency CRM", body: "You have a new update.", tag: "crm", data: {} };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  const options = {
    body: data.body,
    tag: data.tag || "crm",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.tag === "new_lead", // keep new lead notifications visible
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click: open/focus the CRM ──────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if (targetUrl !== "/") client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Push subscription change ─────────────────────────────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        // Notify clients to re-register
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED", subscription })
          );
        });
      })
  );
});

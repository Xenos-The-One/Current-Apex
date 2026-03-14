// Agency CRM Service Worker — PWA v3
// Bump this version string to invalidate all caches on deploy
const SW_VERSION = "agency-crm-v3";
const CACHE_STATIC = `${SW_VERSION}-static`;
const CACHE_FONTS = `${SW_VERSION}-fonts`;
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache failed (non-fatal):", err);
      })
    )
  );
  // Activate immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ── Activate: clean old caches, claim clients ────────────────────────────────
self.addEventListener("activate", (event) => {
  const VALID_CACHES = [CACHE_STATIC, CACHE_FONTS];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !VALID_CACHES.includes(k))
            .map((k) => {
              console.log("[SW] Deleting old cache:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all open clients that a new version is active
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) =>
            client.postMessage({ type: "SW_UPDATED", version: SW_VERSION })
          );
        });
      })
  );
});

// ── Fetch: routing strategies ────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET requests entirely
  if (event.request.method !== "GET") return;

  // 2. Skip API / tRPC / OAuth — always network, never cache
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/api/trpc") ||
    url.pathname.startsWith("/api/oauth")
  ) {
    return;
  }

  // 3. Google Fonts — cache-first with long TTL
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(event.request, CACHE_FONTS));
    return;
  }

  // 4. CDN assets (icons, images from CloudFront) — cache-first
  if (url.hostname.includes("cloudfront.net") || url.hostname.includes("cdn.")) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // 5. JS / CSS / woff2 / images from same origin — stale-while-revalidate
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg")
  ) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_STATIC));
    return;
  }

  // 6. HTML navigation requests — network-first, offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
    return;
  }

  // 7. Everything else — network-first, no fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Strategy: cache-first ────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Network error", { status: 503 });
  }
}

// ── Strategy: stale-while-revalidate ────────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ── Strategy: network-first with offline fallback ────────────────────────────
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(CACHE_STATIC);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return offline page for navigation requests
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ||
      new Response(
        `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><h1>You're Offline</h1><p>Check your connection and try again.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    );
  }
}

// ── Message: handle skip-waiting from update prompt ──────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Push: show notification ──────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "Agency CRM",
    body: "You have a new update.",
    tag: "crm",
    data: {},
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  const options = {
    body: data.body,
    tag: data.tag || "crm",
    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373808943/Rus3EtBPxB9CmZuwDUFVXj/icon-192_d8fa7565.png",
    badge: "https://d2xsxph8kpxj0f.cloudfront.net/310519663373808943/Rus3EtBPxB9CmZuwDUFVXj/icon-72_0ddd7e47.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.tag === "new_lead",
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
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if (targetUrl !== "/") client.navigate(targetUrl);
            return;
          }
        }
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
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) =>
            client.postMessage({
              type: "PUSH_SUBSCRIPTION_CHANGED",
              subscription,
            })
          );
        });
      })
  );
});

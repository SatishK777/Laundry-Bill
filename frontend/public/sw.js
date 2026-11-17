const CACHE_NAME = "laundry-bill-cache-v2";
const ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install SW and pre-cache static assets
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate SW and remove old caches (like v1)
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handling: Network-First for HTML/Navigation, Cache-First for static assets
self.addEventListener("fetch", (e) => {
  // Only handle GET requests and valid http/https schemes (ignore chrome-extension:// etc.)
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith("http://") && !e.request.url.startsWith("https://")) return;
  if (e.request.url.includes("/api/")) return;

  // 1. Navigation / HTML requests: Network-First to always get latest script bundle hashes
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 2. Static Assets: Cache-First with Network fallback
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Do not cache non-200s or HTML fallbacks returned for missing JS
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== "basic" ||
          (e.request.url.includes("/assets/") && networkResponse.headers.get("content-type")?.includes("text/html"))
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

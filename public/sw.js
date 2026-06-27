/*
 * TrustOps service worker — minimal, multi-tenant-safe.
 *
 * - Caches ONLY static build assets (/_next/static/*) for fast offline loads.
 * - Navigations are network-first; if offline, fall back to a generic /offline
 *   page. Authenticated HTML is NEVER cached, so a cached page can't leak to a
 *   different user on a shared device after logout.
 */
const CACHE = "trustops-static-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navigations: network-first, generic offline fallback (no tenant HTML cached).
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static build assets: cache-first.
  if (req.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

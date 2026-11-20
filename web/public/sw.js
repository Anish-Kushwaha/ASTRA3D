const CACHE_NAME = "astra3d-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/astra3d-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("astra3d-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const network = fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put("/", copy)));
      }
      return response;
    });
    event.respondWith(network.catch(() => caches.match("/")));
    return;
  }

  const url = new URL(request.url);
  const isAppAsset = url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|svg|woff2?)$/i.test(url.pathname);
  if (!isAppAsset) return;

  const refresh = fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      return caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).then(() => response);
    }
    return response;
  });
  event.waitUntil(refresh.catch(() => undefined));
  event.respondWith(caches.match(request).then(cached => cached || refresh).catch(() => refresh));
});

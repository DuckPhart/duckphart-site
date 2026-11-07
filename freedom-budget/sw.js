const VERSION = "freedom-budget-v2";

function scopeUrl(path) {
  return new URL(path, self.location).href;
}

const SHELL = [
  scopeUrl("./"),
  scopeUrl("./index.html"),
  scopeUrl("./manifest.webmanifest"),
  scopeUrl("./icons/icon-192.png"),
  scopeUrl("./icons/icon-512.png"),
  scopeUrl("./icons/apple-touch-icon.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const scopePath = new URL("./", self.location).pathname;
  if (url.origin !== self.location.origin || !url.pathname.startsWith(scopePath)) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const home = (await cache.match(scopeUrl("./"))) || (await cache.match(scopeUrl("./index.html")));
      if (home) return home;
    }
    throw new Error("offline");
  }
}

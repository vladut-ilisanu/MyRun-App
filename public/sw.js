// MyRun service worker. Network-first so the installed PWA always picks up the
// latest deploy when online, falling back to cache only when offline. Assets are
// hash-named, so caching them is safe. Cross-origin (Supabase) calls pass through.
const CACHE = 'myrun-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html']).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept POSTs (Supabase ingestion)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only handle same-origin app shell

  // Network-first for everything same-origin: always get the latest when online,
  // cache the response, and fall back to cache (then the shell) when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});

/**
 * ═══════════════════════════════════════════════════════════════
 *  Game Template — Service Worker
 *
 *  Cache-first strategy for offline support.
 *  Update CACHE version when deploying new builds.
 * ═══════════════════════════════════════════════════════════════
 */
const CACHE = 'game-slug-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './game.css',
  './game.js',
  // Add all static assets here:
  // './images/sprite.png',
  // './sounds/bgm.mp3',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, network fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

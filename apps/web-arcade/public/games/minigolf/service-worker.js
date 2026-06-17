/**
 * service-worker.js — Fuzzy Putt (Minigolf)
 * Cache-first SW for offline replay after first load.
 * Note: golf.wasm and golf.js are large — cached opportunistically on first fetch.
 */
/* eslint-env serviceworker */

const CACHE = 'fuzzy-putt-v1.1.0';
const ASSETS = [
    './',
    './index.html',
    './golf.js',
    './golf.worker.js',
    './golf.wasm',
    './coi-serviceworker.min.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    event.respondWith(
        caches.match(req).then(
            (hit) =>
                hit ||
                fetch(req)
                    .then((res) => {
                        if (res && res.status === 200) {
                            const copy = res.clone();
                            caches.open(CACHE).then((c) => c.put(req, copy));
                        }
                        return res;
                    })
                    .catch(() => caches.match('./index.html'))
        )
    );
});

/**
 * service-worker.js — Nut Racer
 * Cache-first SW for offline replay after first load.
 */
/* eslint-env serviceworker */

const CACHE = 'nut-racer-v1.1.0';
const ASSETS = [
    './',
    './index.html',
    './nut-racer.css',
    './common.js',
    './common.css',
    './nut-racer.js',
    './stats.js',
    './images/sprites.png',
    './images/background.png',
    './images/player_straight.png',
    './images/player_left.png',
    './images/player_right.png',
    './images/player_uphill_left.png',
    './images/player_uphill_right.png',
    './images/player_uphill_straight.png',
    './images/car01.png',
    './images/car02.png',
    './images/car03.png',
    './images/car04.png',
    './images/semi.png',
    './images/truck.png',
    './images/tree1.png',
    './images/tree2.png',
    './images/dead_tree1.png',
    './images/dead_tree2.png',
    './images/bush1.png',
    './images/bush2.png',
    './images/boulder1.png',
    './images/boulder2.png',
    './images/boulder3.png',
    './images/cactus.png',
    './images/column.png',
    './images/palm_tree.png',
    './images/stump.png',
    './images/billboardr1.png',
    './images/billboardr2.png',
    './images/billboardr3.png',
    './images/billboardr4.png',
    './images/billboardr5.png',
    './images/billboardr6.png',
    './images/billboardr7.png',
    './images/billboardr8.png',
    './images/billboardr9.png',
    './images/billboardl3.png',
    './images/billboardl4.png',
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

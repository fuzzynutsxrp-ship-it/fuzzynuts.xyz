/**
 * service-worker.js — Super Fuzzynuts (Mario)
 * Cache-first SW for offline replay after first load.
 */
/* eslint-env serviceworker */

const CACHE = 'super-fuzzynuts-v1.0.0';
const ASSETS = [
    './',
    './index.html',
    './index.css',
    './index.js',
    './FullScreenMario.bundle.js',
    './settings/generator.js',
    './settings/editor.js',
    './settings/collisions.js',
    './settings/objects.js',
    './settings/sprites.js',
    './settings/audio.js',
    './settings/events.js',
    './settings/groups.js',
    './settings/statistics.js',
    './settings/input.js',
    './settings/scenes.js',
    './settings/maps.js',
    './settings/touch.js',
    './settings/quadrants.js',
    './settings/math.js',
    './settings/mods.js',
    './settings/renderer.js',
    './settings/devices.js',
    './settings/ui.js',
    './settings/runner.js',
    './Fonts/pressstart2p-webfont.woff',
    './Theme/Mario.gif',
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

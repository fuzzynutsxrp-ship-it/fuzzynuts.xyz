/**
 * service-worker.js — DEPRECATED / SELF-UNREGISTERING STUB
 *
 * The previous SW used cache-first interception with a hardcoded cache
 * version (`fuzzy-survivors-vX.X.X`) that never bumped on deploys.
 * Result: shipped JS updates were masked by stale cache, forcing users
 * to hard-refresh. Since the game runs in an iframe inside the React
 * shell, PWA offline capability adds no real value here.
 *
 * This stub kept at the same URL so any browser that previously cached
 * the registration finds *something* on update-check. It immediately
 * unregisters itself and clears its own caches. Safe to delete this
 * file once existing users have had a chance to load the page once.
 */
/* eslint-env serviceworker */
/* global self, caches */

self.addEventListener('install', function (event) {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        Promise.all([
            self.registration.unregister(),
            caches.keys().then(function (keys) {
                return Promise.all(
                    keys
                        .filter(function (k) { return k.indexOf('fuzzy-survivors') === 0; })
                        .map(function (k) { return caches.delete(k); })
                );
            }),
            self.clients.claim(),
        ])
    );
});
// No 'fetch' handler — requests pass through to the network as normal.

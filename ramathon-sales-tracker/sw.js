/**
 * @file sw.js (Ramathon sales tracker offline cache)
 * @version 1.1
 * @author Sam Cao
 * @created 2026-10-16
 * @lastUpdated 2026-10-16
 * @description Service worker that lets the hosted tracker reopen with no wifi: network first, cached copy as fallback.
 * @aiUpdate Update @lastUpdated and @version. Keep the filename sw.js (index.html registers it by name). Bump CACHE when the cached file list changes. Append changelog at bottom.
 */

const CACHE = 'ramathon-tracker-v1';
const TIMEOUT_MS = 4000; // slow carnival wifi falls back to the cached page after this

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('ramathon-tracker-') && k !== CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(req));
});

// Always try for the newest version; use the cached copy when offline or slow.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    let hit = await cache.match(req, { ignoreSearch: true });
    // Only page loads fall back to the tracker; a missing photo must stay missing.
    if (!hit && req.mode === 'navigate') hit = await cache.match('./index.html');
    if (hit) return hit;
    throw err;
  }
}

/** CHANGELOG
 * v1.0 (2026-10-16): Initial release. Network-first with 4 s timeout, cached fallback for the tracker page.
 * v1.1 (2026-10-16): Fall back to the tracker page only for page loads, so missing photos stay missing.
 */

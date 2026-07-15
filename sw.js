// GameHub service worker — caches the whole app so it works offline.
// Assets use stale-while-revalidate, so content auto-updates on the next
// visit without needing a manual CACHE bump. (Bumping it still forces an
// immediate full refresh if you ever want one.)
const CACHE = 'gamehub-v3';

// Paths are relative to the service worker's location (the site root),
// so this works both at a domain root and under /gamehub/ on GitHub Pages.
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/sfx.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './games/memory/', './games/memory/index.html',
  './games/tictactoe/', './games/tictactoe/index.html',
  './games/snake/', './games/snake/index.html',
  './games/simon/', './games/simon/index.html',
  './games/math/', './games/math/index.html',
  './games/2048/', './games/2048/index.html',
  './games/whack/', './games/whack/index.html',
  './games/space/', './games/space/index.html',
  './games/hoops/', './games/hoops/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // ignore individual failures so one missing file can't break install
      .then((cache) => Promise.allSettled(ASSETS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (res && res.ok && res.type === 'basic') {
    caches.open(CACHE).then((c) => c.put(req, res));
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin

  if (req.mode === 'navigate') {
    // Network-first for pages: fresh when online, cached when offline.
    event.respondWith(
      fetch(req)
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html') || caches.match('./')))
    );
    return;
  }

  // Stale-while-revalidate for static assets (css/js/icons/manifest):
  // serve the cached copy instantly, and refresh the cache in the background
  // so the next visit gets the new version automatically.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});

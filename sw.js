const CACHE = 'preflight-v2';

// All assets are same-origin and vendored into the repo, so the app installs
// completely onto the device and runs with no network connection at all.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './vendor/babel.min.js',
];

function isAppDocument(request) {
  if (request.mode === 'navigate') return true;
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin &&
      (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  } catch {
    return false;
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // Cache each asset independently so one failure can't abort the whole
      // precache — every file that succeeds stays available offline.
      Promise.allSettled(ASSETS.map(a => cache.add(a)))
    ).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (isAppDocument(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Build-Version: v.1.0.2
/**
 * ============================================================================
 * WALIPINTAR PWA SERVICE WORKER (service-worker.js)
 * ============================================================================
 */

const LOCKED_VERSION = 'v.1.0.2';
const CACHE_NAME = 'walipintar-' + LOCKED_VERSION;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
];

async function cacheAllAssetsSafely(cacheName, assetList) {
  const cache = await caches.open(cacheName);
  const requests = assetList.map((url) => new Request(url, { cache: 'no-store' }));
  const responses = await Promise.all(
    requests.map(async (req) => {
      const res = await fetch(req);
      if (!res || !res.ok) {
        throw new Error('Gagal mengunduh aset PWA: ' + req.url);
      }
      return { req, res };
    })
  );
  await Promise.all(responses.map(({ req, res }) => cache.put(req, res)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheAllAssetsSafely(CACHE_NAME, CORE_ASSETS).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (
    url.pathname === '/service-worker.js' ||
    url.pathname === '/sw.js' ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  if (
    event.request.mode === 'navigate' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      fetch(new Request(event.request.url, { cache: 'no-store' }))
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && url.origin === self.location.origin) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
  }
});

// Build-Version: v.1.0.3 (24/11/2026 21.01.27 WIB)
/**
 * ============================================================================
 * WALIPINTAR PWA SERVICE WORKER (/service-worker.js)
 * ============================================================================
 * - CACHE_NAME selalu mengikuti LOCKED_VERSION ("walipintar-v.1.0.X")
 * - Cache lama otomatis dihapus saat activate (hanya setelah cache baru berhasil)
 * - skipWaiting() + clients.claim() memastikan app langsung terganti ke versi baru
 * - localStorage tidak disentuh sehingga user tidak perlu uninstall / login ulang
 * ============================================================================
 */

const LOCKED_VERSION = 'v.1.0.3';
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
        throw new Error('Gagal mengunduh aset PWA: ' + req.url + ' (HTTP ' + (res ? res.status : 'ERR') + ')');
      }
      return { req, res };
    })
  );
  await Promise.all(responses.map(({ req, res }) => cache.put(req, res)));
}

// 1. INSTALL: Unduh aset ke cache baru terlebih dahulu dengan cache: 'no-store'
//    JANGAN hapus cache lama di sini supaya app tidak blank jika internet putus.
self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheAllAssetsSafely(CACHE_NAME, CORE_ASSETS).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Hapus SEMUA cache lama setelah SW baru aktif, lalu ambil alih kontrol klien
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

// 3. MESSAGE: Trigger aktifkan SW baru secara langsung dari aplikasi
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. FETCH:
//    - Lewati /service-worker.js, script.google.com, dan /api/* agar selalu live
//    - Network-first (no-store) untuk navigasi HTML & manifest.json agar update langsung terdeteksi
//    - Cache-first dengan fallback network untuk aset statis same-origin
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

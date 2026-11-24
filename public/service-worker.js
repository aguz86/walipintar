/**
 * ============================================================================
 * WALIPINTAR PWA SERVICE WORKER (service-worker.js)
 * ============================================================================
 * - CACHE_NAME mengikuti versi terkunci dari Sheet / manifest.json:
 *   "walipintar-[versi-terkunci]"
 * - Cache lama TIDAK dihapus sebelum cache baru selesai ter-download,
 *   sehingga jika internet terputus di tengah update, aplikasi tidak blank.
 * - Tidak menyentuh localStorage sehingga user tidak perlu uninstall / login ulang.
 * ============================================================================
 */

const LOCKED_VERSION = 'v.1.0.1';
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
  const requests = assetList.map((url) => new Request(url, { cache: 'reload' }));
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

// 1. INSTALL: Unduh penuh ke cache baru terlebih dahulu.
//    JANGAN hapus cache lama di sini. Jika download gagal/putus internet, install batal
//    dan versi lama tetap aman melayani aplikasi.
self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheAllAssetsSafely(CACHE_NAME, CORE_ASSETS).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Baru hapus cache lama SETELAH cache baru 100% berhasil ter-download & aktif.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith('walipintar-') && name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. MESSAGE: Izinkan aplikasi memicu cek versi / aktivasi bersih
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. FETCH: Network-first untuk HTML/manifest agar update langsung terdeteksi,
//    Cache-first + update latar untuk aset statis, dan selalu lewati script.google.com / API.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Untuk navigasi halaman & manifest.json: utamakan network dengan fallback cache offline
  if (event.request.mode === 'navigate' || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(event.request)
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

  // Untuk aset lain (JS, CSS, gambar, suara): Cache-first dengan fallback network & penyimpanan ke cache aktif
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

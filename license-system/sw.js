/**
 * ============================================================================
 * WALIPINTAR PWA SERVICE WORKER (sw.js)
 * ============================================================================
 * Cache-First Strategy untuk Offline Play tanpa Kuota Internet.
 * Hanya dipasang dan diaktifkan setelah pembeli berhasil login lisensi.
 * ============================================================================
 */

const CACHE_NAME = 'walipintar-cache-v1';

// Daftar asset inti yang dicache untuk mode offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Satpam.js',
  '/assets/aistudio/Wali_Pintar_Family_Education_Badge_aebad423.png',
  '/main/edu.html',
  '/main/coloring.html',
  '/smart/alphabet.html'
];

// 1. Install Event: Mengunduh dan menyimpan semua asset ke Cache Storage
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[ServiceWorker] Menyimpan asset ke Cache Storage...');
      // Lakukan caching resilient (tidak putus jika salah satu sub-asset opsional gagal)
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[ServiceWorker] Opsional asset dilewati:', asset, err);
        }
      }
    })
  );
});

// 2. Activate Event: Menghapus cache versi lama saat ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Menghapus cache lama:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Cache-First dengan Network Fallback
self.addEventListener('fetch', (event) => {
  // Hanya intercept request GET (abaikan POST / tracking)
  if (event.request.method !== 'GET') return;

  // Abaikan request API ke Google Script agar verifikasi online tetap real-time
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Aset ditemukan di cache offline!
        return cachedResponse;
      }

      // Jika belum di cache, ambil dari network dan simpan ke cache untuk pemakaian berikutnya
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback jika offline penuh dan halaman navigasi diminta
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

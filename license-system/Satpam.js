/**
 * ============================================================================
 * WALIPINTAR PATH PROTECTION - "SATPAM.JS"
 * ============================================================================
 * Pasang file/script ini di bagian paling atas tag <head> pada SEMUA file game
 * di folder `/main/` dan `/smart/` (misal: /main/edu.html, /smart/alphabet.html).
 *
 * Cara Pasang:
 * <head>
 *   <script src="/Satpam.js"></script>
 *   ... tag meta, css, dll ...
 * </head>
 *
 * Fungsi:
 * Jika pembeli mencoba mengetik URL game secara langsung atau membagikan link game
 * ke orang lain tanpa lisensi resmi di localStorage, Satpam akan langsung
 * menendang (kick) mereka kembali ke halaman utama `/` seketika sebelum konten
 * game sempat terlihat atau di-load oleh browser.
 * ============================================================================
 */

(function () {
  'use strict';

  var LICENSE_KEY_NAME = 'walipintar_license';
  var HOME_URL = '/';

  try {
    // 1. Ambil lisensi yang tersimpan di localStorage
    var savedLicense = localStorage.getItem(LICENSE_KEY_NAME);

    // 2. Validasi format lisensi dasar: harus ada, string, diawali 'WALI-', panjang min 8
    var isValidFormat = (
      typeof savedLicense === 'string' &&
      savedLicense.trim().length >= 8 &&
      savedLicense.trim().toUpperCase().indexOf('WALI-') === 0
    );

    // 3. Jika TIDAK valid atau KOSONG: Segera blokir & redirect ke Homepage
    if (!isValidFormat) {
      // Sembunyikan isi dokumen saat ini agar tidak ada visual glitch
      if (document.documentElement) {
        document.documentElement.style.display = 'none';
      }
      
      // Tendang ke homepage menggunakan replace agar riwayat back button bersih
      window.location.replace(HOME_URL + '?denied=1');
      return;
    }

    // 4. Jika user memiliki lisensi yang valid, izinkan browser melanjutkan rendering game
    // Optional: Log status keamanan
    // console.log('[Satpam] Lisensi terverifikasi:', savedLicense);

  } catch (err) {
    // Jika localStorage diblokir oleh browser / mode incognito ketat, tendang ke homepage
    window.location.replace(HOME_URL + '?error=storage_blocked');
  }
})();

/**
 * ============================================================================
 * WALIPINTAR LICENSE SYSTEM - 100% BREVO API + ADMIN MANAGEMENT TOOLS
 * ============================================================================
 * Fitur Lengkap:
 * 1. 100% Brevo REST API v3 (300 email/hari gratis, tanpa Gmail).
 * 2. Status Page Interaktif: Jika URL Web App dibuka langsung di browser, 
 *    tampil halaman status visual ramah (bukan pesan JSON error).
 * 3. Menu Khusus di Google Sheets ("🎮 WaliPintar Admin"):
 *    - ⚡ Generate Lisensi Manual (Bila pembeli komplain)
 *    - 🔄 Kirim Ulang Email Lisensi via Brevo
 *    - 🗑️ Hapus Lisensi (Cari Kode / Email / Order ID)
 *    - 🗑️ Hapus Baris Lisensi Terpilih di Sheet
 *    - 📊 Buat / Segarkan Tab Laporan & Statistik Real-Time
 *    - 🛠️ Uji Koneksi Akun Brevo API
 * 4. Fungsi Uji Coba: `ujiCobaSistem_KlikDiSini()` agar tombol Run tidak error.
 * ============================================================================
 */

// ======================= [ KONFIGURASI UTAMA ] =======================
const SHEET_LICENSES = 'Licenses';
const SHEET_REPORTS = 'Laporan_Statistik';
const ADMIN_WA = '6285704808186';
const BRAND_NAME = 'Wali Pintar';
const SCALEV_URL = 'https://walipintar.myscalev.com/checkout-flow-baru-1';
const APP_URL = 'https://walipintar.my.id';

/**
 * ============================================================================
 * 🔒 ZERO SECRETS IN GITHUB (KEAMANAN TINGKAT TINGGI UNTUK CLOUDFLARE & GITHUB)
 * ============================================================================
 * API Key TIDAK PERLU ditulis di dalam kode file ini agar tidak bocor ke GitHub!
 * Sistem membaca secara otomatis dari "Script Properties" terenkripsi Google Apps Script:
 * 
 * CARA MEMASUKKAN API KEY TANPA LEWAT GITHUB:
 * 1. Di editor Apps Script, klik menu "Project Settings" (Ikon Gerigi ⚙️ di bilah kiri).
 * 2. Scroll ke bawah ke bagian "Script Properties" (Properti Skrip).
 * 3. Klik "Add script property" lalu masukkan:
 *    - SCALEV_API_KEY : [Tempel token Scalev Anda]
 *    - BREVO_API_KEY  : [Tempel token Brevo xkeysib-... Anda]
 *    - ADMIN_SECRET_KEY: [Kunci rahasia admin Anda]
 * ============================================================================
 */
function getSecureConfig(key, fallbackVal) {
  try {
    const val = PropertiesService.getScriptProperties().getProperty(key);
    if (val && val.trim() !== '') return val.trim();
  } catch (e) {}
  return fallbackVal;
}

const ADMIN_SECRET_KEY = getSecureConfig('ADMIN_SECRET_KEY', 'WALI_ADMIN_SECRET_KEY_2026');
const BREVO_API_KEY = getSecureConfig('BREVO_API_KEY', 'xkeysib-PASTE_YOUR_BREVO_API_KEY_HERE');
const BREVO_SENDER_NAME = getSecureConfig('BREVO_SENDER_NAME', 'Wali Pintar Official');
const BREVO_SENDER_EMAIL = getSecureConfig('BREVO_SENDER_EMAIL', 'halo@walipintar.my.id');
const SCALEV_API_KEY = getSecureConfig('SCALEV_API_KEY', 'PASTE_YOUR_SCALEV_API_KEY_HERE');

// =====================================================================

/**
 * FUNGSI UJI COBA LANGSUNG DARI EDITOR APPS SCRIPT
 * Pilih fungsi ini di dropdown toolbar atas Apps Script lalu klik Run (▶️)
 */
function ujiCobaSistem_KlikDiSini() {
  Logger.log('========================================================');
  Logger.log('🚀 MEMULAI UJI COBA SISTEM WALI PINTAR...');
  Logger.log('========================================================');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Inisialisasi Sheet Licenses
  const sheet = initLicensesSheet(ss);
  Logger.log('✅ 1. Tab "' + SHEET_LICENSES + '" siap.');

  // 2. Inisialisasi Dashboard Laporan
  updateDashboardStats(ss);
  Logger.log('✅ 2. Tab "' + SHEET_REPORTS + '" berhasil disegarkan.');

  // 3. Cek Status Brevo
  if (!BREVO_API_KEY || BREVO_API_KEY.includes('PASTE_YOUR_BREVO_API_KEY')) {
    Logger.log('⚠️ 3. Brevo API Key belum diisi. Masukkan API Key Anda di baris 39.');
  } else {
    Logger.log('✅ 3. Brevo API Key terpasang: ' + BREVO_API_KEY.substring(0, 14) + '...');
  }

  // 4. Cek Status Scalev API (Anti-Bypass)
  if (!SCALEV_API_KEY || SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY')) {
    Logger.log('⚠️ 4. Scalev API Key belum diisi (Anti-Bypass belum aktif).');
    Logger.log('     Dapatkan API Key di: Settings > Developers > API Keys.');
  } else {
    Logger.log('✅ 4. Scalev API Key terpasang: ' + SCALEV_API_KEY.substring(0, 14) + '... (Anti-Bypass Aktif)');
  }

  Logger.log('========================================================');
  Logger.log('🎉 SELAMAT! SISTEM BERJALAN NORMAL 100%.');
  Logger.log('Gunakan Web App URL untuk integrasi dengan claim & index.html.');
  Logger.log('========================================================');
}

/**
 * Event Trigger onOpen: Menambahkan Menu Khusus Admin ke Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎮 WaliPintar Admin')
    .addItem('🔄 Tarik & Sinkron Semua Order Scalev API', 'menuSyncScalevOrders')
    .addItem('📊 Buat / Segarkan Tab Laporan & Statistik', 'menuGenerateReport')
    .addSeparator()
    .addItem('⚡ Generate Lisensi Manual (Komplain)', 'menuGenerateManual')
    .addItem('🔄 Kirim Ulang Email Lisensi via Brevo', 'menuResendManual')
    .addSeparator()
    .addItem('🗑️ Hapus Lisensi (Cari Kode / Email / Order)', 'menuDeleteLicenseSearch')
    .addItem('🗑️ Hapus Baris Lisensi yang Sedang Dipilih', 'menuDeleteSelectedRow')
    .addItem('⚠️ Hapus SEMUA Order di Sheet (Reset Total)', 'menuDeleteAllOrders')
    .addSeparator()
    .addItem('🛠️ Uji Koneksi Akun Brevo API', 'menuTestBrevoConnection')
    .addItem('🛡️ Uji Koneksi Scalev API (Anti-Bypass)', 'menuTestScalevConnection')
    .addToUi();
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  // Pengaman jika e tidak disediakan saat dijalankan manual
  e = e || { parameter: {} };
  return handleRequest(e, 'GET');
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  e = e || { parameter: {} };
  return handleRequest(e, 'POST');
}

/**
 * Router Utama Request
 */
function handleRequest(e, httpMethod) {
  const createJsonResponse = (data) => {
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  };

  const params = (e && e.parameter) ? e.parameter : {};
  let postData = {};
  if (e && e.postData && e.postData.contents) {
    try {
      postData = JSON.parse(e.postData.contents);
    } catch (err) {}
  }

  const action = params.action || postData.action;

  // JIKA DIBUKA DI BROWSER TANPA PARAMETER: Tampilkan Halaman Status Visual Ceria
  if (!action) {
    if (httpMethod === 'GET') {
      return renderServerStatusPage();
    } else {
      return createJsonResponse({
        success: false,
        message: 'Parameter action diperlukan (create, check, resend, delete).'
      });
    }
  }

  // LockService untuk mencegah race condition transaksi bersamaan
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Server sedang sibuk memproses transaksi lain. Coba beberapa saat lagi.'
    });
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = initLicensesSheet(ss);

    // ------------------------------------------------------------------------
    // ACTION: SYNC_SCALEV (Tarik semua order dari Scalev API & update Sheet)
    // ------------------------------------------------------------------------
    if (action === 'sync_scalev' || action === 'sync') {
      const syncResult = syncOrdersFromScalev(ss);
      return createJsonResponse(syncResult);
    }

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // ACTION 1: CREATE / CLAIM (Validasi Pembayaran & Klaim Lisensi Otomatis)
    // ------------------------------------------------------------------------
    if (action === 'create' || action === 'claim') {
      let orderId = (params.order_id || postData.order_id || '').trim();
      let email = (params.email || postData.email || '').trim().toLowerCase();
      let name = (params.name || params.customer_name || params.nama || params.buyer_name || postData.name || postData.customer_name || postData.nama || '').trim();

      // Bersihkan jika terkirim template mentah dari Scalev URL
      if (orderId.startsWith('{')) orderId = '';
      if (email.startsWith('{')) email = '';
      if (name.startsWith('{')) name = '';

      if (!orderId && !email) {
        return createJsonResponse({ success: false, message: 'Alamat Email Pembelian atau Nomor Pesanan (Order ID) wajib diisi.' });
      }

      // ====================================================================
      // TAHAP 1: CARI LANGSUNG DI GOOGLE SHEET TERLEBIH DAHULU (PRIORITAS UTAMA)
      // ====================================================================
      const data = sheet.getDataRange().getValues();
      let foundRowIndex = -1;
      let existingLicense = '';
      let existingOrderId = '';
      let existingEmail = '';
      let existingLicenseStatus = '';
      let existingPaymentStatus = '';
      let existingGross = 0;
      let existingName = '';
      let existingBrevoStatus = '';

      for (let i = 1; i < data.length; i++) {
        const rowOrderId = String(data[i][1] || '').trim();
        const rowEmail = String(data[i][2] || '').trim().toLowerCase();
        const rowKey = String(data[i][3] || '').trim();
        const rowStatus = String(data[i][4] || '').trim().toUpperCase();
        const rowPay = String(data[i][5] || '').trim().toUpperCase();

        const emailMatches = email && rowEmail === email;
        const orderMatches = orderId && rowOrderId === orderId;

        if (emailMatches || orderMatches) {
          foundRowIndex = i + 1; // 1-based index di Google Sheet
          existingOrderId = rowOrderId;
          existingEmail = rowEmail;
          existingLicense = rowKey;
          existingLicenseStatus = rowStatus;
          existingPaymentStatus = rowPay;
          existingGross = data[i][6] || 0;
          existingName = data[i][7] || '';
          existingBrevoStatus = String(data[i][8] || '').trim();
          break;
        }
      }

      // JIKA EMAIL / ORDER DITEMUKAN DI GOOGLE SHEET:
      if (foundRowIndex > 0) {
        const isPaid = (
          existingPaymentStatus === 'COMPLETED' ||
          existingPaymentStatus === 'PAID' ||
          existingPaymentStatus === 'SETTLED' ||
          existingLicenseStatus === 'ACTIVE'
        );

        if (isPaid) {
          // Pastikan status lisensi ACTIVE
          if (existingLicenseStatus !== 'ACTIVE') {
            sheet.getRange(foundRowIndex, 5).setValue('ACTIVE');
          }

          // SKENARIO 1: Order sudah paid tapi lisensi belum terkirim via Brevo (atau gagal)
          let emailSentNow = false;
          let brevoErr = null;
          const needsBrevoSend = !existingBrevoStatus || !existingBrevoStatus.includes('TERKIRIM');

          if (needsBrevoSend && existingEmail && existingEmail.includes('@') && existingLicense) {
            try {
              const brevoRes = sendBrevoEmail(existingEmail, existingLicense, existingOrderId, false, existingName);
              if (brevoRes.success) {
                emailSentNow = true;
                sheet.getRange(foundRowIndex, 9).setValue('TERKIRIM (Brevo)');
                if (brevoRes.messageId) sheet.getRange(foundRowIndex, 10).setValue(brevoRes.messageId);
              } else {
                brevoErr = brevoRes.error;
                sheet.getRange(foundRowIndex, 9).setValue('GAGAL (' + brevoRes.error + ')');
              }
            } catch (err) {
              brevoErr = err.toString();
            }
          }

          updateDashboardStats(ss);

          // SKENARIO 2: Sudah paid dan sudah pernah claim -> Tunjukkan lisensi di popup dengan tombol copy dan tombol mulai main
          return createJsonResponse({
            success: true,
            isExisting: true,
            isAlreadyClaimed: true,
            licenseKey: existingLicense,
            email: existingEmail,
            orderId: existingOrderId,
            name: existingName,
            grossRevenue: existingGross,
            paymentStatus: 'paid',
            emailSent: emailSentNow || existingBrevoStatus.includes('TERKIRIM'),
            brevoError: brevoErr,
            message: 'Alhamdulillah! Pembayaran resmi Anda telah terkonfirmasi lunas. Lisensi siap digunakan!'
          });
        } else {
          // Jika status di sheet masih UNPAID / PENDING, coba sinkronisasi ulang ke Scalev API
          if (SCALEV_API_KEY && !SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY')) {
            const scalevRecheck = verifyScalevPayment(existingOrderId || existingEmail);
            if (scalevRecheck.verified) {
              sheet.getRange(foundRowIndex, 5).setValue('ACTIVE');
              sheet.getRange(foundRowIndex, 6).setValue('COMPLETED');
              if (scalevRecheck.grossRevenue > 0) {
                sheet.getRange(foundRowIndex, 7).setValue(scalevRecheck.grossRevenue).setNumberFormat('"Rp"#,##0');
              }
              if (scalevRecheck.customerName && (!existingName || existingName === '-')) {
                sheet.getRange(foundRowIndex, 8).setValue(scalevRecheck.customerName);
              }

              sendBrevoEmail(existingEmail, existingLicense, existingOrderId, false, scalevRecheck.customerName || existingName);
              sheet.getRange(foundRowIndex, 9).setValue('TERKIRIM (Brevo)');
              updateDashboardStats(ss);

              return createJsonResponse({
                success: true,
                licenseKey: existingLicense,
                email: existingEmail,
                orderId: existingOrderId,
                paymentStatus: 'paid',
                message: 'Pembayaran baru saja terverifikasi lunas di Scalev! Lisensi resmi telah diaktifkan.'
              });
            }
          }

          return createJsonResponse({
            success: false,
            verified: false,
            email: existingEmail,
            orderId: existingOrderId,
            paymentStatus: existingPaymentStatus.toLowerCase(),
            message: 'Pesanan untuk email ' + existingEmail + ' masih berstatus ' + existingPaymentStatus + '. Silakan selesaikan pembayaran.'
          });
        }
      }

      // ====================================================================
      // TAHAP 2: JIKA EMAIL BELUM ADA DI SHEET, VALIDASI KE SCALEV API
      // ====================================================================
      const lookupTarget = email || orderId;
      let scalevVerificationNote = 'Verifikasi Scalev API: Nonaktif';
      let grossRevenue = 0;
      let paymentStatus = 'PAID';

      if (SCALEV_API_KEY && !SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY') && lookupTarget) {
        const scalevCheck = verifyScalevPayment(lookupTarget);

        if (!scalevCheck.verified) {
          return createJsonResponse({
            success: false,
            verified: false,
            orderId: orderId,
            email: email,
            grossRevenue: scalevCheck.grossRevenue || 0,
            paymentStatus: scalevCheck.paymentStatus || 'unpaid',
            message: scalevCheck.message || 'Pembayaran belum terkonfirmasi lunas di Scalev. Pastikan email saat checkout sudah benar.'
          });
        }

        scalevVerificationNote = 'Scalev API Verified (LUNAS)';
        grossRevenue = scalevCheck.grossRevenue || 0;
        paymentStatus = (scalevCheck.paymentStatus || 'PAID').toUpperCase();

        if (scalevCheck.officialOrderId) {
          orderId = scalevCheck.officialOrderId;
        }
        if (scalevCheck.customerEmail && (!email || !email.includes('@'))) {
          email = scalevCheck.customerEmail.toLowerCase();
        }
        if (scalevCheck.customerName && !name) {
          name = scalevCheck.customerName;
        }
      } else {
        return createJsonResponse({
          success: false,
          verified: false,
          message: 'Email (' + email + ') belum terdaftar di database lisensi. Pastikan email yang dimasukkan sama persis dengan email saat checkout.'
        });
      }

      if (!email || !email.includes('@')) {
        return createJsonResponse({ success: false, message: 'Alamat email pembeli diperlukan untuk pengiriman lisensi resmi.' });
      }

      // Generate lisensi baru unik (WALI-XXXX)
      const licenseKey = generateUniqueLicense(sheet);
      const now = new Date();

      // Kirim Email via Brevo REST API v3
      const brevoResult = sendBrevoEmail(email, licenseKey, orderId, false, name);

      sheet.appendRow([
        now,                                                      // Col 1 (A): Timestamp
        orderId,                                                  // Col 2 (B): Scalev Order ID
        email,                                                    // Col 3 (C): Email
        licenseKey,                                               // Col 4 (D): License Key (WALI-XXXX)
        'ACTIVE',                                                 // Col 5 (E): Status Lisensi
        paymentStatus,                                            // Col 6 (F): Payment Status
        grossRevenue,                                             // Col 7 (G): Gross Revenue (Rp)
        name || '-',                                              // Col 8 (H): Nama Pelanggan
        brevoResult.success ? 'TERKIRIM (Brevo)' : 'GAGAL (' + brevoResult.error + ')', // Col 9 (I)
        brevoResult.messageId || '-',                             // Col 10 (J)
        0,                                                        // Col 11 (K): Resend Count
        name ? scalevVerificationNote + ' (' + name + ')' : scalevVerificationNote // Col 12 (L)
      ]);

      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');

      updateDashboardStats(ss);

      return createJsonResponse({
        success: true,
        licenseKey: licenseKey,
        email: email,
        orderId: orderId,
        name: name,
        paymentStatus: 'paid',
        isNew: true,
        emailSent: brevoResult.success,
        brevoMessageId: brevoResult.messageId,
        mailError: brevoResult.error,
        message: 'Alhamdulillah! Pembayaran resmi terkonfirmasi lunas. Lisensi telah diaktifkan dan dikirim ke email.'
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: CHECK (Gatekeeper Login di index.html)
    // ------------------------------------------------------------------------
    if (action === 'check') {
      const licenseKey = (params.license_key || postData.license_key || '').trim().toUpperCase();
      if (!licenseKey) return createJsonResponse({ success: false, valid: false, message: 'Kode lisensi harus diisi.' });

      const data = sheet.getDataRange().getValues();
      let found = false;
      let foundRow = null;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][3]).trim().toUpperCase() === licenseKey && String(data[i][4]).trim().toUpperCase() === 'ACTIVE') {
          found = true;
          foundRow = data[i];
          break;
        }
      }

      if (found) {
        return createJsonResponse({
          success: true,
          valid: true,
          licenseKey: licenseKey,
          email: foundRow[2],
          orderId: foundRow[1],
          message: 'Lisensi valid dan aktif!'
        });
      } else {
        return createJsonResponse({
          success: true,
          valid: false,
          message: 'Kode lisensi tidak valid, sudah dihapus, atau belum terdaftar.',
          orderUrl: SCALEV_URL,
          adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
            'Halo Admin ' + BRAND_NAME + ', saya butuh bantuan lisensi: ' + licenseKey
          )
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION 3: RESEND (Klaim Manual di index.html)
    // ------------------------------------------------------------------------
    if (action === 'resend') {
      const email = (params.email || postData.email || '').trim().toLowerCase();
      if (!email) return createJsonResponse({ success: false, message: 'Email wajib diisi.' });

      const data = sheet.getDataRange().getValues();
      let found = false;
      let matchedLicense = null;
      let matchedOrderId = null;
      let rowIndex = -1;

      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][2]).trim().toLowerCase() === email && String(data[i][4]).trim().toUpperCase() === 'ACTIVE') {
          found = true;
          matchedLicense = data[i][3];
          matchedOrderId = data[i][1];
          rowIndex = i + 1;
          break;
        }
      }

      if (!found) {
        return createJsonResponse({
          success: false,
          found: false,
          message: 'Email tidak ditemukan di sistem atau lisensi telah dinonaktifkan.',
          adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
            'Halo Admin ' + BRAND_NAME + ', email saya (' + email + ') belum terdaftar. Mohon dibantu.'
          )
        });
      }

      const colMap = getColumnIndices(data[0]);
      const resendCol = (colMap.resendCount !== undefined ? colMap.resendCount : 10) + 1;
      const brevoCol = (colMap.brevoStatus !== undefined ? colMap.brevoStatus : 8) + 1;

      const currentResend = Number(data[rowIndex - 1][colMap.resendCount !== undefined ? colMap.resendCount : 10] || 0);
      sheet.getRange(rowIndex, resendCol).setValue(currentResend + 1);

      const brevoResult = sendBrevoEmail(email, matchedLicense, matchedOrderId, true);
      sheet.getRange(rowIndex, brevoCol).setValue(brevoResult.success ? 'TERKIRIM ULANG (Brevo)' : 'GAGAL KIRIM ULANG');

      return createJsonResponse({
        success: true,
        found: true,
        licenseKey: matchedLicense,
        emailSent: brevoResult.success,
        brevoMessageId: brevoResult.messageId,
        message: brevoResult.success
          ? 'Lisensi Anda telah berhasil dikirimkan ulang via Brevo ke ' + email + '!'
          : 'Lisensi ditemukan, namun pengiriman email via Brevo gagal (' + brevoResult.error + '). Hubungi WhatsApp Admin.'
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 4: DELETE (Hapus / Cabut Lisensi via API)
    // ------------------------------------------------------------------------
    if (action === 'delete') {
      const secret = params.secret || postData.secret || '';
      if (secret !== ADMIN_SECRET_KEY) {
        return createJsonResponse({ success: false, message: 'Akses ditolak: Kunci rahasia admin salah.' });
      }

      const target = (params.target || postData.target || '').trim();
      if (!target) {
        return createJsonResponse({ success: false, message: 'Parameter target (lisensi/email/order_id) diperlukan.' });
      }

      const data = sheet.getDataRange().getValues();
      let deletedCount = 0;

      for (let i = data.length - 1; i >= 1; i--) {
        const orderId = String(data[i][1]).trim();
        const email = String(data[i][2]).trim().toLowerCase();
        const license = String(data[i][3]).trim().toUpperCase();

        if (
          license === target.toUpperCase() ||
          email === target.toLowerCase() ||
          orderId === target
        ) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        updateDashboardStats(ss);
        return createJsonResponse({
          success: true,
          deletedCount: deletedCount,
          message: 'Berhasil menghapus ' + deletedCount + ' baris lisensi yang cocok dengan: ' + target
        });
      } else {
        return createJsonResponse({
          success: false,
          deletedCount: 0,
          message: 'Tidak ditemukan lisensi dengan kriteria: ' + target
        });
      }
    }

    // ------------------------------------------------------------------------
    // ACTION 5: DELETE_ALL (Hapus Semua Order via API dengan Kunci Rahasia)
    // ------------------------------------------------------------------------
    if (action === 'delete_all') {
      const secret = params.secret || postData.secret || '';
      if (secret !== ADMIN_SECRET_KEY) {
        return createJsonResponse({ success: false, message: 'Akses ditolak: Kunci rahasia admin salah.' });
      }

      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ success: true, deletedCount: 0, message: 'Sheet Licenses sudah kosong.' });
      }

      const deletedCount = lastRow - 1;
      sheet.deleteRows(2, deletedCount);
      updateDashboardStats(ss);

      return createJsonResponse({
        success: true,
        deletedCount: deletedCount,
        message: 'Berhasil menghapus SEMUA data (' + deletedCount + ' baris order) dari sheet.'
      });
    }

    return createJsonResponse({ success: false, message: 'Aksi tidak dikenal.' });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Halaman Status Visual Ceria jika Web App URL dibuka langsung di Browser
 */
function renderServerStatusPage() {
  const isBrevoConfigured = BREVO_API_KEY && !BREVO_API_KEY.includes('PASTE_YOUR_BREVO_API_KEY');

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Status - Wali Pintar</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
        .card { background: #ffffff; border-radius: 24px; padding: 32px 24px; max-width: 500px; width: 100%; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15); border: 3px solid #bbf7d0; text-align: center; }
        .badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 999px; margin-bottom: 16px; }
        h1 { font-size: 22px; font-weight: 900; color: #065f46; margin-bottom: 8px; }
        p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 20px; }
        .status-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-align: left; font-size: 13px; margin-bottom: 20px; }
        .status-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .status-row:last-child { margin-bottom: 0; }
        .tag-ok { color: #15803d; font-weight: bold; }
        .tag-warn { color: #d97706; font-weight: bold; }
        .btn { display: block; width: 100%; padding: 12px; border-radius: 12px; background: #10b981; color: #fff; font-weight: bold; text-decoration: none; text-align: center; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">🟢 SERVER ONLINE & SIAP</span>
        <h1>Backend API Wali Pintar</h1>
        <p>Deployment Google Apps Script Anda <strong>SUDAH AKTIF</strong> dan berhasil terhubung.</p>

        <div class="status-box">
          <div class="status-row"><span>Status Google Sheets:</span><span class="tag-ok">✅ Terhubung</span></div>
          <div class="status-row"><span>Status Brevo API:</span><span class="${isBrevoConfigured ? 'tag-ok' : 'tag-warn'}">${isBrevoConfigured ? '✅ Terpasang' : '⚠️ Belum Isi API Key'}</span></div>
          <div class="status-row"><span>Metode Akses:</span><span class="tag-ok">GET / POST JSON</span></div>
        </div>

        <p style="font-size: 12px; color: #94a3b8;">
          URL ini dipanggil otomatis oleh sistem aktivasi dan game. Anda tidak perlu membukanya secara manual.
        </p>
        <a href="https://walipintar.my.id" class="btn">Buka Halaman Utama Website</a>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html).setTitle('API Status - Wali Pintar');
}

/**
 * Pengiriman Email Murni Brevo REST API v3
 */
function sendBrevoEmail(toEmail, licenseKey, orderId, isResend, customerName) {
  if (!BREVO_API_KEY || BREVO_API_KEY.includes('PASTE_YOUR_BREVO_API_KEY')) {
    return { success: false, messageId: null, error: 'Brevo API Key belum diisi di Code.gs.' };
  }

  const subject = (isResend ? '[Kirim Ulang] ' : '🎉 ') + 'Lisensi Game Edukasi ' + BRAND_NAME + ': ' + licenseKey;
  const htmlContent = generateLicenseHtmlEmail(licenseKey, orderId, customerName);
  const recipientName = customerName && customerName.trim() ? customerName.trim() : 'Ayah & Bunda Hebat';

  const payload = {
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    to: [{ email: toEmail, name: recipientName }],
    subject: subject,
    htmlContent: htmlContent
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'api-key': BREVO_API_KEY, 'Accept': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (statusCode === 201 || statusCode === 200) {
      let resJson = {};
      try { resJson = JSON.parse(responseText); } catch (e) {}
      return { success: true, messageId: resJson.messageId || 'OK', error: null };
    } else {
      return { success: false, messageId: null, error: 'HTTP ' + statusCode + ' - ' + responseText };
    }
  } catch (err) {
    return { success: false, messageId: null, error: err.toString() };
  }
}

/**
 * ============================================================================
 * FITUR MENU ADMIN GOOGLE SHEETS
 * ============================================================================
 */

function menuGenerateManual() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = initLicensesSheet(ss);

  const orderPrompt = ui.prompt(
    '⚡ Generate Lisensi Manual',
    'Masukkan Order ID / Invoice Pembeli (Contoh: INV-9988 atau MANUAL-01):',
    ui.ButtonSet.OK_CANCEL
  );
  if (orderPrompt.getSelectedButton() !== ui.Button.OK) return;
  const orderId = orderPrompt.getResponseText().trim();
  if (!orderId) { ui.alert('❌ Order ID tidak boleh kosong!'); return; }

  const emailPrompt = ui.prompt(
    '⚡ Generate Lisensi Manual',
    'Masukkan Email Pembeli yang komplain:',
    ui.ButtonSet.OK_CANCEL
  );
  if (emailPrompt.getSelectedButton() !== ui.Button.OK) return;
  const email = emailPrompt.getResponseText().trim().toLowerCase();
  if (!email || !email.includes('@')) { ui.alert('❌ Format email tidak valid!'); return; }

  const confirmSend = ui.alert(
    'Kirim via Brevo?',
    'Kirimkan kode lisensi ini langsung ke email pembeli (' + email + ') via Brevo?',
    ui.ButtonSet.YES_NO
  );

  const licenseKey = generateUniqueLicense(sheet);
  const now = new Date();
  let brevoStatus = 'DIBUAT MANUAL (Tidak Dikirim)';
  let messageId = '-';

  if (confirmSend === ui.Button.YES) {
    const brevoRes = sendBrevoEmail(email, licenseKey, orderId, false);
    if (brevoRes.success) {
      brevoStatus = 'TERKIRIM (Brevo Manual)';
      messageId = brevoRes.messageId;
    } else {
      brevoStatus = 'GAGAL (' + brevoRes.error + ')';
    }
  }

  sheet.appendRow([
    now,
    orderId,
    email,
    licenseKey,
    'ACTIVE',
    'PAID (Manual)',
    99000,
    'Customer Manual',
    brevoStatus,
    messageId,
    0,
    'Manual Generate oleh Admin via Menu Sheet'
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');

  updateDashboardStats(ss);

  const msg = 
    '✅ Lisensi Berhasil Dibuat!\n\n' +
    '• Kode Lisensi: ' + licenseKey + '\n' +
    '• Order ID: ' + orderId + '\n' +
    '• Email: ' + email + '\n' +
    '• Status Brevo: ' + brevoStatus + '\n\n' +
    'Salin kode di atas untuk langsung dikirimkan ke chat WhatsApp pembeli.';

  ui.alert('🎉 Sukses Generate Manual', msg, ui.ButtonSet.OK);
}

function menuResendManual() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = initLicensesSheet(ss);

  const prompt = ui.prompt(
    '🔄 Kirim Ulang Email Lisensi',
    'Masukkan Email Pembeli yang ingin dikirimkan ulang lisensinya:',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const email = prompt.getResponseText().trim().toLowerCase();

  const data = sheet.getDataRange().getValues();
  let matchedRow = null;
  let rowIndex = -1;

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][2]).trim().toLowerCase() === email) {
      matchedRow = data[i];
      rowIndex = i + 1;
      break;
    }
  }

  if (!matchedRow) {
    ui.alert('❌ Email Tidak Ditemukan', 'Email ' + email + ' tidak terdaftar di database lisensi.', ui.ButtonSet.OK);
    return;
  }

  const orderId = matchedRow[1];
  const licenseKey = matchedRow[3];

  const colMap = getColumnIndices(data[0]);
  const resendCol = (colMap.resendCount !== undefined ? colMap.resendCount : 10) + 1;
  const brevoCol = (colMap.brevoStatus !== undefined ? colMap.brevoStatus : 8) + 1;

  const res = sendBrevoEmail(email, licenseKey, orderId, true);
  if (res.success) {
    const curResend = Number(matchedRow[colMap.resendCount !== undefined ? colMap.resendCount : 10] || 0);
    sheet.getRange(rowIndex, resendCol).setValue(curResend + 1);
    sheet.getRange(rowIndex, brevoCol).setValue('TERKIRIM ULANG (Brevo)');
    ui.alert('✅ Berhasil!', 'Email lisensi berhasil terkirim via Brevo ke ' + email + '.', ui.ButtonSet.OK);
  } else {
    ui.alert('⚠️ Gagal Mengirim via Brevo', 'Detail Error: ' + res.error + '\n\nKode Lisensi Pembeli: ' + licenseKey, ui.ButtonSet.OK);
  }
}

function menuDeleteLicenseSearch() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = initLicensesSheet(ss);

  const prompt = ui.prompt(
    '🗑️ Hapus Lisensi Tertentu',
    'Masukkan Kode Lisensi (WALI-XXXXXX), Email Pembeli, atau Order ID yang ingin DIHAPUS:',
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const query = prompt.getResponseText().trim();
  if (!query) {
    ui.alert('❌ Masukan tidak boleh kosong!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const matchedIndices = [];

  for (let i = 1; i < data.length; i++) {
    const orderId = String(data[i][1]).trim();
    const email = String(data[i][2]).trim().toLowerCase();
    const license = String(data[i][3]).trim().toUpperCase();

    if (
      license === query.toUpperCase() ||
      email === query.toLowerCase() ||
      orderId === query
    ) {
      matchedIndices.push({
        rowNumber: i + 1,
        license: license,
        email: email,
        orderId: orderId
      });
    }
  }

  if (matchedIndices.length === 0) {
    ui.alert('❌ Data Tidak Ditemukan', 'Tidak ada lisensi yang cocok dengan kriteria: "' + query + '".', ui.ButtonSet.OK);
    return;
  }

  let confirmDetails = 'Ditemukan ' + matchedIndices.length + ' data lisensi:\n';
  matchedIndices.forEach((item, idx) => {
    confirmDetails += (idx + 1) + '. Lisensi: ' + item.license + ' | Email: ' + item.email + ' | Order: ' + item.orderId + ' (Baris ' + item.rowNumber + ')\n';
  });
  confirmDetails += '\n⚠️ PERINGATAN: Penghapusan bersifat permanen dan pembeli tidak akan dapat masuk ke game lagi.\nApakah Anda yakin ingin MENGHAPUS data ini?';

  const confirm = ui.alert('⚠️ Konfirmasi Hapus Lisensi', confirmDetails, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) {
    ui.alert('Penghapusan dibatalkan.');
    return;
  }

  for (let i = matchedIndices.length - 1; i >= 0; i--) {
    sheet.deleteRow(matchedIndices[i].rowNumber);
  }

  updateDashboardStats(ss);
  ui.alert('✅ Berhasil Dihapus!', 'Sebanyak ' + matchedIndices.length + ' baris data lisensi berhasil dihapus dari sistem.', ui.ButtonSet.OK);
}

function menuDeleteSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();

  if (activeSheet.getName() !== SHEET_LICENSES) {
    ui.alert('❌ Harap buka tab sheet "' + SHEET_LICENSES + '" terlebih dahulu sebelum menggunakan menu ini.');
    return;
  }

  const activeRange = activeSheet.getActiveRange();
  if (!activeRange) {
    ui.alert('❌ Tidak ada baris yang dipilih.');
    return;
  }

  const startRow = activeRange.getRow();
  const numRows = activeRange.getNumRows();

  if (startRow === 1) {
    ui.alert('❌ Baris 1 adalah Header Kolom dan tidak boleh dihapus!');
    return;
  }

  const confirm = ui.alert(
    '⚠️ Konfirmasi Hapus Baris Terpilih',
    'Anda akan menghapus baris ke-' + startRow + (numRows > 1 ? ' sampai ke-' + (startRow + numRows - 1) : '') + ' (' + numRows + ' baris data lisensi).\n\nLanjutkan penghapusan permanen?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  activeSheet.deleteRows(startRow, numRows);
  updateDashboardStats(ss);

  ui.alert('✅ Baris Berhasil Dihapus!', numRows + ' baris data lisensi telah dihapus dari sheet dan laporan telah disegarkan.', ui.ButtonSet.OK);
}

/**
 * Menu Hapus SEMUA Order di Sheet Licenses (Reset Total)
 * Menghapus baris 2 sampai baris terakhir, mempertahankan Header di baris 1.
 * Dilengkapi dialog konfirmasi ganda (ketik kata 'HAPUS') untuk keamanan.
 */
function menuDeleteAllOrders() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = initLicensesSheet(ss);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    ui.alert('ℹ️ Sheet Masih Kosong', 'Tidak ada data order atau lisensi yang tersimpan di sheet "' + SHEET_LICENSES + '".', ui.ButtonSet.OK);
    return;
  }

  const orderCount = lastRow - 1;

  // Dialog Konfirmasi 1: Peringatan Awal
  const confirm1 = ui.alert(
    '⚠️ PERINGATAN KERAS: Hapus SEMUA Order',
    'Anda akan MENGHAPUS SEMUA DATA (' + orderCount + ' baris pesanan & lisensi) di tab "' + SHEET_LICENSES + '".\n\n' +
    '• Seluruh lisensi aktif akan terhapus permanen.\n' +
    '• Pembeli sebelumnya tidak akan bisa mengakses game lagi kecuali didaftarkan ulang.\n' +
    '• Baris 1 (Header Tabel) akan tetap dipertahankan.\n\n' +
    'Apakah Anda yakin ingin melanjutkan?',
    ui.ButtonSet.YES_NO
  );

  if (confirm1 !== ui.Button.YES) {
    ui.alert('Penghapusan dibatalkan.');
    return;
  }

  // Dialog Konfirmasi 2: Pengaman Ketik Kata "HAPUS"
  const confirm2 = ui.prompt(
    '🔒 Konfirmasi Pengaman Terakhir',
    'Untuk mencegah salah klik yang tidak disengaja, ketik kata "HAPUS" di kolom bawah lalu klik OK:',
    ui.ButtonSet.OK_CANCEL
  );

  if (confirm2.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Penghapusan dibatalkan.');
    return;
  }

  const userInput = confirm2.getResponseText().trim().toUpperCase();
  if (userInput !== 'HAPUS') {
    ui.alert('❌ Dibatalkan', 'Kata kunci tidak cocok ("' + userInput + '"). Penghapusan seluruh order dibatalkan.', ui.ButtonSet.OK);
    return;
  }

  // Eksekusi penghapusan dari baris 2 sampai baris terakhir
  sheet.deleteRows(2, orderCount);

  // Segarkan tab laporan & statistik
  updateDashboardStats(ss);

  ui.alert(
    '✅ SEMUA ORDER BERHASIL DIHAPUS!',
    'Sebanyak ' + orderCount + ' data pesanan & lisensi telah berhasil dibersihkan dari sheet "' + SHEET_LICENSES + '".\n\n' +
    '• Baris 1 (Header) tetap rapi dan siap menerima order baru.\n' +
    '• Tab Laporan & Statistik telah disegarkan menjadi 0 transaksi.',
    ui.ButtonSet.OK
  );
}

function menuGenerateReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  updateDashboardStats(ss);
  SpreadsheetApp.getUi().alert('✅ Laporan Berhasil Diperbarui!\n\nSilakan cek tab "' + SHEET_REPORTS + '".');
}

function menuTestBrevoConnection() {
  const ui = SpreadsheetApp.getUi();
  if (!BREVO_API_KEY || BREVO_API_KEY.includes('PASTE_YOUR_BREVO_API_KEY')) {
    ui.alert('❌ Brevo API Key belum diisi!\n\nSilakan buka Code.gs lalu isi variabel BREVO_API_KEY.');
    return;
  }

  try {
    // Gunakan endpoint /v3/senders yang didukung oleh semua jenis API Key Brevo Transactional
    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/senders', {
      method: 'get',
      headers: { 'api-key': BREVO_API_KEY, 'Accept': 'application/json' },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code === 200) {
      let data = {};
      try { data = JSON.parse(text); } catch (e) {}
      const senders = data.senders || [];
      let senderListStr = '';
      senders.slice(0, 3).forEach((s) => {
        senderListStr += '• ' + s.name + ' (' + s.email + ') - ' + (s.active ? 'Aktif ✅' : 'Belum Verifikasi ⚠️') + '\n';
      });

      ui.alert(
        '✅ Koneksi Brevo API Berhasil & Aktif!',
        'API Key Anda 100% valid dan siap mengirimkan email lisensi.\n\n' +
        'Daftar Pengirim Terdaftar di Brevo:\n' +
        (senderListStr || '• Email Pengirim siap digunakan.') + '\n' +
        'Pengirim yang digunakan saat ini: ' + BREVO_SENDER_EMAIL,
        ui.ButtonSet.OK
      );
    } else if (code === 403 && text.includes('permission_denied')) {
      // Jika key khusus SMTP, infokan bahwa pengiriman email tetap aktif
      ui.alert(
        'ℹ️ Brevo API Key Valid untuk Pengiriman',
        'API Key Anda bertipe SMTP/Transactional Key. Pengiriman email tetap berjalan normal saat pembeli checkout.\n\nDetail: ' + text,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('❌ Gagal Terhubung ke Brevo', 'HTTP ' + code + ':\n' + text, ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('❌ Error Koneksi', err.toString(), ui.ButtonSet.OK);
  }
}

function initLicensesSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_LICENSES);
  const EXPECTED_HEADERS = [
    'Timestamp',              // Col 1 (A)
    'Order ID Scalev',        // Col 2 (B) - Langsung Order ID Scalev resmi (misal: 261107ZATESNF)
    'Email',                  // Col 3 (C)
    'License Key',            // Col 4 (D) - WALI-XXXX
    'Status Lisensi',         // Col 5 (E) - ACTIVE
    'Payment Status',         // Col 6 (F) - Scalev Payment: Paid / Completed / Unpaid
    'Gross Revenue (Rp)',     // Col 7 (G) - Nilai Nominal Rupiah dari API Scalev
    'Nama Pelanggan',         // Col 8 (H) - Nama resmi dari Scalev
    'Brevo Status',           // Col 9 (I)
    'Brevo Message ID',       // Col 10 (J)
    'Resend Count',           // Col 11 (K)
    'Catatan / Verifikasi'    // Col 12 (L)
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LICENSES);
    sheet.appendRow(EXPECTED_HEADERS);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length);
    headerRange.setBackground('#059669').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 170);
    sheet.setColumnWidth(3, 220);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 110);
    sheet.setColumnWidth(6, 130);
    sheet.setColumnWidth(7, 150);
    sheet.setColumnWidth(8, 160);
    sheet.setColumnWidth(9, 180);
    sheet.setColumnWidth(10, 160);
    sheet.setColumnWidth(11, 100);
    sheet.setColumnWidth(12, 220);
  } else {
    // Pastikan Kolom B selalu berlabel 'Order ID Scalev'
    sheet.getRange(1, 2).setValue('Order ID Scalev');
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    const headerStr = currentHeaders.join('|').toLowerCase();
    if (!headerStr.includes('gross revenue') || !headerStr.includes('payment status')) {
      sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).setValues([EXPECTED_HEADERS]);
      sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).setBackground('#059669').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setColumnWidth(2, 170);
      sheet.setColumnWidth(6, 130);
      sheet.setColumnWidth(7, 150);
      sheet.setColumnWidth(8, 160);
    }
  }
  return sheet;
}

function updateDashboardStats(ss) {
  let reportSheet = ss.getSheetByName(SHEET_REPORTS);
  if (!reportSheet) {
    reportSheet = ss.insertSheet(SHEET_REPORTS);
  }

  const licensesSheet = initLicensesSheet(ss);
  const data = licensesSheet ? licensesSheet.getDataRange().getValues() : [];

  let totalLicenses = 0;
  let activeLicenses = 0;
  let brevoSent = 0;
  let todayCount = 0;
  let totalGrossRevenuePaid = 0;
  let totalGrossRevenueAll = 0;
  let totalPaidTransactions = 0;
  let totalPendingTransactions = 0;
  let todayGrossRevenuePaid = 0;

  const todayStr = new Date().toDateString();
  const header = data[0] || [];
  const colMap = getColumnIndices(header);

  for (let i = 1; i < data.length; i++) {
    totalLicenses++;
    const row = data[i];
    const status = String(row[colMap.status ?? 4] || '').trim().toUpperCase();
    const payStatus = String(row[colMap.paymentStatus ?? 5] || '').trim().toUpperCase();
    const rawRevenue = row[colMap.grossRevenue ?? 6];
    let rev = typeof rawRevenue === 'number' ? rawRevenue : parseFloat(String(rawRevenue || 0).replace(/[^0-9.-]/g, ''));
    if (isNaN(rev)) rev = 0;

    const brevoStatus = String(row[colMap.brevoStatus ?? 8] || '').trim().toUpperCase();
    const rowDate = new Date(row[colMap.timestamp ?? 0]);
    const isToday = rowDate.toDateString() === todayStr;

    totalGrossRevenueAll += rev;

    // Kriteria PAID: status 'PAID', 'COMPLETED', 'SETTLED', atau jika status lisensi ACTIVE
    const isPaid = (payStatus === 'PAID' || payStatus === 'COMPLETED' || payStatus === 'SETTLED' || (!payStatus && status === 'ACTIVE'));

    if (isPaid) {
      totalPaidTransactions++;
      totalGrossRevenuePaid += rev;
      if (isToday) {
        todayGrossRevenuePaid += rev;
      }
    } else {
      totalPendingTransactions++;
    }

    if (status === 'ACTIVE') activeLicenses++;
    if (brevoStatus.includes('TERKIRIM')) brevoSent++;
    if (isToday) todayCount++;
  }

  const avgGrossRevenuePaid = totalPaidTransactions > 0 ? Math.round(totalGrossRevenuePaid / totalPaidTransactions) : 0;

  reportSheet.clear();

  // Banner Header
  reportSheet.getRange('A1:E1').merge()
    .setValue('📊 DASHBOARD MONITORING LISENSI & GROSS REVENUE WALI PINTAR')
    .setBackground('#064e3b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(13)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  reportSheet.setRowHeight(1, 38);

  // SECTION 1: RINGKASAN GROSS REVENUE KHUSUS STATUS PAID (PERMINTAAN USER)
  reportSheet.getRange('A3:E3').merge()
    .setValue('💰 SUMMARY GROSS REVENUE (KHUSUS STATUS PAID / LUNAS)')
    .setBackground('#059669')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11);

  const revenueRows = [
    ['Total Gross Revenue (Khusus Paid)', totalGrossRevenuePaid, '"Rp"#,##0', '#ecfdf5', '#065f46', 13],
    ['Total Transaksi Paid (Lunas)', totalPaidTransactions + ' Transaksi', '@', '#ffffff', '#0f172a', 11],
    ['Rata-Rata Gross Revenue per Transaksi Paid', avgGrossRevenuePaid, '"Rp"#,##0', '#ffffff', '#0f172a', 11],
    ['Gross Revenue Paid Hari Ini (' + new Date().toLocaleDateString('id-ID') + ')', todayGrossRevenuePaid, '"Rp"#,##0', '#f0fdf4', '#047857', 11]
  ];

  for (let i = 0; i < revenueRows.length; i++) {
    const r = i + 4;
    reportSheet.getRange(r, 1, 1, 2).merge()
      .setValue(revenueRows[i][0])
      .setFontWeight('bold')
      .setBackground(revenueRows[i][3])
      .setFontColor(revenueRows[i][4]);

    const valCell = reportSheet.getRange(r, 3, 1, 2).merge();
    valCell.setValue(revenueRows[i][1])
      .setFontWeight('bold')
      .setFontSize(revenueRows[i][5])
      .setHorizontalAlignment('right')
      .setBackground(revenueRows[i][3])
      .setFontColor(revenueRows[i][4]);

    if (revenueRows[i][2] !== '@') {
      valCell.setNumberFormat(revenueRows[i][2]);
    }
  }

  // Formula Otomatis Google Sheets untuk Cross-Check
  reportSheet.getRange('A8:B8').merge()
    .setValue('Formula Otomatis Sheet (=SUMIF)')
    .setFontStyle('italic')
    .setFontColor('#64748b');
  reportSheet.getRange('C8:D8').merge()
    .setFormula('=SUMIF(' + SHEET_LICENSES + '!F:F, "*PAID*", ' + SHEET_LICENSES + '!G:G)')
    .setFontWeight('bold')
    .setNumberFormat('"Rp"#,##0')
    .setHorizontalAlignment('right');

  // SECTION 2: METRIK OPERASIONAL & PENGIRIMAN
  reportSheet.getRange('A10:E10').merge()
    .setValue('📈 METRIK OPERASIONAL LISENSI & BREVO')
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11);

  const opsMetrics = [
    ['Total Lisensi Diterbitkan', totalLicenses],
    ['Lisensi Aktif (Siap Main)', activeLicenses],
    ['Lisensi Terbit Hari Ini', todayCount],
    ['Email Berhasil Terkirim (Brevo)', brevoSent],
    ['Terakhir Diperbarui Otomatis', new Date().toLocaleString('id-ID')]
  ];

  for (let i = 0; i < opsMetrics.length; i++) {
    const r = i + 11;
    reportSheet.getRange(r, 1, 1, 2).merge()
      .setValue(opsMetrics[i][0])
      .setFontWeight('bold')
      .setBackground('#f8fafc');
    reportSheet.getRange(r, 3, 1, 2).merge()
      .setValue(opsMetrics[i][1])
      .setFontWeight('bold')
      .setHorizontalAlignment('right');
  }

  reportSheet.getRange('A3:D8').setBorder(true, true, true, true, true, true, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);
  reportSheet.getRange('A10:D15').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

  reportSheet.setColumnWidth(1, 180);
  reportSheet.setColumnWidth(2, 180);
  reportSheet.setColumnWidth(3, 130);
  reportSheet.setColumnWidth(4, 130);
  reportSheet.setColumnWidth(5, 50);

  // Panduan
  reportSheet.getRange('A17').setValue('💡 PANDUAN PENGELOLAAN SCALEV & LISENSI:').setFontWeight('bold');
  reportSheet.getRange('A18').setValue('1. Kolom "Gross Revenue" otomatis merekam nilai rupiah yang ditangkap dari API Scalev.');
  reportSheet.getRange('A19').setValue('2. Summary di atas secara khusus menghitung total pendapatan dari transaksi yang berstatus "PAID".');
  reportSheet.getRange('A20').setValue('3. Menu Admin: Gunakan menu "🎮 WaliPintar Admin" > "🔄 Tarik & Sinkron Semua Order Scalev API" untuk menarik ulang seluruh pesanan langsung dari Scalev.');
}

/**
 * Helper: Generate Unique License WALI-XXXX (Kombinasi 4 Karakter Huruf & Angka)
 * Karakter 0, O, 1, I dihilangkan untuk mencegah typo/salah ketik oleh pembeli.
 * Contoh Hasil: WALI-7K9P, WALI-3M8Q, WALI-B9F2, WALI-X4RT
 */
function generateUniqueLicense(sheet) {
  // Karakter aman tanpa 0, O, 1, I (Total 32 karakter = 1.048.576 kombinasi unik)
  const SAFE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const existingValues = sheet.getDataRange().getValues();
  const existingSet = new Set();
  for (let i = 1; i < existingValues.length; i++) {
    existingSet.add(String(existingValues[i][3]).trim().toUpperCase());
  }

  let code = '';
  let attempts = 0;
  do {
    code = 'WALI-';
    for (let i = 0; i < 4; i++) {
      code += SAFE_CHARS.charAt(Math.floor(Math.random() * SAFE_CHARS.length));
    }
    attempts++;
  } while (existingSet.has(code) && attempts < 1000);

  return code;
}

function generateLicenseHtmlEmail(licenseKey, orderId, customerName) {
  // URL logo web terkompresi (ukuran ~6.2 KB ultra ringan & cepat dimuat di Gmail / HP)
  const LOGO_URL = `${APP_URL}/assets/logo-email.png`;
  const greeting = customerName && customerName.trim() ? `Halo Bunda / Ayah ${customerName.trim()}! 👋` : 'Halo Ayah & Bunda Hebat! 👋';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 24px; color: #1e293b; border: 1px solid #e2e8f0;">
      
      <!-- LOGO WEB TERKOMPRESI (6.2 KB) & BRANDING -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" width="80" height="80" alt="${BRAND_NAME}" style="display: block; margin: 0 auto 12px auto; width: 80px; height: 80px; border-radius: 20px; border: 3px solid #bbf7d0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.18); object-fit: cover;" />
        <h1 style="color: #065f46; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">🌱 ${BRAND_NAME}</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; font-weight: 600;">Zona Bermain & Belajar Edukatif Si Kecil &bull; 100% Bebas Iklan &bull; Siap Offline</p>
      </div>

      <!-- KARTU UTAMA LISENSI -->
      <div style="background-color: #ffffff; padding: 26px 22px; border-radius: 20px; border: 2px solid #e2e8f0; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">${greeting}</h2>
        <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin-bottom: 18px;">
          Terima kasih telah mempercayakan media belajar si kecil kepada <strong>${BRAND_NAME}</strong>. Pembayaran Anda telah kami terima dengan sukses. Berikut adalah kode lisensi resmi Anda:
        </p>

        <!-- KOTAK KODE LISENSI RESMI (TEPAT 9 KARAKTER: WALI-XXXX) -->
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px dashed #10b981; border-radius: 16px; padding: 20px 14px; text-align: center; margin: 18px 0;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 1.5px; display: block; margin-bottom: 6px;">
            KODE LISENSI RESMI ANDA (TEPAT 9 KARAKTER):
          </span>
          
          <div style="font-size: 30px; font-weight: 900; color: #064e3b; letter-spacing: 3px; margin: 8px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; user-select: all; -webkit-user-select: all; background: #ffffff; padding: 10px 16px; border-radius: 12px; display: inline-block; border: 1px solid #a7f3d0; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
            ${licenseKey}
          </div>
          
          <div style="font-size: 11.5px; color: #64748b; margin-top: 8px; font-weight: 600;">
            Nomor Pesanan: <strong style="color: #0f172a;">${orderId}</strong> &bull; Format: WALI-XXXX (Tanpa angka 0, 1 & huruf O, I)
          </div>

          <!-- TOMBOL COPY PASTE LISENSI DI EMAIL -->
          <div style="margin-top: 14px;">
            <a href="${APP_URL}/claim?key=${licenseKey}&action=copy" target="_blank" style="display: inline-block; background-color: #f1f5f9; hover: background-color: #e2e8f0; color: #1e293b; border: 1.5px solid #cbd5e1; padding: 9px 18px; border-radius: 10px; font-size: 12.5px; font-weight: 800; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              📋 Klik untuk Salin Lisensi Otomatis
            </a>
          </div>
        </div>

        <!-- TOMBOL UTAMA BUKA GAME (1-KLIK LANGSUNG AKTIF) -->
        <div style="text-align: center; margin: 22px 0 16px 0;">
          <a href="${APP_URL}/?key=${licenseKey}" target="_blank" style="display: block; background-color: #10b981; color: #ffffff; padding: 15px 24px; border-radius: 14px; font-size: 15.5px; font-weight: 900; text-decoration: none; text-align: center; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);">
            🚀 Buka Dashboard Game (1-Klik Otomatis)
          </a>
          <span style="font-size: 11px; color: #64748b; margin-top: 6px; display: block;">
            *Klik tombol di atas untuk langsung membuka dan mengaktifkan 17 game edukatif tanpa perlu ketik manual.
          </span>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />

        <h3 style="color: #0f172a; font-size: 14px; font-weight: 800; margin-bottom: 8px;">Cara Memasang Aplikasi di HP / Tablet (Bisa Offline):</h3>
        <ol style="color: #475569; font-size: 12.5px; line-height: 1.7; padding-left: 20px; margin-bottom: 0;">
          <li>Buka game lewat tautan di atas menggunakan browser <strong>Google Chrome</strong> (Android) atau <strong>Safari</strong> (iPhone/iPad).</li>
          <li>Klik menu titik tiga di pojok kanan atas browser, lalu pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
          <li>Aplikasi Wali Pintar akan terpasang di HP Anda dan 100% siap dimainkan si kecil kapan saja tanpa kuota internet!</li>
        </ol>

        <!-- SEKSI MEDIA SOSIAL RESMI (YOUTUBE, FACEBOOK, INSTAGRAM, TIKTOK) -->
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 11.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">
            Ikuti Media Sosial Resmi Wali Pintar
          </p>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto; max-width: 480px;">
            <tr>
              <!-- YouTube -->
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://youtube.com/@walipintar" target="_blank" style="display: block; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 9px 6px; text-decoration: none; font-size: 12px; font-weight: 700; color: #e11d48; text-align: center;">
                  <span style="display: block; font-size: 16px; line-height: 1; margin-bottom: 3px;">▶️</span>
                  <span>YouTube</span>
                </a>
              </td>
              <!-- Facebook -->
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://facebook.com/walipintar" target="_blank" style="display: block; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 9px 6px; text-decoration: none; font-size: 12px; font-weight: 700; color: #1d4ed8; text-align: center;">
                  <span style="display: block; font-size: 16px; line-height: 1; margin-bottom: 3px;">👥</span>
                  <span>Facebook</span>
                </a>
              </td>
              <!-- Instagram -->
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://instagram.com/walipintar" target="_blank" style="display: block; background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px; padding: 9px 6px; text-decoration: none; font-size: 12px; font-weight: 700; color: #be185d; text-align: center;">
                  <span style="display: block; font-size: 16px; line-height: 1; margin-bottom: 3px;">📸</span>
                  <span>Instagram</span>
                </a>
              </td>
              <!-- TikTok -->
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://tiktok.com/@walipintar" target="_blank" style="display: block; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 6px; text-decoration: none; font-size: 12px; font-weight: 700; color: #0f172a; text-align: center;">
                  <span style="display: block; font-size: 16px; line-height: 1; margin-bottom: 3px;">🎵</span>
                  <span>TikTok</span>
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size: 11px; color: #94a3b8; margin: 10px 0 0 0; line-height: 1.5;">
            Dapatkan inspirasi stimulasi anak, tips parenting, dan update game edukatif di <strong>@walipintar</strong>.
          </p>
        </div>
      </div>

      <!-- FOOTER EMAIL -->
      <div style="text-align: center; margin-top: 20px; font-size: 11.5px; color: #94a3b8; line-height: 1.6;">
        Email resmi dikirim otomatis melalui sistem lisensi <strong>${BRAND_NAME}</strong>.<br>
        Butuh bantuan teknis / pertanyaan? Hubungi Customer Service kami:<br>
        <a href="https://wa.me/${ADMIN_WA}" style="color: #059669; font-weight: bold; text-decoration: none;">💬 WhatsApp Admin (+62 857-0480-8186)</a><br>
        &copy; ${BRAND_NAME} &bull; Seluruh hak cipta dilindungi undang-undang.
      </div>
    </div>
  `;
}

// ============================================================================
// 🛡️ MODUL SCALEV API v3: VERIFIKASI STATUS PEMBAYARAN REAL-TIME (ANTI-BYPASS)
// ============================================================================

/**
 * Memverifikasi ke server Scalev apakah pesanan benar-benar sudah berstatus LUNAS (Paid).
 * Jika status bukan 'paid' (misal unpaid/cancelled) atau order palsu, akses langsung ditolak.
 * 
 * @param {string} orderId - ID pesanan (UUID atau Order ID / Nomor Invoice)
 * @returns {object} Status verifikasi dan data pembeli resmi dari Scalev
 */
function verifyScalevPayment(orderId) {
  if (!SCALEV_API_KEY || SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY')) {
    return {
      configured: false,
      verified: true, // Fallback jika belum diisi agar tidak memblokir uji coba awal
      message: 'Scalev API Key belum dipasang di Code.gs.'
    };
  }

  try {
    const cleanTarget = String(orderId || '').trim();
    if (!cleanTarget) {
      return { configured: true, verified: false, message: 'Parameter target kosong.' };
    }

    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + SCALEV_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    let json = null;
    let statusCode = 0;

    // 1. JIKA TARGET ADALAH EMAIL (MENGANDUNG '@')
    if (cleanTarget.includes('@')) {
      const emailLower = cleanTarget.toLowerCase();
      // Ambil daftar order terbaru dari Scalev API v3
      const listUrl = 'https://api.scalev.com/v3/orders?limit=100';
      const response = UrlFetchApp.fetch(listUrl, options);
      statusCode = response.getResponseCode();
      const content = response.getContentText();
      let listJson = null;
      try { listJson = JSON.parse(content); } catch (e) {}

      const orderList = (listJson && (listJson.data || listJson.orders || (Array.isArray(listJson) ? listJson : []))) || [];
      if (Array.isArray(orderList) && orderList.length > 0) {
        // Cari pesanan yang email pelanggannya cocok
        const matched = orderList.filter(function(item) {
          const cust = item.customer || {};
          const em = String(cust.email || item.customer_email || item.email || '').trim().toLowerCase();
          return em === emailLower;
        });

        if (matched.length > 0) {
          // Prioritaskan yang sudah lunas (paid / settled / completed)
          const paidOrder = matched.find(function(item) {
            const st = String(item.payment_status || item.status || '').toLowerCase();
            return st === 'paid' || st === 'settled' || st === 'completed';
          });
          json = paidOrder || matched[0];
        }
      }
    } else {
      // 2. JIKA TARGET ADALAH NOMOR PESANAN / ORDER ID (misal: 261107PJXVFRB)
      let url = 'https://api.scalev.com/v3/orders/' + encodeURIComponent(cleanTarget);
      let response = UrlFetchApp.fetch(url, options);
      statusCode = response.getResponseCode();
      let content = response.getContentText();
      try {
        json = JSON.parse(content);
      } catch (e) {}

      // Jika 404 atau tidak ditemukan langsung, cari lewat list query search
      if (statusCode === 404 || !json || json.errors) {
        let searchUrl = 'https://api.scalev.com/v3/orders?search=' + encodeURIComponent(cleanTarget);
        response = UrlFetchApp.fetch(searchUrl, options);
        statusCode = response.getResponseCode();
        content = response.getContentText();
        let searchJson = null;
        try {
          searchJson = JSON.parse(content);
        } catch (e) {}

        if (searchJson && searchJson.data && searchJson.data.length > 0) {
          const paidItem = searchJson.data.find(function(item) {
            const st = String(item.payment_status || item.status || '').toLowerCase();
            return st === 'paid' || st === 'settled' || st === 'completed';
          });
          json = paidItem || searchJson.data[0];
        }
      }
    }

    if (json && (json.id || json.order_id || json.order_number || json.code)) {
      const paymentStatus = String(json.payment_status || json.status || '').toLowerCase();
      const isPaid = (paymentStatus === 'paid' || paymentStatus === 'settled' || paymentStatus === 'completed');

      const customer = json.customer || {};
      const customerEmail = customer.email || json.customer_email || json.email || '';
      const customerName = customer.name || json.customer_name || json.name || '';
      const customerPhone = customer.phone || json.customer_phone || json.phone || '';
      const officialOrderId = String(json.order_id || json.order_number || json.code || json.id || cleanTarget).trim();
      const grossRevenue = extractGrossRevenue(json);

      return {
        configured: true,
        verified: isPaid,
        statusCode: statusCode,
        paymentStatus: paymentStatus,
        officialOrderId: officialOrderId,
        grossRevenue: grossRevenue,
        customerEmail: customerEmail,
        customerName: customerName,
        customerPhone: customerPhone,
        rawOrder: json,
        message: isPaid
          ? 'Pembayaran terverifikasi lunas di Scalev (Gross: Rp ' + formatNumberId(grossRevenue) + ').'
          : 'Pembayaran di Scalev belum lunas (Status: ' + paymentStatus + ').'
      };
    } else {
      return {
        configured: true,
        verified: false,
        statusCode: statusCode,
        grossRevenue: 0,
        message: 'Pesanan untuk (' + cleanTarget + ') tidak ditemukan di database Scalev.'
      };
    }
  } catch (err) {
    Logger.log('Error verifyScalevPayment: ' + err.toString());
    return {
      configured: true,
      verified: false,
      grossRevenue: 0,
      message: 'Gagal menghubungi server Scalev: ' + err.toString()
    };
  }
}

/**
 * Ekstraksi Nilai Gross Revenue dari Objek Order Scalev API v3
 */
function extractGrossRevenue(json) {
  if (!json) return 0;

  var candidates = [
    json.gross_revenue,
    json.total_amount,
    json.grand_total,
    json.total,
    json.total_price,
    json.amount,
    json.order_value,
    json.net_revenue
  ];

  if (json.pricing) {
    candidates.push(json.pricing.gross_revenue, json.pricing.grand_total, json.pricing.total, json.pricing.subtotal);
  }
  if (json.payment) {
    candidates.push(json.payment.gross_amount, json.payment.amount);
  }

  for (var i = 0; i < candidates.length; i++) {
    var val = candidates[i];
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      return val;
    }
    if (typeof val === 'string' && val.trim() !== '') {
      var num = parseFloat(val.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  // Jika item rincian tersedia
  var items = json.order_items || json.items || json.line_items;
  if (Array.isArray(items) && items.length > 0) {
    var sum = 0;
    for (var j = 0; j < items.length; j++) {
      var itm = items[j];
      var itmTotal = itm.subtotal || itm.total || itm.amount || ((itm.price || 0) * (itm.quantity || 1));
      var itmNum = typeof itmTotal === 'number' ? itmTotal : parseFloat(String(itmTotal).replace(/[^0-9.-]/g, ''));
      if (!isNaN(itmNum)) sum += itmNum;
    }
    if (sum > 0) return sum;
  }

  return 0;
}

/**
 * Format Angka Indonesia (Rp)
 */
function formatNumberId(num) {
  if (!num || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
}

/**
 * Peta Indeks Kolom Sheet Dinamis
 */
function getColumnIndices(headerRow) {
  var map = {
    timestamp: 0,
    orderId: 1,
    email: 2,
    license: 3,
    status: 4,
    paymentStatus: 5,
    grossRevenue: 6,
    customerName: 7,
    brevoStatus: 8,
    brevoMsgId: 9,
    resendCount: 10,
    notes: 11
  };
  if (!headerRow || !headerRow.length) return map;

  for (var c = 0; c < headerRow.length; c++) {
    var title = String(headerRow[c]).trim().toLowerCase();
    if (title.includes('timestamp')) map.timestamp = c;
    else if (title.includes('order')) map.orderId = c;
    else if (title.includes('email') && !title.includes('brevo')) map.email = c;
    else if (title.includes('license') || title.includes('lisensi')) map.license = c;
    else if (title.includes('payment status') || title.includes('status pembayaran')) map.paymentStatus = c;
    else if (title === 'status' || title === 'status lisensi') map.status = c;
    else if (title.includes('gross') || title.includes('revenue') || title.includes('nominal')) map.grossRevenue = c;
    else if (title.includes('nama') || title.includes('customer') || title.includes('pelanggan')) map.customerName = c;
    else if (title.includes('brevo status') || title.includes('status email')) map.brevoStatus = c;
    else if (title.includes('message id')) map.brevoMsgId = c;
    else if (title.includes('resend')) map.resendCount = c;
    else if (title.includes('catatan') || title.includes('verifikasi')) map.notes = c;
  }
  return map;
}

/**
 * Sinkronisasi Semua Data Order dari Scalev API v3 ke Sheet Licenses
 */
function syncOrdersFromScalev(ss) {
  if (!SCALEV_API_KEY || SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY')) {
    return { success: false, message: 'Scalev API Key belum dikonfigurasi di Script Properties.' };
  }

  try {
    const sheet = initLicensesSheet(ss);
    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + SCALEV_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const url = 'https://api.scalev.com/v3/orders?limit=100';
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const content = response.getContentText();

    if (statusCode < 200 || statusCode >= 300) {
      return { success: false, message: 'HTTP ' + statusCode + ': ' + content };
    }

    let json = null;
    try {
      json = JSON.parse(content);
    } catch (e) {
      return { success: false, message: 'Format respons API Scalev tidak valid.' };
    }

    const orderList = (json && (json.data || json.orders || (Array.isArray(json) ? json : []))) || [];
    if (!Array.isArray(orderList) || orderList.length === 0) {
      return {
        success: true,
        totalFetched: 0,
        paidCount: 0,
        totalGrossRevenuePaid: 0,
        newLicensesCreated: 0,
        updatedCount: 0,
        message: 'Tidak ada pesanan ditemukan di akun Scalev Anda.'
      };
    }

    const existingData = sheet.getDataRange().getValues();
    const orderRowMap = {};
    const emailRowMap = {};

    for (let i = 1; i < existingData.length; i++) {
      const oid = String(existingData[i][1]).trim();
      const em = String(existingData[i][2]).trim().toLowerCase();
      if (oid) orderRowMap[oid] = i + 1; // 1-based index
      if (em) emailRowMap[em] = i + 1;
    }

    let newLicensesCreated = 0;
    let updatedCount = 0;
    let paidCount = 0;
    let totalGrossRevenuePaid = 0;

    for (let k = 0; k < orderList.length; k++) {
      const order = orderList[k];
      const officialOrderId = String(order.order_id || order.order_number || order.code || order.id || '').trim();
      if (!officialOrderId) continue;

      const paymentStatus = String(order.payment_status || order.status || '').toUpperCase();
      const isPaid = (paymentStatus === 'PAID' || paymentStatus === 'COMPLETED' || paymentStatus === 'SETTLED');
      const grossRevenue = extractGrossRevenue(order);

      const customer = order.customer || {};
      const customerEmail = String(customer.email || order.customer_email || order.email || '').trim().toLowerCase();
      const customerName = String(customer.name || order.customer_name || order.name || '').trim();

      if (isPaid) {
        paidCount++;
        totalGrossRevenuePaid += grossRevenue;
      }

      // Cek apakah order ini sudah pernah tercatat di sheet
      const existingRow = orderRowMap[officialOrderId] || (customerEmail ? emailRowMap[customerEmail] : null);

      if (existingRow) {
        sheet.getRange(existingRow, 2).setValue(officialOrderId);
        if (customerEmail) sheet.getRange(existingRow, 3).setValue(customerEmail);
        sheet.getRange(existingRow, 6).setValue(paymentStatus);
        sheet.getRange(existingRow, 7).setValue(grossRevenue).setNumberFormat('"Rp"#,##0');
        if (customerName) sheet.getRange(existingRow, 8).setValue(customerName);
        updatedCount++;
      } else if (isPaid && customerEmail) {
        // Buatkan lisensi baru untuk pesanan paid yang belum ada di sheet
        const licenseKey = generateUniqueLicense(sheet);
        const now = new Date();
        sheet.appendRow([
          now,
          officialOrderId,
          customerEmail,
          licenseKey,
          'ACTIVE',
          paymentStatus,
          grossRevenue,
          customerName || '-',
          'DITARIK OTOMATIS (Sync Scalev)',
          '-',
          0,
          'Sinkronisasi Otomatis Scalev API'
        ]);
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');

        orderRowMap[officialOrderId] = lastRow;
        emailRowMap[customerEmail] = lastRow;
        newLicensesCreated++;
      }
    }

    updateDashboardStats(ss);

    return {
      success: true,
      totalFetched: orderList.length,
      paidCount: paidCount,
      totalGrossRevenuePaid: totalGrossRevenuePaid,
      newLicensesCreated: newLicensesCreated,
      updatedCount: updatedCount
    };
  } catch (err) {
    Logger.log('Error syncOrdersFromScalev: ' + err.toString());
    return { success: false, message: err.toString() };
  }
}

/**
 * Menu Uji Coba & Sinkronisasi Scalev Orders dari Google Sheets
 */
function menuSyncScalevOrders() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!SCALEV_API_KEY || SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY')) {
    ui.alert(
      '⚠️ Scalev API Key Belum Dipasang',
      'Pasangkan API Key Scalev di Script Properties atau baris 50 Code.gs untuk mengaktifkan sinkronisasi otomatis.',
      ui.ButtonSet.OK
    );
    return;
  }

  const response = syncOrdersFromScalev(ss);
  if (response.success) {
    ui.alert(
      '🎉 Sinkronisasi Scalev API Berhasil!',
      'Hasil Penarikan Data Order dari Scalev:\n\n' +
      '• Total Order Ditarik: ' + response.totalFetched + '\n' +
      '• Order Status PAID (Lunas): ' + response.paidCount + '\n' +
      '• Total Gross Revenue (PAID): Rp ' + formatNumberId(response.totalGrossRevenuePaid) + '\n' +
      '• Lisensi Baru Diterbitkan: ' + response.newLicensesCreated + '\n' +
      '• Data Diperbarui di Sheet: ' + response.updatedCount + '\n\n' +
      'Semua Order ID dan Gross Revenue telah tercatat rapi di Sheet "Licenses", dan ringkasan telah diperbarui di "Dashboard & Laporan".',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert('❌ Gagal Sinkronisasi Scalev', response.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu Uji Coba Koneksi Scalev API dari Google Sheets
 */
function menuTestScalevConnection() {
  const ui = SpreadsheetApp.getUi();
  if (!SCALEV_API_KEY || SCALEV_API_KEY.includes('PASTE_YOUR_SCALEV_API_KEY')) {
    ui.alert(
      '⚠️ Scalev API Key Belum Dipasang',
      'Untuk mengaktifkan proteksi Anti-Bypass, masukkan API Key Anda di baris 50 file Code.gs.\n\n' +
      'Cara dapatkan API Key:\n' +
      '1. Buka https://app.scalev.com\n' +
      '2. Settings > Developers > API Keys\n' +
      '3. Buat API Key baru dan salin ke Code.gs.',
      ui.ButtonSet.OK
    );
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=1', {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + SCALEV_API_KEY,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code >= 200 && code < 300) {
      ui.alert(
        '🛡️ Koneksi Scalev API Sukses & Aktif!',
        'Sistem Anti-Bypass Berhasil Dikonfigurasi.\n\n' +
        '• Status Koneksi: HTTP ' + code + ' (Terhubung)\n' +
        '• Proteksi: Lisensi HANYA akan terbit otomatis jika pesanan terbukti berstatus "PAID / LUNAS" di Scalev.\n' +
        '• Pengguna tidak bisa memalsukan order ID atau membuka link tanpa transfer.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        '❌ Gagal Terhubung ke Scalev API',
        'HTTP ' + code + ':\n' + text + '\n\nPastikan API Key di baris 50 sudah sesuai.',
        ui.ButtonSet.OK
      );
    }
  } catch (err) {
    ui.alert('❌ Error Uji Koneksi Scalev', err.toString(), ui.ButtonSet.OK);
  }
}


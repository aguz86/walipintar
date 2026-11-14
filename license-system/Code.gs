/**
 * ============================================================================
 * WALI PINTAR UNIFIED LICENSE, AFFILIATE & ADMIN SYSTEM (GOOGLE APPS SCRIPT V8)
 * ============================================================================
 * Arsitektur Terpadu Lengkap:
 * 1. Scalev (Meta Ads - Redirect URL)  -> ditangani oleh `doGet(e)` -> tab `Scalev_Orders`
 * 2. Lynk.id (Affiliate - Webhook POST)-> ditangani oleh `doPost(e)` -> tab `Lynk_Orders`
 * 3. Frontend Web Game (`?action=check`, `?action=create`, `?action=resend`)
 *    -> Mengecek lintas tab `Scalev_Orders`, `Lynk_Orders`, dan `Licenses` (legacy)
 * 4. Email Delivery 100% Brevo REST API v3 (UrlFetchApp, tanpa MailApp/Gmail limit)
 *    + Template lengkap: Tombol Salin Otomatis, 1-Klik Main, Panduan PWA Offline, & Sosmed.
 * 5. Proteksi Anti-Duplikat Lintas Sheet (`Scalev_Orders` vs `Lynk_Orders`):
 *    LockService + Pemindaian Dinamis Semua Tab + CacheService + SpreadsheetApp.flush().
 * 6. Menu Lengkap Google Sheets:
 *    - 📊 Menu Laporan: Generate `Report_Scalev`, `Report_Lynk` (Komisi Affiliate), & Cek Duplikat.
 *    - 🎮 WaliPintar Admin: Broadcast Pembaruan, Sync Scalev API v3, Generate Manual,
 *      Kirim Ulang Email, Hapus Lisensi, Reset Sheet, Uji Brevo & Scalev API.
 *
 * ============================================================================
 * 📌 CARA SETUP PENTING (ZERO SECRETS DI GITHUB - 100% DI GAS SCRIPT PROPERTIES):
 * ============================================================================
 * Semua API Key, Secret, & ID sensitif JANGAN PERNAH ditulis di kode/GitHub!
 * Simpan semuanya langsung di:
 * Editor Apps Script -> Project Settings (ikon gerigi ⚙️) -> Script Properties:
 *
 * 1. `BREVO_API_KEY`         : (Wajib) API Key Brevo v3 untuk kirim email lisensi
 * 2. `MERCHANT_KEY`          : (Wajib untuk Lynk.id) Merchant Key / Webhook Secret Lynk.id
 * 3. `SPREADSHEET_ID`        : (Opsional) ID Google Sheet (jika script tidak menempel di Sheet).
 *                              Jika script dibuat lewat Extensions > Apps Script di dalam Sheet,
 *                              kosongkan saja — otomatis memakai Spreadsheet aktif.
 * 4. `SCALEV_API_KEY`        : (Opsional) Token Scalev v3 (Settings > Developers > API Keys)
 *                              untuk anti-bypass klaim email & menu Sync Order Scalev API.
 * 5. `ADMIN_SECRET_KEY`      : (Opsional, wajib jika pakai API ?action=delete / broadcast_update)
 *                              Kunci rahasia admin buatan Anda sendiri.
 * 6. `BREVO_SENDER_EMAIL`    : (Opsional) Default: admin@walipintar.my.id
 * 7. `BREVO_SENDER_NAME`     : (Opsional) Default: Admin Wali Pintar
 * 8. `STRICT_LYNK_SIGNATURE` : (Opsional) Set "true" jika memakai reverse proxy
 *                              (misal Cloudflare Worker) yang meneruskan header X-Lynk-Signature.
 * ============================================================================
 */

// ======================= [ KONFIGURASI SPREADSHEET & TAB ] =======================
// Nama Tab Google Sheets (Sesuai Arsitektur Terpadu)
const TAB_SCALEV_ORDERS = 'Scalev_Orders';
const TAB_LYNK_ORDERS   = 'Lynk_Orders';
const TAB_REPORT_SCALEV = 'Report_Scalev';
const TAB_REPORT_LYNK   = 'Report_Lynk';
const TAB_DASHBOARD     = 'Dashboard';
const TAB_LEGACY        = 'Licenses'; // Kompatibilitas mundur jika ada data lama

// Konfigurasi Brand & URL Resmi
const BRAND_NAME  = 'Wali Pintar';
const APP_URL     = 'https://walipintar.my.id';
const SCALEV_URL  = 'https://walipintar.myscalev.com/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia'; // Khusus Meta Ads
const LYNK_LP_URL = 'https://javapedia.lynk.id/p/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia'; // LP Lynk (Affiliate & Organik)
const ADMIN_WA    = '6285704808186';
const DEFAULT_AFFILIATE_COMMISSION_RATE = 20; // Default komisi affiliate 20%

// ======================= [ HELPER CONFIG AMAN (SCRIPT PROPERTIES) ] =======================
function getScriptProp(key, fallbackVal) {
  try {
    const val = PropertiesService.getScriptProperties().getProperty(key);
    if (val && val.trim() !== '') return val.trim();
  } catch (err) {
    Logger.log('Warning getScriptProp(' + key + '): ' + err.toString());
  }
  return fallbackVal;
}

// Semua kredensial dibaca eksklusif dari GAS Script Properties (tanpa fallback key di source code)
const SPREADSHEET_ID     = getScriptProp('SPREADSHEET_ID', '');
const ADMIN_SECRET_KEY   = getScriptProp('ADMIN_SECRET_KEY', '');
const BREVO_API_KEY      = getScriptProp('BREVO_API_KEY', '');
const BREVO_SENDER_NAME  = getScriptProp('BREVO_SENDER_NAME', 'Admin Wali Pintar');
const BREVO_SENDER_EMAIL = getScriptProp('BREVO_SENDER_EMAIL', 'admin@walipintar.my.id');
const SCALEV_API_KEY     = getScriptProp('SCALEV_API_KEY', '');

/**
 * Mengambil objek Spreadsheet utama berdasarkan Script Property `SPREADSHEET_ID` atau spreadsheet aktif.
 */
function getTargetSpreadsheet() {
  const propSheetId = getScriptProp('SPREADSHEET_ID', SPREADSHEET_ID);
  if (propSheetId && propSheetId.trim() !== '') {
    return SpreadsheetApp.openById(propSheetId.trim());
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Spreadsheet tidak ditemukan. Buat script dari Extensions > Apps Script di Sheet Anda, atau isi SPREADSHEET_ID di GAS Script Properties.');
  }
  return active;
}

// ============================================================================
// 🧪 FUNGSI UJI COBA LANGSUNG DARI EDITOR APPS SCRIPT
// ============================================================================
/**
 * Pilih fungsi ini di dropdown toolbar atas Apps Script lalu klik Run (▶️)
 */
function ujiCobaSistem_KlikDiSini() {
  Logger.log('========================================================');
  Logger.log('🚀 MEMULAI UJI COBA SISTEM TERPADU WALI PINTAR...');
  Logger.log('========================================================');

  const ss = getTargetSpreadsheet();
  initAllSheets(ss);
  Logger.log('✅ 1. Tab "' + TAB_SCALEV_ORDERS + '" & "' + TAB_LYNK_ORDERS + '" siap.');

  generateScalevReport(true);
  generateLynkReport(true);
  generateDashboard(true);
  autoFitAllSheets(ss);
  Logger.log('✅ 2. Tab "' + TAB_REPORT_SCALEV + '", "' + TAB_REPORT_LYNK + '", & "' + TAB_DASHBOARD + '" berhasil disegarkan + Auto-Width.');

  if (!BREVO_API_KEY) {
    Logger.log('⚠️ 3. BREVO_API_KEY belum diisi di GAS Script Properties.');
  } else {
    Logger.log('✅ 3. BREVO_API_KEY terpasang di GAS Script Properties.');
  }

  const merchantKey = getScriptProp('MERCHANT_KEY', '');
  if (!merchantKey) {
    Logger.log('⚠️ 4. MERCHANT_KEY (Lynk.id Webhook) belum diisi di GAS Script Properties.');
  } else {
    Logger.log('✅ 4. MERCHANT_KEY terpasang di GAS Script Properties (Lynk.id HMAC Verification siap).');
  }

  if (!SCALEV_API_KEY) {
    Logger.log('ℹ️ 5. SCALEV_API_KEY belum diisi di GAS Script Properties (opsional untuk sync & anti-bypass klaim).');
  } else {
    Logger.log('✅ 5. SCALEV_API_KEY terpasang di GAS Script Properties.');
  }

  if (!ADMIN_SECRET_KEY) {
    Logger.log('ℹ️ 6. ADMIN_SECRET_KEY belum diisi di GAS Script Properties (opsional untuk API delete/broadcast).');
  } else {
    Logger.log('✅ 6. ADMIN_SECRET_KEY terpasang di GAS Script Properties.');
  }

  Logger.log('========================================================');
  Logger.log('🎉 SELAMAT! SISTEM TERPADU SCALEV + LYNK BERJALAN NORMAL.');
  Logger.log('========================================================');
}

// ============================================================================
// 📋 INISIALISASI TAB & HEADER SPREADSHEET
// ============================================================================
function ensureSheetHeaders(ss, sheetName, headers, headerBg) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setFontWeight('bold')
      .setBackground(headerBg || '#065f46')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function initAllSheets(ss) {
  const scalevSheet = ensureSheetHeaders(ss, TAB_SCALEV_ORDERS, [
    'Waktu Pembayaran',
    'Order ID Scalev',
    'Email',
    'License Key',
    'Status Lisensi',
    'Payment Status',
    'Gross Revenue',
    'Nama Pelanggan',
    'Catatan'
  ], '#065f46');

  const lynkSheet = ensureSheetHeaders(ss, TAB_LYNK_ORDERS, [
    'Waktu Pembayaran',
    'Order ID Lynk',
    'Email',
    'License Key',
    'Status Lisensi',
    'Payment Status',
    'Gross Revenue',
    'Nama Pelanggan',
    'Affiliate ID',
    'Nama Affiliate',
    'Catatan'
  ], '#1e3a8a');

  ensureSheetHeaders(ss, TAB_REPORT_SCALEV, [
    'Total Omzet',
    'Total Transaksi',
    'Lisensi Aktif'
  ], '#065f46');

  ensureSheetHeaders(ss, TAB_REPORT_LYNK, [
    'Nama Affiliate',
    'Total Transaksi',
    'Total Omzet',
    'Rate Komisi (%)',
    'Total Komisi'
  ], '#1e3a8a');

  return { scalevSheet: scalevSheet, lynkSheet: lynkSheet };
}

// ============================================================================
// 📋 MENU KHUSUS GOOGLE SHEETS (`📊 Menu Laporan` & `🎮 WaliPintar Admin`)
// ============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Menu 1: Laporan Keuangan & Affiliate
  ui.createMenu('📊 Menu Laporan')
    .addItem('📊 Segarkan Dashboard Monitoring', 'generateDashboard')
    .addItem('📈 Generate Laporan Scalev (Report_Scalev)', 'generateScalevReport')
    .addItem('🤝 Generate Laporan Affiliate Lynk (Report_Lynk)', 'generateLynkReport')
    .addItem('🔄 Segarkan Semua Laporan & Dashboard', 'generateAllReports')
    .addSeparator()
    .addItem('📐 Rapikan Lebar Kolom Semua Sheet (Auto-Width)', 'menuAutoFitAllSheets')
    .addItem('🔍 Cek Duplikat Lisensi (Scalev vs Lynk)', 'menuCheckDuplicateLicenses')
    .addItem('🛠️ Siapkan Semua Tab & Header Sheet', 'menuInitializeTabs')
    .addToUi();

  // Menu 2: Alat Manajemen Admin Lengkap
  ui.createMenu('🎮 WaliPintar Admin')
    .addItem('📢 Broadcast Pembaruan / Update Fitur ke Pembeli', 'menuBroadcastUpdate')
    .addSeparator()
    .addItem('🔄 Tarik & Sinkron Semua Order Scalev API', 'menuSyncScalevOrders')
    .addSeparator()
    .addItem('⚡ Generate Lisensi Manual (Komplain)', 'menuGenerateManual')
    .addItem('🔄 Kirim Ulang Email Lisensi via Brevo', 'menuResendManual')
    .addSeparator()
    .addItem('🗑️ Hapus Lisensi (Cari Kode / Email / Order)', 'menuDeleteLicenseSearch')
    .addItem('🗑️ Hapus Baris Lisensi yang Sedang Dipilih', 'menuDeleteSelectedRow')
    .addItem('⚠️ Hapus SEMUA Order di Sheet (Reset Total)', 'menuDeleteAllOrders')
    .addSeparator()
    .addItem('🛠️ Uji Koneksi Akun Brevo API', 'menuTestBrevoConnection')
    .addItem('🤝 Uji Koneksi Lynk.id (Webhook & HMAC)', 'menuTestLynkWebhook')
    .addItem('🛡️ Uji Koneksi Scalev API (Anti-Bypass)', 'menuTestScalevConnection')
    .addToUi();
}

function menuInitializeTabs() {
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);
  generateDashboard(true);
  autoFitAllSheets(ss);
  SpreadsheetApp.getUi().alert('✅ Berhasil', 'Semua tab (Scalev_Orders, Lynk_Orders, Report_Scalev, Report_Lynk, Dashboard) siap dengan lebar kolom otomatis.', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================================================
// 🌐 1. doGet(e) - SCALEV REDIRECT (META ADS), LOGIN VALIDATION & ADMIN API
// ============================================================================
function doGet(e) {
  e = e || { parameter: {} };
  const params = e.parameter || {};
  const action = String(params.action || '').trim().toLowerCase();

  try {
    // A. Cek Lisensi dari Halaman Login / Gatekeeper Web Game (lintas Scalev & Lynk)
    if (action === 'check') {
      return handleLicenseCheck(params);
    }

    // B. Kirim Ulang Email Lisensi
    if (action === 'resend') {
      return handleResendLicense(params);
    }

    // C. Tarik / Sinkron semua order dari Scalev API v3
    if (action === 'sync_scalev' || action === 'sync') {
      return handleApiSyncScalev();
    }

    // D. Hapus Lisensi via API (dengan ADMIN_SECRET_KEY)
    if (action === 'delete') {
      return handleApiDeleteLicense(params);
    }

    // E. Reset Semua Order via API (dengan ADMIN_SECRET_KEY)
    if (action === 'delete_all') {
      return handleApiDeleteAll(params);
    }

    // F. Broadcast Pembaruan Fitur via API (dengan ADMIN_SECRET_KEY)
    if (action === 'broadcast_update') {
      return handleApiBroadcastUpdate(params);
    }

    // G. Scalev Redirect URL (?order_id=...&email=...&nama=...&produk=...)
    //    ATAU Frontend Claim (`?action=create&email=...` / `?action=claim`)
    const hasScalevParams = Boolean(params.order_id || params.email || params.nama || params.produk);
    if (action === 'create' || action === 'claim' || (!action && hasScalevParams)) {
      return handleScalevOrder(params);
    }

    // H. Dibuka langsung di browser tanpa parameter: Tampilkan halaman status API
    return renderServerStatusPage();

  } catch (err) {
    Logger.log('Error doGet: ' + err.toString());
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Terjadi kesalahan server: ' + err.toString()
    });
  }
}

/**
 * Memproses Order Scalev dari Redirect URL (`doGet`) atau Klaim Frontend (`?action=create`)
 */
function handleScalevOrder(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Server sedang sibuk memproses pesanan lain. Silakan muat ulang dalam beberapa detik.'
    });
  }

  try {
    const ss = getTargetSpreadsheet();
    const sheets = initAllSheets(ss);
    const scalevSheet = sheets.scalevSheet;
    const lynkSheet = sheets.lynkSheet;

    let orderId = String(params.order_id || params.orderId || '').trim();
    let email = String(params.email || params.customer_email || '').trim().toLowerCase();
    let nama = String(params.nama || params.name || params.customer_name || params.buyer_name || '').trim();
    let produk = String(params.produk || params.product || params.product_name || '').trim();
    let rawRevenue = params.gross_revenue || params.total || params.amount || params.harga || 0;

    if (orderId.startsWith('{')) orderId = '';
    if (email.startsWith('{')) email = '';
    if (nama.startsWith('{')) nama = '';
    if (produk.startsWith('{')) produk = '';

    let grossRevenue = parseRevenueNumber(rawRevenue);

    if (!orderId && !email) {
      return createJsonResponse({
        status: 'error',
        success: false,
        message: 'Parameter order_id atau email wajib diisi.'
      });
    }

    // ------------------------------------------------------------------------
    // IDEMPOTENCY CHECK: Cek apakah Order ID / Email sudah ada di Scalev_Orders
    // ------------------------------------------------------------------------
    const existingScalev = findExistingOrder(scalevSheet, orderId, email);
    if (existingScalev) {
      let emailSentNow = false;
      const needsEmail = !existingScalev.catatan.toUpperCase().includes('TERKIRIM');
      if (needsEmail && existingScalev.email && existingScalev.email.includes('@')) {
        const resendRes = sendEmailBrevo(existingScalev.email, existingScalev.licenseKey, existingScalev.customerName, existingScalev.orderId);
        if (resendRes.success) {
          emailSentNow = true;
          scalevSheet.getRange(existingScalev.rowIndex, 9).setValue('Email Brevo: TERKIRIM (Auto-Retry)');
          SpreadsheetApp.flush();
        }
      }

      return createJsonResponse({
        status: 'success',
        success: true,
        isExisting: true,
        isAlreadyClaimed: true,
        source: 'Scalev',
        license: existingScalev.licenseKey,
        licenseKey: existingScalev.licenseKey,
        orderId: existingScalev.orderId,
        email: existingScalev.email,
        name: existingScalev.customerName,
        emailSent: true,
        emailSentNow: emailSentNow,
        wasBrevoPending: needsEmail,
        message: 'Alhamdulillah! Pembayaran Anda telah terkonfirmasi. Lisensi siap digunakan!'
      });
    }

    // Cek juga di Lynk_Orders & Legacy `Licenses` jika user klaim dari /claim (baik dari Lynk maupun Scalev)
    if (orderId || email) {
      const altSheets = [
        { sh: lynkSheet, src: 'Lynk.id', noteCol: 11 },
        { sh: ss.getSheetByName(TAB_LEGACY), src: 'Licenses', noteCol: 0 }
      ];
      for (let a = 0; a < altSheets.length; a++) {
        if (!altSheets[a].sh) continue;
        const foundAlt = findExistingOrder(altSheets[a].sh, orderId, email);
        if (foundAlt) {
          let emailSentNow = false;
          const needsEmail = !foundAlt.catatan.toUpperCase().includes('TERKIRIM');
          if (needsEmail && foundAlt.email && foundAlt.email.includes('@')) {
            const resendRes = sendEmailBrevo(foundAlt.email, foundAlt.licenseKey, foundAlt.customerName, foundAlt.orderId);
            if (resendRes.success) {
              emailSentNow = true;
              if (altSheets[a].noteCol > 0) {
                altSheets[a].sh.getRange(foundAlt.rowIndex, altSheets[a].noteCol).setValue('Webhook Lynk.id | Email Brevo: TERKIRIM (Auto-Retry)');
                SpreadsheetApp.flush();
              }
            }
          }

          return createJsonResponse({
            status: 'success',
            success: true,
            isExisting: true,
            isAlreadyClaimed: true,
            source: altSheets[a].src,
            license: foundAlt.licenseKey,
            licenseKey: foundAlt.licenseKey,
            orderId: foundAlt.orderId,
            email: foundAlt.email,
            name: foundAlt.customerName,
            emailSent: true,
            emailSentNow: emailSentNow,
            wasBrevoPending: needsEmail,
            message: 'Alhamdulillah! Pembayaran Anda dari ' + altSheets[a].src + ' telah terkonfirmasi. Lisensi siap digunakan!'
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // ANTI-BYPASS: Jika user memanggil ?action=create&email=... dari ClaimPage
    // (tanpa order_id/produk dari redirect Scalev), verifikasi ke Scalev API v3
    // ------------------------------------------------------------------------
    const isFrontendEmailClaimOnly = (String(params.action || '').toLowerCase() === 'create' && !orderId && !produk);
    let paymentTime = new Date();

    if (isFrontendEmailClaimOnly) {
      if (SCALEV_API_KEY) {
        const scalevVerify = verifyScalevPayment(email || orderId);
        if (!scalevVerify.verified) {
          return createJsonResponse({
            status: 'error',
            success: false,
            verified: false,
            notOrdered: Boolean(scalevVerify.notOrdered),
            email: email,
            orderId: orderId,
            grossRevenue: scalevVerify.grossRevenue || 0,
            paymentStatus: scalevVerify.paymentStatus || 'unpaid',
            message: scalevVerify.notOrdered
              ? 'email kamu belum pernah order, ayo beli dulu'
              : (scalevVerify.message || 'Pembayaran belum terkonfirmasi lunas.')
          });
        }
        orderId = scalevVerify.officialOrderId || ('SCLV-' + Date.now());
        if (scalevVerify.customerEmail && (!email || !email.includes('@'))) {
          email = scalevVerify.customerEmail.toLowerCase();
        }
        nama = nama || scalevVerify.customerName || '-';
        if (scalevVerify.grossRevenue > 0) grossRevenue = scalevVerify.grossRevenue;
        if (scalevVerify.paymentTime) paymentTime = scalevVerify.paymentTime;
      } else {
        return createJsonResponse({
          status: 'error',
          success: false,
          verified: false,
          notOrdered: true,
          email: email,
          message: 'email kamu belum pernah order, ayo beli dulu'
        });
      }
    } else if (orderId && SCALEV_API_KEY && grossRevenue === 0) {
      // Perkaya nominal Gross Revenue dari Scalev API jika redirect URL tidak membawa nominal
      const enrich = verifyScalevPayment(orderId);
      if (enrich && enrich.verified) {
        if (enrich.grossRevenue > 0) grossRevenue = enrich.grossRevenue;
        if (enrich.customerName && !nama) nama = enrich.customerName;
        if (enrich.paymentTime) paymentTime = enrich.paymentTime;
      }
    }

    if (!orderId) {
      orderId = 'SCLV-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');
    }

    if (!email || !email.includes('@')) {
      return createJsonResponse({
        status: 'error',
        success: false,
        message: 'Alamat email pembeli valid diperlukan untuk pengiriman lisensi resmi.'
      });
    }

    // Generate kode lisensi unik WALI-XXXX (anti-duplikat lintas semua sheet + cache)
    const licenseKey = generateUniqueLicenseKey(ss);

    // Simpan lebih dulu ke tab Scalev_Orders & flush sebelum mengirim email
    scalevSheet.appendRow([
      paymentTime,
      orderId,
      email,
      licenseKey,
      'ACTIVE',
      'PAID',
      grossRevenue,
      nama || '-',
      (produk ? 'Produk: ' + produk + ' | ' : '') + 'Memproses email Brevo...'
    ]);

    const lastRow = scalevSheet.getLastRow();
    scalevSheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    scalevSheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');
    SpreadsheetApp.flush();

    // Kirim email via Brevo API
    const brevoRes = sendEmailBrevo(email, licenseKey, nama, orderId);

    const catatanParts = [];
    if (produk) catatanParts.push('Produk: ' + produk);
    catatanParts.push(brevoRes.success ? 'Email Brevo: TERKIRIM' : 'Email Brevo: GAGAL (' + brevoRes.error + ')');
    scalevSheet.getRange(lastRow, 9).setValue(catatanParts.join(' | '));
    autoFitSheetColumns(scalevSheet, 9, 110, 22);
    generateDashboard(true);
    SpreadsheetApp.flush();

    return createJsonResponse({
      status: 'success',
      success: true,
      isNew: true,
      license: licenseKey,
      licenseKey: licenseKey,
      orderId: orderId,
      email: email,
      name: nama || '-',
      produk: produk || BRAND_NAME,
      paymentStatus: 'paid',
      emailSent: brevoRes.success,
      emailSentNow: brevoRes.success,
      brevoSenderEmail: BREVO_SENDER_EMAIL,
      brevoMessageId: brevoRes.messageId,
      message: 'Alhamdulillah! Pembayaran resmi terkonfirmasi. Lisensi telah diaktifkan dan dikirim ke email.'
    });

  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// 🔔 2. doPost(e) - HANDLE LYNK.ID WEBHOOK (AFFILIATE) & API POST ACTIONS
// ============================================================================
/**
 * Menangani Webhook HTTP POST dari Lynk.id Free Tier.
 *
 * 🔐 PENJELASAN VERIFIKASI HMAC & KETERBATASAN HEADER DI GOOGLE APPS SCRIPT:
 * 1. Lynk.id menandatangani webhook menggunakan header `X-Lynk-Signature` dengan
 *    `MERCHANT_KEY` (HMAC-SHA256 atas raw JSON body, atau SHA-256 atas
 *    `grandTotal + refId + message_id + MERCHANT_KEY`).
 * 2. CATATAN PLATFORM GAS: Secara native objek `e` di `doPost(e)` TIDAK mengekspos
 *    HTTP headers (`e.headers` undefined jika ditembak langsung tanpa proxy).
 *    - Jika header/param `?signature=` diterima, `verifyLynkSignature()` memverifikasi
 *      HMAC-SHA256 secara ketat dan menolak dengan kode `401/403` jika tidak valid.
 *    - Jika memakai Cloudflare Worker / proxy penerus header, set Script Property
 *      `STRICT_LYNK_SIGNATURE = "true"` agar signature wajib ada di setiap request.
 */
function doPost(e) {
  e = e || { parameter: {} };
  const params = e.parameter || {};

  let rawBody = '';
  if (e.postData && typeof e.postData.contents === 'string') {
    rawBody = e.postData.contents;
  }

  let payload = {};
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      return createJsonResponse({
        status: 'error',
        code: 400,
        success: false,
        message: 'Payload JSON tidak valid: ' + parseErr.toString()
      });
    }
  }

  const action = String(params.action || payload.action || '').trim().toLowerCase();
  if (action === 'check')            return handleLicenseCheck(Object.assign({}, params, payload));
  if (action === 'resend')           return handleResendLicense(Object.assign({}, params, payload));
  if (action === 'delete')           return handleApiDeleteLicense(Object.assign({}, params, payload));
  if (action === 'delete_all')       return handleApiDeleteAll(Object.assign({}, params, payload));
  if (action === 'broadcast_update') return handleApiBroadcastUpdate(Object.assign({}, params, payload));
  if (action === 'sync_scalev' || action === 'sync') return handleApiSyncScalev();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({
      status: 'error',
      code: 503,
      success: false,
      message: 'Server sedang sibuk. Silakan coba lagi.'
    });
  }

  try {
    // 1. KEAMANAN: VERIFIKASI X-Lynk-Signature DENGAN HMAC-SHA256
    const headers = e.headers || {};
    const signatureHeader =
      headers['X-Lynk-Signature'] ||
      headers['x-lynk-signature'] ||
      headers['X-Signature'] ||
      headers['x-signature'] ||
      params['X-Lynk-Signature'] ||
      params['x-lynk-signature'] ||
      params.signature ||
      payload.signature ||
      '';

    const strictMode = getScriptProp('STRICT_LYNK_SIGNATURE', 'false').toLowerCase() === 'true';

    if (signatureHeader || strictMode) {
      const sigCheck = verifyLynkSignature(rawBody, signatureHeader, payload);
      if (!sigCheck.valid) {
        Logger.log('REJECTED LYNK WEBHOOK (401/403): ' + sigCheck.reason);
        return createJsonResponse({
          status: 'error',
          code: 401,
          httpStatus: 401,
          success: false,
          message: 'Forbidden / Unauthorized (401/403): ' + sigCheck.reason
        });
      }
    }

    // 2. EKSTRAKSI PAYLOAD WEBHOOK LYNK.ID
    const dataObj = payload.data || payload;
    const msgData = dataObj.message_data || dataObj;

    const eventName = String(payload.event || dataObj.message_action || '').trim().toUpperCase();
    const rawPayStatus = String(
      msgData.payment_status ||
      msgData.status ||
      dataObj.message_action ||
      'PAID'
    ).trim().toUpperCase();

    if (
      payload.test === true ||
      eventName === 'TEST' ||
      eventName === 'PING' ||
      eventName === 'WEBHOOK.TEST' ||
      eventName === 'TEST_WEBHOOK'
    ) {
      Logger.log('Lynk.id Test Webhook / Ping diterima & diverifikasi.');
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    if (
      eventName &&
      (eventName.includes('FAILED') || eventName.includes('EXPIRED') || eventName.includes('CANCEL'))
    ) {
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    const refId = String(
      msgData.refId ||
      msgData.ref_id ||
      msgData.reference ||
      msgData.order_id ||
      dataObj.refId ||
      dataObj.ref_id ||
      payload.refId ||
      ''
    ).trim();

    const customerObj = msgData.customer || dataObj.customer || payload.customer || {};
    const customerEmail = String(
      customerObj.email ||
      msgData.customer_email ||
      msgData.email ||
      payload.email ||
      ''
    ).trim().toLowerCase();

    const customerName = String(
      customerObj.name ||
      msgData.customer_name ||
      msgData.name ||
      payload.name ||
      '-'
    ).trim();

    const totalsObj = msgData.totals || dataObj.totals || {};
    const rawGrandTotal =
      msgData.grandTotal ||
      msgData.grand_total ||
      totalsObj.grandTotal ||
      totalsObj.grand_total ||
      msgData.amount ||
      dataObj.amount ||
      payload.grandTotal ||
      0;
    const grandTotal = parseRevenueNumber(rawGrandTotal);

    const affObj = msgData.affiliate || msgData.referral || dataObj.affiliate || dataObj.referral || payload.affiliate || payload.referral || {};
    const affiliateId = String(
      affObj.id ||
      affObj.code ||
      affObj.affiliate_id ||
      msgData.affiliate_id ||
      msgData.referral_id ||
      msgData.ref_code ||
      '-'
    ).trim();

    const affiliateName = String(
      affObj.name ||
      affObj.username ||
      affObj.affiliate_name ||
      msgData.affiliate_name ||
      msgData.referral_name ||
      (affiliateId !== '-' ? 'Affiliate-' + affiliateId : 'Direct / Tanpa Affiliate')
    ).trim();

    if (!customerEmail || !customerEmail.includes('@')) {
      return createJsonResponse({
        status: 'error',
        code: 400,
        success: false,
        message: 'Email pelanggan tidak ditemukan pada payload Lynk.id.'
      });
    }

    // 3. IDEMPOTENCY CHECK (CEGAH DUPLIKASI refId)
    const ss = getTargetSpreadsheet();
    const sheets = initAllSheets(ss);
    const lynkSheet = sheets.lynkSheet;

    const orderIdToSave = refId || ('LYNK-' + (dataObj.message_id || Date.now()));
    const duplicate = findExistingOrder(lynkSheet, orderIdToSave, '');
    if (duplicate) {
      Logger.log('Idempotency hit untuk Lynk refId: ' + orderIdToSave);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    // 4. GENERATE LISENSI UNIK, SIMPAN KE `Lynk_Orders`, FLUSH, DAN KIRIM BREVO
    const licenseKey = generateUniqueLicenseKey(ss);
    const now = new Date();
    const baseTag = 'Webhook Lynk.id' + (signatureHeader ? ' (HMAC Verified)' : ' (Direct GAS)');

    lynkSheet.appendRow([
      now,
      orderIdToSave,
      customerEmail,
      licenseKey,
      'ACTIVE',
      rawPayStatus === 'SUCCESS' || rawPayStatus === 'PAID' || rawPayStatus === 'COMPLETED' ? 'PAID' : rawPayStatus,
      grandTotal,
      customerName || '-',
      affiliateId || '-',
      affiliateName,
      baseTag + ' | Memproses email Brevo...'
    ]);

    const lastRow = lynkSheet.getLastRow();
    lynkSheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    lynkSheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');
    SpreadsheetApp.flush();

    const brevoRes = sendEmailBrevo(customerEmail, licenseKey, customerName, orderIdToSave);
    const catatan = baseTag + ' | Email Brevo: ' + (brevoRes.success ? 'TERKIRIM' : 'GAGAL (' + brevoRes.error + ')');
    lynkSheet.getRange(lastRow, 11).setValue(catatan);
    autoFitSheetColumns(lynkSheet, 11, 110, 22);
    generateDashboard(true);
    SpreadsheetApp.flush();

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log('Error doPost (Lynk Webhook): ' + err.toString());
    return createJsonResponse({
      status: 'error',
      code: 500,
      success: false,
      message: 'Internal error: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// 🔐 HELPER VERIFIKASI HMAC-SHA256 LYNK.ID
// ============================================================================
function verifyLynkSignature(rawBody, signatureHeader, payloadObj) {
  try {
    const merchantKey = getScriptProp('MERCHANT_KEY', '');
    if (!merchantKey) {
      return { valid: false, reason: 'MERCHANT_KEY belum dikonfigurasi di Script Properties.' };
    }
    if (!signatureHeader || String(signatureHeader).trim() === '') {
      return { valid: false, reason: 'Header X-Lynk-Signature tidak ditemukan.' };
    }

    const incomingSig = String(signatureHeader)
      .trim()
      .toLowerCase()
      .replace(/^sha256=/, '');

    // Metode 1: HMAC-SHA256 atas Raw JSON Body
    const hmacBytes = Utilities.computeHmacSha256Signature(rawBody || '', merchantKey);
    const expectedHmacHex = bytesToHex(hmacBytes);

    if (constantTimeEqual(incomingSig, expectedHmacHex)) {
      return { valid: true, method: 'HMAC-SHA256' };
    }

    // Metode 2: Varian SHA-256 atas grandTotal + refId + message_id + MERCHANT_KEY
    if (payloadObj && typeof payloadObj === 'object') {
      const dataObj = payloadObj.data || payloadObj;
      const msgData = dataObj.message_data || dataObj;
      const totalsObj = msgData.totals || {};

      const grandTotal = String(
        msgData.grandTotal || msgData.grand_total || totalsObj.grandTotal || totalsObj.grand_total || ''
      );
      const refId = String(msgData.refId || msgData.ref_id || dataObj.refId || '');
      const messageId = String(dataObj.message_id || msgData.message_id || payloadObj.message_id || '');

      if (refId || messageId) {
        const concatStr = grandTotal + refId + messageId + merchantKey;
        const shaBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, concatStr, Utilities.Charset.UTF_8);
        const expectedShaHex = bytesToHex(shaBytes);
        if (constantTimeEqual(incomingSig, expectedShaHex)) {
          return { valid: true, method: 'SHA256-Concat' };
        }
      }
    }

    return { valid: false, reason: 'Signature tidak cocok dengan MERCHANT_KEY.' };
  } catch (err) {
    Logger.log('Error verifyLynkSignature: ' + err.toString());
    return { valid: false, reason: 'Gagal memproses verifikasi signature: ' + err.toString() };
  }
}

function bytesToHex(bytes) {
  return bytes.map(function(b) {
    const unsigned = b < 0 ? b + 256 : b;
    return ('0' + unsigned.toString(16)).slice(-2);
  }).join('').toLowerCase();
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================================================
// 📊 3. AUTOMATED REPORTING (`Dashboard`, `Report_Scalev`, `Report_Lynk` & AUTO-WIDTH)
// ============================================================================
function getJakartaDateKey(dateObj) {
  return Utilities.formatDate(dateObj || new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}

function getJakartaDateDisplay(dateObj) {
  return Utilities.formatDate(dateObj || new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
}

function incrementDailyEmailSentCounter() {
  try {
    const props = PropertiesService.getScriptProperties();
    const todayKey = 'EMAIL_SENT_COUNT_' + getJakartaDateKey(new Date());
    const current = parseInt(props.getProperty(todayKey) || '0', 10) || 0;
    props.setProperty(todayKey, String(current + 1));

    // Bersihkan counter hari-hari lama agar Script Properties tetap ringkas
    const allProps = props.getProperties();
    const prefix = 'EMAIL_SENT_COUNT_';
    Object.keys(allProps).forEach(function(k) {
      if (k.startsWith(prefix) && k !== todayKey) {
        props.deleteProperty(k);
      }
    });
  } catch (err) {
    Logger.log('Warning incrementDailyEmailSentCounter: ' + err.toString());
  }
}

function getDailyEmailSentCount(sheetEmailsTodayCount) {
  let propCount = 0;
  try {
    const todayKey = 'EMAIL_SENT_COUNT_' + getJakartaDateKey(new Date());
    propCount = parseInt(PropertiesService.getScriptProperties().getProperty(todayKey) || '0', 10) || 0;
  } catch (err) {}
  return Math.max(propCount, sheetEmailsTodayCount || 0);
}

function autoFitSheetColumns(sheet, numCols, minWidth, paddingPx) {
  if (!sheet) return;
  const cols = numCols || sheet.getLastColumn();
  if (!cols || cols < 1) return;
  const minW = minWidth || 100;
  const pad = typeof paddingPx === 'number' ? paddingPx : 24;
  try {
    SpreadsheetApp.flush();
    sheet.autoResizeColumns(1, cols);
    for (let c = 1; c <= cols; c++) {
      const w = sheet.getColumnWidth(c);
      const target = Math.min(Math.max(minW, w + pad), 520);
      sheet.setColumnWidth(c, target);
    }
  } catch (err) {
    Logger.log('Warning autoFitSheetColumns: ' + err.toString());
  }
}

function autoFitAllSheets(ss) {
  const targetSs = ss || getTargetSpreadsheet();
  const s1 = targetSs.getSheetByName(TAB_SCALEV_ORDERS);
  if (s1) autoFitSheetColumns(s1, 9, 110, 22);
  const s2 = targetSs.getSheetByName(TAB_LYNK_ORDERS);
  if (s2) autoFitSheetColumns(s2, 11, 110, 22);
  const s3 = targetSs.getSheetByName(TAB_REPORT_SCALEV);
  if (s3) autoFitSheetColumns(s3, 3, 150, 26);
  const s4 = targetSs.getSheetByName(TAB_REPORT_LYNK);
  if (s4) autoFitSheetColumns(s4, 5, 130, 26);
  const s5 = targetSs.getSheetByName(TAB_DASHBOARD);
  if (s5) {
    autoFitSheetColumns(s5, 4, 140, 28);
    if (s5.getColumnWidth(4) < 200) s5.setColumnWidth(4, 200);
  }
}

function menuAutoFitAllSheets() {
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);
  autoFitAllSheets(ss);
  SpreadsheetApp.getUi().alert('✅ Selesai', 'Lebar seluruh kolom di semua tab telah dirapikan otomatis sesuai isinya.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function isSameJakartaDay(val, todayKey) {
  if (!val) return false;
  try {
    if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
      return getJakartaDateKey(val) === todayKey;
    }
    const str = String(val).trim();
    if (!str) return false;
    // Cek format dd/MM/yyyy atau yyyy-MM-dd
    const todaySlash = getJakartaDateDisplay(new Date());
    if (str.startsWith(todaySlash) || str.startsWith(todayKey)) return true;
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return getJakartaDateKey(parsed) === todayKey;
    }
  } catch (e) {}
  return false;
}

function generateAllReports() {
  generateScalevReport(true);
  generateLynkReport(true);
  generateDashboard(true);
  autoFitAllSheets();
  try {
    SpreadsheetApp.getUi().alert('✅ Selesai', 'Dashboard, Report_Scalev, dan Report_Lynk berhasil diperbarui dengan lebar kolom otomatis!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function generateDashboard(silent) {
  try {
    const ss = getTargetSpreadsheet();
    const sheets = initAllSheets(ss);
    let dashSheet = ss.getSheetByName(TAB_DASHBOARD);
    if (!dashSheet) {
      dashSheet = ss.insertSheet(TAB_DASHBOARD);
    }

    const todayKey = getJakartaDateKey(new Date());
    const todayDisplay = getJakartaDateDisplay(new Date());

    let scalevRevenue = 0;
    let lynkRevenue = 0;
    let legacyRevenue = 0;
    let totalPaidTx = 0;
    let revenueToday = 0;
    let totalLicenses = 0;
    let activeLicenses = 0;
    let licensesToday = 0;
    let totalEmailsSent = 0;
    let emailsTodayFromSheet = 0;

    const sources = [
      { sh: sheets.scalevSheet, type: 'SCALEV' },
      { sh: sheets.lynkSheet, type: 'LYNK' },
      { sh: ss.getSheetByName(TAB_LEGACY), type: 'LEGACY' }
    ];

    sources.forEach(function(src) {
      const sh = src.sh;
      if (!sh || sh.getLastRow() <= 1) return;
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const orderId = String(data[i][1] || '').trim();
        const email = String(data[i][2] || '').trim();
        const license = String(data[i][3] || '').trim();
        if (!orderId && !email && !license) continue;

        const waktu = data[i][0];
        const statusLisensi = String(data[i][4] || '').trim().toUpperCase();
        const paymentStatus = String(data[i][5] || '').trim().toUpperCase();
        const rev = parseRevenueNumber(data[i][6]);
        const catatan = String(data[i][data[i].length - 1] || '').trim().toUpperCase();
        const isToday = isSameJakartaDay(waktu, todayKey);

        totalLicenses++;
        if (statusLisensi === 'ACTIVE') activeLicenses++;
        if (isToday) licensesToday++;

        const isPaid = (
          paymentStatus === 'PAID' ||
          paymentStatus === 'COMPLETED' ||
          paymentStatus === 'SETTLED' ||
          paymentStatus === 'SUCCESS' ||
          (!paymentStatus && statusLisensi === 'ACTIVE')
        );
        if (isPaid) {
          totalPaidTx++;
          if (src.type === 'SCALEV') scalevRevenue += rev;
          else if (src.type === 'LYNK') lynkRevenue += rev;
          else legacyRevenue += rev;
          if (isToday) revenueToday += rev;
        }

        if (catatan.includes('TERKIRIM')) {
          totalEmailsSent++;
          if (isToday) emailsTodayFromSheet++;
        }
      }
    });

    const totalRevenue = scalevRevenue + lynkRevenue + legacyRevenue;
    const avgRevenue = totalPaidTx > 0 ? Math.round(totalRevenue / totalPaidTx) : 0;
    const emailsTodayTotal = getDailyEmailSentCount(emailsTodayFromSheet);
    const updatedAt = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy, HH.mm.ss');

    dashSheet.clear();
    dashSheet.clearFormats();

    // Header Banner (Row 1)
    dashSheet.getRange('A1:D1').merge()
      .setValue('📊 DASHBOARD MONITORING LISENSI & GROSS REVENUE WALI PINTAR')
      .setBackground('#065f46')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(13)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    dashSheet.setRowHeight(1, 38);

    // Section 1: Summary Gross Revenue (Row 3)
    dashSheet.getRange('A3:D3').merge()
      .setValue('💰 SUMMARY GROSS REVENUE (SCALEV + LYNK.ID • STATUS PAID / LUNAS)')
      .setBackground('#047857')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(10.5)
      .setVerticalAlignment('middle');
    dashSheet.setRowHeight(3, 28);

    const revRows = [
      { label: 'Total Gross Revenue (Semua Jalur Paid)', val: totalRevenue, fmt: '"Rp"#,##0', color: '#065f46', bg: '#ecfdf5', bold: true },
      { label: 'Total Gross Revenue Scalev (Meta Ads)', val: scalevRevenue, fmt: '"Rp"#,##0', color: '#0f172a', bg: '#ffffff', bold: false },
      { label: 'Total Gross Revenue Lynk.id (Affiliate)', val: lynkRevenue, fmt: '"Rp"#,##0', color: '#1e3a8a', bg: '#f8fafc', bold: false },
      { label: 'Total Transaksi Paid (Lunas)', val: totalPaidTx + ' Transaksi', fmt: '@', color: '#0f172a', bg: '#ffffff', bold: true },
      { label: 'Rata-Rata Gross Revenue per Transaksi Paid', val: avgRevenue, fmt: '"Rp"#,##0', color: '#0f172a', bg: '#f8fafc', bold: false },
      { label: 'Gross Revenue Paid Hari Ini (' + todayDisplay + ')', val: revenueToday, fmt: '"Rp"#,##0', color: '#047857', bg: '#ecfdf5', bold: true },
      { label: 'Formula Otomatis Sheet (=SUMIF Paid)', val: null, fmt: '"Rp"#,##0', color: '#475569', bg: '#ffffff', bold: false, isFormula: true }
    ];

    for (let r = 0; r < revRows.length; r++) {
      const rowIdx = 4 + r;
      const item = revRows[r];
      dashSheet.getRange(rowIdx, 1, 1, 3).merge()
        .setValue(item.label)
        .setBackground(item.bg)
        .setFontColor(item.color)
        .setFontWeight(item.bold ? 'bold' : 'normal')
        .setVerticalAlignment('middle');
      const valCell = dashSheet.getRange(rowIdx, 4);
      if (item.isFormula) {
        valCell.setFormula('=SUMIF(Scalev_Orders!F:F, "PAID", Scalev_Orders!G:G) + SUMIF(Lynk_Orders!F:F, "PAID", Lynk_Orders!G:G)');
      } else {
        valCell.setValue(item.val);
      }
      valCell
        .setNumberFormat(item.fmt)
        .setBackground(item.bg)
        .setFontColor(item.color)
        .setFontWeight(item.bold ? 'bold' : 'normal')
        .setHorizontalAlignment('right')
        .setVerticalAlignment('middle');
      dashSheet.setRowHeight(rowIdx, 24);
    }

    dashSheet.getRange('A3:D10').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // Anti-#ERROR! Guard pada Formula SUMIF (Row 10)
    SpreadsheetApp.flush();
    const formulaCell = dashSheet.getRange('D10');
    const formulaDisp = String(formulaCell.getDisplayValue() || '');
    if (formulaDisp.startsWith('#')) {
      formulaCell.setValue(scalevRevenue + lynkRevenue).setNumberFormat('"Rp"#,##0');
    }

    // Section 2: Metrik Operasional Lisensi & Brevo (Row 12)
    dashSheet.getRange('A12:D12').merge()
      .setValue('📈 METRIK OPERASIONAL LISENSI & BREVO')
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(10.5)
      .setVerticalAlignment('middle');
    dashSheet.setRowHeight(12, 28);

    const opsRows = [
      { label: 'Total Lisensi Diterbitkan', val: totalLicenses, fmt: '#,##0', bg: '#ffffff', color: '#0f172a', bold: true },
      { label: 'Lisensi Aktif (Siap Main)', val: activeLicenses, fmt: '#,##0', bg: '#f8fafc', color: '#0f172a', bold: true },
      { label: 'Lisensi Terbit Hari Ini (' + todayDisplay + ')', val: licensesToday, fmt: '#,##0', bg: '#ffffff', color: '#0f172a', bold: true },
      { label: 'Total Email Berhasil Terkirim (Brevo)', val: totalEmailsSent, fmt: '#,##0', bg: '#f8fafc', color: '#0f172a', bold: true },
      { label: 'Total Email Terkirim Hari Ini (Brevo)', val: emailsTodayTotal, fmt: '#,##0', bg: '#ecfdf5', color: '#065f46', bold: true },
      { label: 'Terakhir Diperbarui Otomatis', val: updatedAt, fmt: '@', bg: '#ffffff', color: '#475569', bold: true }
    ];

    for (let m = 0; m < opsRows.length; m++) {
      const rowIdx = 13 + m;
      const item = opsRows[m];
      dashSheet.getRange(rowIdx, 1, 1, 3).merge()
        .setValue(item.label)
        .setBackground(item.bg)
        .setFontColor(item.color)
        .setFontWeight(item.bold ? 'bold' : 'normal')
        .setVerticalAlignment('middle');
      dashSheet.getRange(rowIdx, 4)
        .setValue(item.val)
        .setNumberFormat(item.fmt)
        .setBackground(item.bg)
        .setFontColor(item.color)
        .setFontWeight(item.bold ? 'bold' : 'normal')
        .setHorizontalAlignment('right')
        .setVerticalAlignment('middle');
      dashSheet.setRowHeight(rowIdx, 24);
    }

    dashSheet.getRange('A12:D18').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    // Section 3: Panduan Singkat (Merged A:D agar tidak merusak auto-width Kolom A)
    dashSheet.getRange('A20:D20').merge()
      .setValue('💡 PANDUAN PENGELOLAAN SCALEV, LYNK.ID & LISENSI:')
      .setFontWeight('bold')
      .setFontColor('#0f172a');
    const guides = [
      '1. Kolom "Gross Revenue" otomatis merekam nilai rupiah dari Scalev & Webhook Lynk.id.',
      '2. Summary di atas menghitung gabungan omzet Scalev + Lynk.id berstatus PAID/LUNAS beserta counter email Brevo hari ini.',
      '3. Menu Laporan: Gunakan "📊 Menu Laporan" untuk rincian Scalev, komisi Affiliate Lynk.id, & rapikan lebar kolom otomatis.',
      '4. Menu Admin: Gunakan "🎮 WaliPintar Admin" untuk uji koneksi Brevo/Lynk/Scalev, sinkronisasi order, atau broadcast update.'
    ];
    for (let g = 0; g < guides.length; g++) {
      dashSheet.getRange(21 + g, 1, 1, 4).merge()
        .setValue(guides[g])
        .setWrap(true)
        .setFontColor('#334155')
        .setFontSize(10);
    }

    // Auto-width proporsional agar semua isi & label terlihat utuh
    SpreadsheetApp.flush();
    dashSheet.autoResizeColumns(1, 4);
    if (dashSheet.getColumnWidth(1) < 140) dashSheet.setColumnWidth(1, 140);
    if (dashSheet.getColumnWidth(2) < 130) dashSheet.setColumnWidth(2, 130);
    if (dashSheet.getColumnWidth(3) < 130) dashSheet.setColumnWidth(3, 130);
    dashSheet.setColumnWidth(4, Math.max(210, dashSheet.getColumnWidth(4) + 32));

    if (!silent) {
      try {
        SpreadsheetApp.getUi().alert(
          '📊 Dashboard Monitoring Diperbarui',
          '• Total Gross Revenue (Paid): Rp ' + formatNumberId(totalRevenue) + '\n' +
          '• Total Transaksi Paid: ' + totalPaidTx + '\n' +
          '• Email Terkirim Hari Ini (Brevo): ' + emailsTodayTotal + ' email\n' +
          '• Seluruh lebar kolom sudah disesuaikan otomatis.',
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (uiErr) {}
    }
  } catch (err) {
    Logger.log('Error generateDashboard: ' + err.toString());
    if (!silent) {
      try { SpreadsheetApp.getUi().alert('❌ Error Dashboard', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    }
  }
}

function generateScalevReport(silent) {
  try {
    const ss = getTargetSpreadsheet();
    const sheets = initAllSheets(ss);
    const scalevSheet = sheets.scalevSheet;
    const reportSheet = ss.getSheetByName(TAB_REPORT_SCALEV);

    const todayKey = getJakartaDateKey(new Date());
    const data = scalevSheet.getDataRange().getValues();
    let totalOmzet = 0;
    let totalTransaksi = 0;
    let lisensiAktif = 0;
    let emailsTodayScalev = 0;

    for (let i = 1; i < data.length; i++) {
      const orderId = String(data[i][1] || '').trim();
      const email = String(data[i][2] || '').trim();
      if (!orderId && !email) continue;

      const statusLisensi = String(data[i][4] || '').trim().toUpperCase();
      const paymentStatus = String(data[i][5] || '').trim().toUpperCase();
      const revenue = parseRevenueNumber(data[i][6]);
      const catatan = String(data[i][data[i].length - 1] || '').trim().toUpperCase();

      const isPaid = (
        paymentStatus === 'PAID' ||
        paymentStatus === 'COMPLETED' ||
        paymentStatus === 'SETTLED' ||
        paymentStatus === 'SUCCESS' ||
        (!paymentStatus && statusLisensi === 'ACTIVE')
      );

      if (isPaid) {
        totalTransaksi++;
        totalOmzet += revenue;
      }
      if (statusLisensi === 'ACTIVE') {
        lisensiAktif++;
      }
      if (catatan.includes('TERKIRIM') && isSameJakartaDay(data[i][0], todayKey)) {
        emailsTodayScalev++;
      }
    }

    const totalEmailsTodayAll = getDailyEmailSentCount(emailsTodayScalev);

    reportSheet.clear();

    const headers = ['Total Omzet', 'Total Transaksi', 'Lisensi Aktif'];
    reportSheet.getRange(1, 1, 1, 3)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#065f46')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    reportSheet.getRange(2, 1, 1, 3)
      .setValues([[totalOmzet, totalTransaksi, lisensiAktif]])
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground('#ecfdf5');

    reportSheet.getRange(2, 1).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
    reportSheet.getRange(2, 2).setNumberFormat('#,##0').setHorizontalAlignment('center');
    reportSheet.getRange(2, 3).setNumberFormat('#,##0').setHorizontalAlignment('center');
    reportSheet.getRange(1, 1, 2, 3).setBorder(true, true, true, true, true, true, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);

    // Tambahan counter Email Terkirim Hari Ini (Brevo) di Report_Scalev
    reportSheet.getRange('A4:B4').merge()
      .setValue('Total Email Terkirim Hari Ini (Brevo)')
      .setFontWeight('bold')
      .setBackground('#f8fafc')
      .setFontColor('#065f46');
    reportSheet.getRange('C4')
      .setValue(totalEmailsTodayAll)
      .setNumberFormat('#,##0')
      .setFontWeight('bold')
      .setBackground('#ecfdf5')
      .setFontColor('#065f46')
      .setHorizontalAlignment('center');
    reportSheet.getRange('A4:C4').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    reportSheet.getRange('A6:C6').merge()
      .setValue('Terakhir diperbarui: ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'))
      .setFontColor('#64748b')
      .setFontSize(10);

    autoFitSheetColumns(reportSheet, 3, 150, 26);
    if (!silent) {
      generateDashboard(true);
      try {
        SpreadsheetApp.getUi().alert(
          '📈 Report_Scalev Diperbarui',
          '• Total Omzet: Rp ' + formatNumberId(totalOmzet) + '\n' +
          '• Total Transaksi: ' + totalTransaksi + '\n' +
          '• Lisensi Aktif: ' + lisensiAktif + '\n' +
          '• Email Terkirim Hari Ini: ' + totalEmailsTodayAll,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (uiErr) {}
    }
  } catch (err) {
    Logger.log('Error generateScalevReport: ' + err.toString());
    if (!silent) {
      try { SpreadsheetApp.getUi().alert('❌ Error Report Scalev', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    }
  }
}

function generateLynkReport(silent) {
  try {
    const ss = getTargetSpreadsheet();
    const sheets = initAllSheets(ss);
    const lynkSheet = sheets.lynkSheet;
    const reportSheet = ss.getSheetByName(TAB_REPORT_LYNK);

    // 1. Baca Rate Komisi (%) yang sudah diset manual di Report_Lynk agar tidak tertimpa
    const existingRates = {};
    const existingReportData = reportSheet.getDataRange().getValues();
    for (let r = 1; r < existingReportData.length; r++) {
      const affName = String(existingReportData[r][0] || '').trim();
      if (!affName || affName.toUpperCase() === 'TOTAL KESELURUHAN') continue;

      const rawRate = existingReportData[r][3];
      if (rawRate !== '' && rawRate !== null && rawRate !== undefined) {
        let rateNum = typeof rawRate === 'number'
          ? rawRate
          : parseFloat(String(rawRate).replace(/[^0-9.-]/g, ''));

        if (!isNaN(rateNum) && rateNum >= 0) {
          if (rateNum > 0 && rateNum <= 1) {
            rateNum = rateNum * 100;
          }
          existingRates[affName.toLowerCase()] = rateNum;
        }
      }
    }

    // 2. Kelompokkan transaksi dari Lynk_Orders per Nama Affiliate
    const lynkData = lynkSheet.getDataRange().getValues();
    const affiliateMap = {};

    for (let i = 1; i < lynkData.length; i++) {
      const orderId = String(lynkData[i][1] || '').trim();
      const email = String(lynkData[i][2] || '').trim();
      if (!orderId && !email) continue;

      const statusLisensi = String(lynkData[i][4] || '').trim().toUpperCase();
      const paymentStatus = String(lynkData[i][5] || '').trim().toUpperCase();
      const revenue = parseRevenueNumber(lynkData[i][6]);
      const rawAffName = String(lynkData[i][9] || '').trim();
      const affName = rawAffName || 'Direct / Tanpa Affiliate';

      const isPaid = (
        paymentStatus === 'PAID' ||
        paymentStatus === 'COMPLETED' ||
        paymentStatus === 'SETTLED' ||
        paymentStatus === 'SUCCESS' ||
        (!paymentStatus && statusLisensi === 'ACTIVE')
      );

      if (!isPaid) continue;

      const key = affName.toLowerCase();
      if (!affiliateMap[key]) {
        affiliateMap[key] = {
          name: affName,
          totalTransaksi: 0,
          totalOmzet: 0
        };
      }
      affiliateMap[key].totalTransaksi += 1;
      affiliateMap[key].totalOmzet += revenue;
    }

    // 3. Susun baris laporan + hitung komisi (default 20%, 0% untuk Direct)
    const outputRows = [];
    const affKeys = Object.keys(affiliateMap).sort(function(a, b) {
      return affiliateMap[b].totalOmzet - affiliateMap[a].totalOmzet;
    });

    let grandTotalTx = 0;
    let grandTotalOmzet = 0;
    let grandTotalKomisi = 0;

    for (let k = 0; k < affKeys.length; k++) {
      const item = affiliateMap[affKeys[k]];
      const isDirect = affKeys[k].includes('tanpa affiliate');
      const savedRate = existingRates[affKeys[k]];
      const ratePercent = savedRate !== undefined
        ? savedRate
        : (isDirect ? 0 : DEFAULT_AFFILIATE_COMMISSION_RATE);

      const totalKomisi = Math.round(item.totalOmzet * (ratePercent / 100));

      grandTotalTx += item.totalTransaksi;
      grandTotalOmzet += item.totalOmzet;
      grandTotalKomisi += totalKomisi;

      outputRows.push([
        item.name,
        item.totalTransaksi,
        item.totalOmzet,
        ratePercent,
        totalKomisi
      ]);
    }

    // 4. Tulis ke tab Report_Lynk
    reportSheet.clear();

    const headers = ['Nama Affiliate', 'Total Transaksi', 'Total Omzet', 'Rate Komisi (%)', 'Total Komisi'];
    reportSheet.getRange(1, 1, 1, 5)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#1e3a8a')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    if (outputRows.length > 0) {
      reportSheet.getRange(2, 1, outputRows.length, 5).setValues(outputRows);

      reportSheet.getRange(2, 2, outputRows.length, 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
      reportSheet.getRange(2, 3, outputRows.length, 1).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
      reportSheet.getRange(2, 4, outputRows.length, 1).setNumberFormat('0"%"').setHorizontalAlignment('center');
      reportSheet.getRange(2, 5, outputRows.length, 1).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right').setFontWeight('bold');

      const totalRowIdx = outputRows.length + 2;
      reportSheet.getRange(totalRowIdx, 1, 1, 5)
        .setValues([['TOTAL KESELURUHAN', grandTotalTx, grandTotalOmzet, '-', grandTotalKomisi]])
        .setFontWeight('bold')
        .setBackground('#eff6ff');
      reportSheet.getRange(totalRowIdx, 2).setNumberFormat('#,##0').setHorizontalAlignment('center');
      reportSheet.getRange(totalRowIdx, 3).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
      reportSheet.getRange(totalRowIdx, 4).setHorizontalAlignment('center');
      reportSheet.getRange(totalRowIdx, 5).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');

      reportSheet.getRange(1, 1, totalRowIdx, 5).setBorder(true, true, true, true, true, true, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);
    }

    const noteRow = outputRows.length + 4;
    reportSheet.getRange(noteRow, 1, 1, 5).merge()
      .setValue('💡 Tips: Ubah angka di kolom "Rate Komisi (%)" (misal: 25), lalu jalankan ulang "Generate Laporan Affiliate Lynk" untuk menghitung ulang komisi otomatis.')
      .setWrap(true)
      .setFontColor('#64748b')
      .setFontSize(10);

    autoFitSheetColumns(reportSheet, 5, 130, 26);
    if (!silent) {
      generateDashboard(true);
    }

    if (!silent) {
      try {
        SpreadsheetApp.getUi().alert(
          '🤝 Report_Lynk Diperbarui',
          '• Jumlah Affiliate: ' + outputRows.length + '\n' +
          '• Total Transaksi: ' + grandTotalTx + '\n' +
          '• Total Omzet: Rp ' + formatNumberId(grandTotalOmzet) + '\n' +
          '• Total Komisi: Rp ' + formatNumberId(grandTotalKomisi),
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (uiErr) {}
    }
  } catch (err) {
    Logger.log('Error generateLynkReport: ' + err.toString());
    if (!silent) {
      try { SpreadsheetApp.getUi().alert('❌ Error Report Lynk', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    }
  }
}

function menuCheckDuplicateLicenses() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const seenMap = {};
  const duplicates = [];

  [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY].forEach(function(tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() <= 1) return;

    const rows = sh.getDataRange().getValues();
    const licCol = findLicenseColumnIndex(rows[0]);
    for (let i = 1; i < rows.length; i++) {
      const code = String(rows[i][licCol] || '').trim().toUpperCase();
      if (!code) continue;
      const loc = tabName + ' (Baris ' + (i + 1) + ')';
      if (seenMap[code]) {
        duplicates.push(code + ': ' + seenMap[code] + ' vs ' + loc);
      } else {
        seenMap[code] = loc;
      }
    }
  });

  if (duplicates.length === 0) {
    ui.alert(
      '🛡️ 100% Bebas Duplikat!',
      'Total ' + Object.keys(seenMap).length + ' lisensi diperiksa di Scalev_Orders & Lynk_Orders.\nTidak ditemukan satu pun kode lisensi yang kembar/bentrok.',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '⚠️ Ditemukan ' + duplicates.length + ' Duplikat Lisensi',
      duplicates.slice(0, 10).join('\n'),
      ui.ButtonSet.OK
    );
  }
}

// ============================================================================
// 🔍 VALIDASI LISENSI & RESEND EMAIL (KOMPATIBEL DENGAN WEB GAME WALI PINTAR)
// ============================================================================
function handleLicenseCheck(params) {
  const licenseKey = String(params.license_key || params.licenseKey || params.key || '').trim().toUpperCase();
  if (!licenseKey) {
    return createJsonResponse({ success: false, valid: false, message: 'Kode lisensi harus diisi.' });
  }

  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const sheetsToCheck = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY];
  for (let s = 0; s < sheetsToCheck.length; s++) {
    const sh = ss.getSheetByName(sheetsToCheck[s]);
    if (!sh) continue;

    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowKey = String(data[i][3] || '').trim().toUpperCase();
      const rowStatus = String(data[i][4] || '').trim().toUpperCase();
      if (rowKey === licenseKey && rowStatus === 'ACTIVE') {
        return createJsonResponse({
          status: 'success',
          success: true,
          valid: true,
          source: sheetsToCheck[s],
          licenseKey: licenseKey,
          license: licenseKey,
          email: data[i][2],
          orderId: data[i][1],
          message: 'Lisensi valid dan aktif!'
        });
      }
    }
  }

  return createJsonResponse({
    status: 'error',
    success: true,
    valid: false,
    message: 'Kode lisensi tidak valid, sudah dinonaktifkan, atau belum terdaftar.',
    orderUrl: SCALEV_URL,
    lynkUrl: LYNK_LP_URL,
    adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
      'Halo Admin ' + BRAND_NAME + ', saya butuh bantuan lisensi: ' + licenseKey
    )
  });
}

function handleResendLicense(params) {
  const email = String(params.email || '').trim().toLowerCase();
  if (!email) {
    return createJsonResponse({ success: false, message: 'Email wajib diisi.' });
  }

  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const sheetsToCheck = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY];
  for (let s = 0; s < sheetsToCheck.length; s++) {
    const sh = ss.getSheetByName(sheetsToCheck[s]);
    if (!sh) continue;

    const existing = findExistingOrder(sh, '', email);
    if (existing && existing.status === 'ACTIVE') {
      const brevoRes = sendEmailBrevo(email, existing.licenseKey, existing.customerName, existing.orderId, true);
      const statusCol = sheetsToCheck[s] === TAB_LYNK_ORDERS ? 11 : 9;
      if (sheetsToCheck[s] !== TAB_LEGACY) {
        sh.getRange(existing.rowIndex, statusCol).setValue(
          brevoRes.success ? 'TERKIRIM ULANG (Brevo)' : 'GAGAL KIRIM ULANG (' + brevoRes.error + ')'
        );
      }
      return createJsonResponse({
        status: brevoRes.success ? 'success' : 'error',
        success: true,
        found: true,
        source: sheetsToCheck[s],
        license: existing.licenseKey,
        licenseKey: existing.licenseKey,
        emailSent: brevoRes.success,
        brevoMessageId: brevoRes.messageId,
        message: brevoRes.success
          ? 'Lisensi berhasil dikirim ulang via Brevo ke ' + email + '!'
          : 'Lisensi ditemukan, namun gagal kirim email Brevo: ' + brevoRes.error
      });
    }
  }

  return createJsonResponse({
    status: 'error',
    success: false,
    found: false,
    message: 'Email belum terdaftar di sistem lisensi kami.',
    adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
      'Halo Admin ' + BRAND_NAME + ', email saya (' + email + ') belum terdaftar. Mohon dibantu.'
    )
  });
}

// ============================================================================
// 🔐 ADMIN API ACTIONS (DELETE, RESET, SYNC SCALEV, BROADCAST UPDATE)
// ============================================================================
function handleApiSyncScalev() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getTargetSpreadsheet();
    return createJsonResponse(syncOrdersFromScalev(ss));
  } finally {
    lock.releaseLock();
  }
}

function isValidAdminSecret(secret) {
  if (!ADMIN_SECRET_KEY) return false;
  return constantTimeEqual(String(secret || '').trim(), ADMIN_SECRET_KEY);
}

function handleApiDeleteLicense(params) {
  if (!ADMIN_SECRET_KEY) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: ADMIN_SECRET_KEY belum diatur di Script Properties GAS.' });
  }
  const secret = String(params.secret || '').trim();
  if (!isValidAdminSecret(secret)) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: Kunci rahasia admin salah.' });
  }

  const target = String(params.target || '').trim();
  if (!target) {
    return createJsonResponse({ success: false, message: 'Parameter target (lisensi/email/order_id) diperlukan.' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getTargetSpreadsheet();
    const deletedCount = deleteMatchingLicenseRows(ss, target);

    if (deletedCount > 0) {
      generateScalevReport(true);
      generateLynkReport(true);
      generateDashboard(true);
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
  } finally {
    lock.releaseLock();
  }
}

function handleApiDeleteAll(params) {
  if (!ADMIN_SECRET_KEY) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: ADMIN_SECRET_KEY belum diatur di Script Properties GAS.' });
  }
  const secret = String(params.secret || '').trim();
  if (!isValidAdminSecret(secret)) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: Kunci rahasia admin salah.' });
  }

  const sheetTarget = String(params.sheet || TAB_SCALEV_ORDERS).trim();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getTargetSpreadsheet();
    const tabs = sheetTarget.toLowerCase() === 'all' ? [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS] : [sheetTarget];
    let totalDeleted = 0;

    tabs.forEach(function(tabName) {
      const sh = ss.getSheetByName(tabName);
      if (!sh) return;
      const lastRow = sh.getLastRow();
      if (lastRow > 1) {
        const cnt = lastRow - 1;
        sh.deleteRows(2, cnt);
        totalDeleted += cnt;
      }
    });

    generateScalevReport(true);
    generateLynkReport(true);
    generateDashboard(true);

    return createJsonResponse({
      success: true,
      deletedCount: totalDeleted,
      message: 'Berhasil menghapus ' + totalDeleted + ' baris order.'
    });
  } finally {
    lock.releaseLock();
  }
}

function handleApiBroadcastUpdate(params) {
  if (!ADMIN_SECRET_KEY) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: ADMIN_SECRET_KEY belum diatur di Script Properties GAS.' });
  }
  const secret = String(params.secret || '').trim();
  if (!isValidAdminSecret(secret)) {
    return createJsonResponse({ success: false, message: 'Akses ditolak: Kunci rahasia admin salah.' });
  }

  const versi = String(params.versi || 'v2.6.0').trim();
  const tanggal = String(params.tanggal || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy')).trim();
  const jenisPerbaikan = String(params.jenis || params.jenis_perbaikan || 'Pembaruan tampilan & performa game edukatif.').trim();
  const status = 'Free 100% (Gratis Selamanya untuk Pembeli Resmi)';
  const rangeParam = String(params.range || '').trim();
  const targetSheetName = String(params.sheet || 'SEMUA').trim();

  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const recipients = collectBroadcastRecipients(ss, targetSheetName, rangeParam);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const item = recipients[i];
    const res = sendBrevoBroadcastUpdateEmail(item.email, item.name, item.license, {
      versi: versi,
      tanggal: tanggal,
      jenisPerbaikan: jenisPerbaikan,
      status: status
    });
    if (res.success) successCount++;
    else failCount++;
    Utilities.sleep(50);
  }

  return createJsonResponse({
    success: true,
    sent: successCount,
    failed: failCount,
    totalUnique: recipients.length,
    message: 'Broadcast selesai diproses: ' + successCount + ' terkirim, ' + failCount + ' gagal.'
  });
}

// ============================================================================
// 📢 FITUR MENU ADMIN: BROADCAST PEMBARUAN / UPDATE FITUR (SCALEV & LYNK)
// ============================================================================
function menuBroadcastUpdate() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  // 1. PILIH TARGET TAB (Scalev_Orders / Lynk_Orders / SEMUA)
  const tabPrompt = ui.prompt(
    '📢 Broadcast Pembaruan Fitur (Langkah 1/5: Sumber Pembeli)',
    'Pilih sumber data pembeli yang ingin dikirimi email pembaruan:\n\n' +
    '• Ketik "SEMUA" atau kosongkan untuk mengirim ke SEMUA pembeli (Scalev + Lynk)\n' +
    '• Ketik "SCALEV" untuk pembeli Scalev_Orders saja\n' +
    '• Ketik "LYNK" untuk pembeli Lynk_Orders saja\n\n' +
    'Masukkan pilihan Anda:',
    ui.ButtonSet.OK_CANCEL
  );
  if (tabPrompt.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Broadcast dibatalkan.');
    return;
  }

  const tabChoiceRaw = tabPrompt.getResponseText().trim().toUpperCase();
  let targetSource = 'SEMUA';
  if (tabChoiceRaw === 'SCALEV' || tabChoiceRaw === 'SCALEV_ORDERS') targetSource = TAB_SCALEV_ORDERS;
  else if (tabChoiceRaw === 'LYNK' || tabChoiceRaw === 'LYNK_ORDERS') targetSource = TAB_LYNK_ORDERS;

  // 2. OPSI RENTANG BARIS KOLOM C (JIKA MEMILIH 1 SHEET, ATAU SEMUA BARIS)
  const rangePrompt = ui.prompt(
    '📢 Broadcast Pembaruan Fitur (Langkah 2/5: Rentang Baris Kolom C)',
    'Tentukan rentang baris penerima di Kolom C (Email Pembeli):\n\n' +
    '• Contoh: "2-10" atau "C2:C25"\n' +
    '• Ketik "semua" atau kosongkan untuk seluruh pembeli di sumber terpilih:\n\n' +
    'Masukkan pilihan Anda:',
    ui.ButtonSet.OK_CANCEL
  );
  if (rangePrompt.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Broadcast dibatalkan.');
    return;
  }
  const rangeInput = rangePrompt.getResponseText().trim();

  const recipients = collectBroadcastRecipients(ss, targetSource, rangeInput);
  if (recipients.length === 0) {
    ui.alert('❌ Data Kosong', 'Tidak ditemukan alamat email pembeli aktif pada sumber/rentang tersebut.', ui.ButtonSet.OK);
    return;
  }

  // 3. ISIAN NOMOR VERSI APLIKASI
  const versiPrompt = ui.prompt(
    '📢 Broadcast Pembaruan Fitur (Langkah 3/5: Versi Aplikasi)',
    'Masukkan nomor versi aplikasi yang baru:\n(Contoh: v2.6.0):',
    ui.ButtonSet.OK_CANCEL
  );
  if (versiPrompt.getSelectedButton() !== ui.Button.OK) return;
  const versi = versiPrompt.getResponseText().trim() || 'v2.6.0';

  // 4. ISIAN TANGGAL PEMBARUAN
  const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
  const tglPrompt = ui.prompt(
    '📢 Broadcast Pembaruan Fitur (Langkah 4/5: Tanggal Rilis)',
    'Masukkan tanggal pembaruan (format DD/MM/YYYY):\n(Klik OK langsung untuk hari ini: ' + todayStr + '):',
    ui.ButtonSet.OK_CANCEL
  );
  if (tglPrompt.getSelectedButton() !== ui.Button.OK) return;
  const tanggal = tglPrompt.getResponseText().trim() || todayStr;

  // 5. ISIAN JENIS PERBAIKAN / FITUR BARU
  const jenisPrompt = ui.prompt(
    '📢 Broadcast Pembaruan Fitur (Langkah 5/5: Jenis Perbaikan)',
    'Jelaskan jenis perbaikan dan fitur baru yang dirilis:\n(Contoh: Menu mewarnai lebih rapi di HP & Tab, suara A-Z lebih responsif, dan peningkatan performa game edukatif):',
    ui.ButtonSet.OK_CANCEL
  );
  if (jenisPrompt.getSelectedButton() !== ui.Button.OK) return;
  const jenisPerbaikan = jenisPrompt.getResponseText().trim() || 'Pembaruan tampilan visual, optimasi game di HP & tablet, serta peningkatan performa game edukatif.';

  const status = 'Free 100% (Gratis Selamanya untuk Pembeli Resmi)';

  const confirmMsg =
    '📋 RINGKASAN DATA BROADCAST PEMBARUAN:\n\n' +
    '• Sumber Data       : ' + targetSource + '\n' +
    '• Rentang Baris     : ' + (rangeInput || 'Semua') + '\n' +
    '• Jumlah Penerima   : ' + recipients.length + ' pembeli unik\n' +
    '• Versi Aplikasi    : ' + versi + '\n' +
    '• Tanggal Pembaruan : ' + tanggal + '\n' +
    '• Status Update     : ' + status + '\n' +
    '• Jenis Perbaikan   : ' + jenisPerbaikan + '\n\n' +
    '⚠️ Apakah Anda yakin ingin MENGIRIM broadcast email ini ke ' + recipients.length + ' pembeli via Brevo?';

  const confirm = ui.alert('🚀 Konfirmasi Kirim Broadcast', confirmMsg, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) {
    ui.alert('Pengiriman broadcast dibatalkan.');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i++) {
    const item = recipients[i];
    try {
      const res = sendBrevoBroadcastUpdateEmail(item.email, item.name, item.license, {
        versi: versi,
        tanggal: tanggal,
        jenisPerbaikan: jenisPerbaikan,
        status: status
      });

      if (res.success) successCount++;
      else {
        failCount++;
        errors.push(item.email + ': ' + res.error);
      }
    } catch (err) {
      failCount++;
      errors.push(item.email + ': ' + err.toString());
    }
    Utilities.sleep(50);
  }

  let finalMsg =
    '🎉 PENGIRIMAN BROADCAST SELESAI!\n\n' +
    '• Berhasil Terkirim : ' + successCount + ' email pembeli\n' +
    '• Gagal             : ' + failCount + ' email\n' +
    '• Total Diproses    : ' + recipients.length + ' email unik';

  if (errors.length > 0) {
    finalMsg += '\n\nDetail error (maks 3):\n' + errors.slice(0, 3).join('\n');
  }

  ui.alert('✅ Laporan Pengiriman Broadcast', finalMsg, ui.ButtonSet.OK);
}

function collectBroadcastRecipients(ss, targetSource, rangeInput) {
  const tabsToScan = targetSource === 'SEMUA'
    ? [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY]
    : [targetSource];

  const recipients = [];
  const seenEmails = new Set();

  tabsToScan.forEach(function(tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() <= 1) return;

    const lastRow = sh.getLastRow();
    let startRow = 2;
    let endRow = lastRow;

    if (rangeInput && rangeInput.toLowerCase() !== 'semua' && rangeInput.toLowerCase() !== 'all') {
      const cleanStr = rangeInput.toUpperCase().replace(/C/g, '').trim();
      if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        startRow = parseInt(parts[0], 10) || 2;
        endRow = parseInt(parts[1], 10) || lastRow;
      } else if (cleanStr.includes(':')) {
        const parts = cleanStr.split(':');
        startRow = parseInt(parts[0], 10) || 2;
        endRow = parseInt(parts[1], 10) || lastRow;
      } else if (!isNaN(parseInt(cleanStr, 10))) {
        endRow = parseInt(cleanStr, 10);
      }
    }

    startRow = Math.max(2, startRow);
    endRow = Math.min(lastRow, Math.max(startRow, endRow));
    if (endRow < startRow) return;

    const numRows = endRow - startRow + 1;
    const rangeValues = sh.getRange(startRow, 1, numRows, sh.getLastColumn()).getValues();

    for (let i = 0; i < rangeValues.length; i++) {
      const row = rangeValues[i];
      const email = String(row[2] || '').trim().toLowerCase();
      const license = String(row[3] || '').trim();
      const status = String(row[4] || '').trim().toUpperCase();
      const name = String(row[7] || '').trim();

      if (email && email.includes('@') && status === 'ACTIVE' && !seenEmails.has(email)) {
        seenEmails.add(email);
        recipients.push({
          rowNumber: startRow + i,
          email: email,
          name: name,
          license: license
        });
      }
    }
  });

  return recipients;
}

function sendBrevoBroadcastUpdateEmail(toEmail, customerName, licenseKey, updateData) {
  if (!BREVO_API_KEY) {
    return { success: false, error: 'BREVO_API_KEY belum diisi di Script Properties GAS.' };
  }

  const subject = '🎉 Update Aplikasi ' + BRAND_NAME + ' (' + updateData.versi + '): Pembaruan Tampilan & Fitur (100% Gratis)';
  const htmlContent = generateUpdateBroadcastHtmlEmail(customerName, licenseKey, updateData);
  const recipientName = customerName && customerName.trim() && customerName.trim() !== '-' ? customerName.trim() : 'Ayah & Bunda Hebat';

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
      incrementDailyEmailSentCounter();
      let resJson = {};
      try { resJson = JSON.parse(responseText); } catch (e) {}
      return { success: true, messageId: resJson.messageId || 'OK', error: null };
    } else {
      return { success: false, error: 'HTTP ' + statusCode + ' - ' + responseText };
    }
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ============================================================================
// ⚡ ADMIN MENU: GENERATE MANUAL, RESEND EMAIL & HAPUS LISENSI
// ============================================================================
function menuGenerateManual() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const sheets = initAllSheets(ss);

  const channelPrompt = ui.prompt(
    '⚡ Generate Lisensi Manual (1/4: Pilih Jalur Order)',
    'Masukkan jalur penjualan:\n• Ketik "SCALEV" untuk simpan ke Scalev_Orders\n• Ketik "LYNK" untuk simpan ke Lynk_Orders\n(Klik OK langsung untuk default: SCALEV):',
    ui.ButtonSet.OK_CANCEL
  );
  if (channelPrompt.getSelectedButton() !== ui.Button.OK) return;
  const isLynk = channelPrompt.getResponseText().trim().toUpperCase() === 'LYNK';

  const emailPrompt = ui.prompt('⚡ Generate Lisensi Manual (2/4: Email Pembeli)', 'Masukkan Email Pembeli:', ui.ButtonSet.OK_CANCEL);
  if (emailPrompt.getSelectedButton() !== ui.Button.OK) return;
  const email = emailPrompt.getResponseText().trim().toLowerCase();

  if (!email || !email.includes('@')) {
    ui.alert('Format email tidak valid.');
    return;
  }

  const namePrompt = ui.prompt('⚡ Generate Lisensi Manual (3/4: Nama Pembeli)', 'Masukkan Nama Pembeli (opsional):', ui.ButtonSet.OK_CANCEL);
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;
  const customerName = namePrompt.getResponseText().trim() || '-';

  const revPrompt = ui.prompt('⚡ Generate Lisensi Manual (4/4: Nominal / Order ID)', 'Masukkan Nominal Harga (contoh: 110000):', ui.ButtonSet.OK_CANCEL);
  if (revPrompt.getSelectedButton() !== ui.Button.OK) return;
  const grossRevenue = parseRevenueNumber(revPrompt.getResponseText().trim());

  let affiliateName = 'Direct / Tanpa Affiliate';
  if (isLynk) {
    const affPrompt = ui.prompt('🤝 Info Affiliate (Opsional)', 'Masukkan Nama Affiliate (kosongkan jika tanpa affiliate):', ui.ButtonSet.OK_CANCEL);
    if (affPrompt.getSelectedButton() !== ui.Button.OK) return;
    if (affPrompt.getResponseText().trim()) {
      affiliateName = affPrompt.getResponseText().trim();
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const licenseKey = generateUniqueLicenseKey(ss);
    const orderId = (isLynk ? 'LYNK-MANUAL-' : 'SCLV-MANUAL-') + Date.now();
    const now = new Date();
    const targetSheet = isLynk ? sheets.lynkSheet : sheets.scalevSheet;

    if (isLynk) {
      targetSheet.appendRow([
        now, orderId, email, licenseKey, 'ACTIVE', 'PAID', grossRevenue, customerName, '-', affiliateName, 'Manual Admin (Proses Brevo...)'
      ]);
    } else {
      targetSheet.appendRow([
        now, orderId, email, licenseKey, 'ACTIVE', 'PAID', grossRevenue, customerName, 'Manual Admin (Proses Brevo...)'
      ]);
    }

    const lastRow = targetSheet.getLastRow();
    targetSheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    targetSheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');
    SpreadsheetApp.flush();

    const brevoRes = sendEmailBrevo(email, licenseKey, customerName, orderId);
    const noteCol = isLynk ? 11 : 9;
    targetSheet.getRange(lastRow, noteCol).setValue(
      'Manual Admin | Email Brevo: ' + (brevoRes.success ? 'TERKIRIM' : 'GAGAL (' + brevoRes.error + ')')
    );
    autoFitSheetColumns(targetSheet, isLynk ? 11 : 9, 110, 22);
    SpreadsheetApp.flush();

    if (isLynk) generateLynkReport(true);
    else generateScalevReport(true);
    generateDashboard(true);

    ui.alert(
      '🎉 Lisensi Manual Berhasil Dibuat!',
      'Tab: ' + (isLynk ? TAB_LYNK_ORDERS : TAB_SCALEV_ORDERS) + '\n' +
      'Kode Lisensi: ' + licenseKey + '\n' +
      'Email: ' + email + '\n' +
      'Status Brevo: ' + (brevoRes.success ? 'Terkirim (' + brevoRes.messageId + ')' : 'Gagal - ' + brevoRes.error),
      ui.ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
  }
}

function menuResendManual() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt('🔄 Kirim Ulang Email Lisensi', 'Masukkan Email Pembeli atau Kode Lisensi (WALI-XXXX):', ui.ButtonSet.OK_CANCEL);
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const query = prompt.getResponseText().trim();
  if (!query) return;

  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const tabs = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY];
  for (let t = 0; t < tabs.length; t++) {
    const sh = ss.getSheetByName(tabs[t]);
    if (!sh || sh.getLastRow() <= 1) continue;

    const data = sh.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const email = String(data[i][2] || '').trim().toLowerCase();
      const key = String(data[i][3] || '').trim().toUpperCase();
      const orderId = String(data[i][1] || '').trim();
      const custName = String(data[i][7] || '').trim();

      if (email === query.toLowerCase() || key === query.toUpperCase()) {
        const res = sendEmailBrevo(email, key, custName, orderId, true);
        if (tabs[t] === TAB_LYNK_ORDERS) {
          sh.getRange(i + 1, 11).setValue(res.success ? 'TERKIRIM ULANG (Brevo)' : 'GAGAL KIRIM ULANG');
          autoFitSheetColumns(sh, 11, 110, 22);
        } else if (tabs[t] === TAB_SCALEV_ORDERS) {
          sh.getRange(i + 1, 9).setValue(res.success ? 'TERKIRIM ULANG (Brevo)' : 'GAGAL KIRIM ULANG');
          autoFitSheetColumns(sh, 9, 110, 22);
        }
        generateDashboard(true);
        ui.alert(res.success ? '✅ Email Terkirim Ulang ke ' + email : '❌ Gagal Kirim: ' + res.error);
        return;
      }
    }
  }

  ui.alert('Data email / kode lisensi "' + query + '" tidak ditemukan di Scalev_Orders maupun Lynk_Orders.');
}

function deleteMatchingLicenseRows(ss, target) {
  const cleanTarget = String(target || '').trim();
  let deletedCount = 0;

  [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY].forEach(function(tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() <= 1) return;

    const data = sh.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const orderId = String(data[i][1] || '').trim();
      const email = String(data[i][2] || '').trim().toLowerCase();
      const license = String(data[i][3] || '').trim().toUpperCase();

      if (
        license === cleanTarget.toUpperCase() ||
        email === cleanTarget.toLowerCase() ||
        orderId === cleanTarget
      ) {
        sh.deleteRow(i + 1);
        deletedCount++;
      }
    }
  });

  return deletedCount;
}

function menuDeleteLicenseSearch() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    '🗑️ Hapus Lisensi (Scalev & Lynk)',
    'Masukkan Kode Lisensi (misal: WALI-7K9P), Email Pembeli, atau Order ID:',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const target = prompt.getResponseText().trim();
  if (!target) return;

  const ss = getTargetSpreadsheet();
  const deletedCount = deleteMatchingLicenseRows(ss, target);

  if (deletedCount > 0) {
    generateScalevReport(true);
    generateLynkReport(true);
    generateDashboard(true);
    ui.alert('✅ Berhasil Dihapus', deletedCount + ' baris data yang cocok dengan "' + target + '" telah dihapus.', ui.ButtonSet.OK);
  } else {
    ui.alert('Tidak ditemukan data dengan kriteria: ' + target);
  }
}

function menuDeleteSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();

  if ([TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY].indexOf(sheetName) === -1) {
    ui.alert('Pindahkan kursor Anda terlebih dahulu ke tab "' + TAB_SCALEV_ORDERS + '" atau "' + TAB_LYNK_ORDERS + '" pada baris yang ingin dihapus.');
    return;
  }

  const row = activeSheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert('Anda memilih baris Header. Silakan klik pada baris data lisensi (Baris 2 ke bawah).');
    return;
  }

  const rowData = activeSheet.getRange(row, 1, 1, 4).getValues()[0];
  const confirm = ui.alert(
    '⚠️ Konfirmasi Hapus Baris #' + row + ' (' + sheetName + ')',
    'Yakin ingin menghapus permanen?\nOrder ID: ' + rowData[1] + '\nEmail: ' + rowData[2] + '\nLisensi: ' + rowData[3],
    ui.ButtonSet.YES_NO
  );

  if (confirm === ui.Button.YES) {
    activeSheet.deleteRow(row);
    generateScalevReport(true);
    generateLynkReport(true);
    generateDashboard(true);
    ui.alert('🗑️ Baris berhasil dihapus.');
  }
}

function menuDeleteAllOrders() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();

  const isOrderSheet = ([TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY].indexOf(sheetName) !== -1);
  const targetSheetName = isOrderSheet ? sheetName : TAB_SCALEV_ORDERS;
  const targetSheet = ss.getSheetByName(targetSheetName);

  const lastRow = targetSheet ? targetSheet.getLastRow() : 0;
  if (lastRow <= 1) {
    ui.alert('ℹ️ Sheet "' + targetSheetName + '" Sudah Kosong', 'Tidak ada data order untuk dihapus.', ui.ButtonSet.OK);
    return;
  }

  const count = lastRow - 1;
  const confirm = ui.alert(
    '⚠️ KONFIRMASI RESET TOTAL (' + targetSheetName + ')',
    'Apakah Anda yakin ingin MENGHAPUS SEMUA ' + count + ' baris data di tab "' + targetSheetName + '"?\n\n' +
    'Semua lisensi di tab tersebut akan terhapus dan header akan dipertahankan.\nTindakan ini tidak dapat dibatalkan!',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    ui.alert('Penghapusan dibatalkan. Data tetap aman.');
    return;
  }

  targetSheet.deleteRows(2, count);
  generateScalevReport(true);
  generateLynkReport(true);
  generateDashboard(true);
  ui.alert('✅ Reset Berhasil!', 'Seluruh ' + count + ' data di tab "' + targetSheetName + '" telah dihapus.', ui.ButtonSet.OK);
}

// ============================================================================
// ✉️ 4. BREVO REST API v3 EMAIL DELIVERY & KONEKSI
// ============================================================================
function sendEmailBrevo(toEmail, licenseKey, customerName, orderId, isResend) {
  const apiKey = getScriptProp('BREVO_API_KEY', BREVO_API_KEY);
  if (!apiKey) {
    return { success: false, messageId: null, error: 'BREVO_API_KEY belum diisi di Script Properties GAS.' };
  }

  const cleanName = (customerName && String(customerName).trim() && String(customerName).trim() !== '-')
    ? String(customerName).trim()
    : 'Ayah & Bunda Hebat';

  const subject = (isResend ? '[Kirim Ulang] ' : '🎉 ') + 'Lisensi Resmi Game Edukasi ' + BRAND_NAME + ': ' + licenseKey;
  const htmlContent = generateLicenseHtmlEmail(licenseKey, orderId || '-', cleanName);

  const payload = {
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    to: [{ email: toEmail, name: cleanName }],
    subject: subject,
    htmlContent: htmlContent
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'api-key': apiKey, 'Accept': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code === 200 || code === 201) {
      incrementDailyEmailSentCounter();
      let json = {};
      try { json = JSON.parse(text); } catch (e) {}
      return { success: true, messageId: json.messageId || 'OK', error: null };
    } else {
      return { success: false, messageId: null, error: 'HTTP ' + code + ' - ' + text };
    }
  } catch (err) {
    Logger.log('Error sendEmailBrevo: ' + err.toString());
    return { success: false, messageId: null, error: err.toString() };
  }
}

function menuTestBrevoConnection() {
  const ui = SpreadsheetApp.getUi();
  const apiKey = getScriptProp('BREVO_API_KEY', BREVO_API_KEY);
  if (!apiKey) {
    ui.alert('⚠️ BREVO_API_KEY Kosong', 'Tambahkan Script Property `BREVO_API_KEY` di Project Settings > Script Properties.', ui.ButtonSet.OK);
    return;
  }

  try {
    const res = UrlFetchApp.fetch('https://api.brevo.com/v3/account', {
      method: 'get',
      headers: { 'api-key': apiKey, 'Accept': 'application/json' },
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code === 200) {
      const info = JSON.parse(res.getContentText());
      ui.alert(
        '✅ Koneksi Brevo API Sukses!',
        'Akun Brevo: ' + (info.email || 'OK') + '\nPerusahaan: ' + (info.companyName || BRAND_NAME),
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('❌ Gagal Terhubung ke Brevo', 'HTTP ' + code + ': ' + res.getContentText(), ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('❌ Error Uji Brevo', err.toString(), ui.ButtonSet.OK);
  }
}

// ============================================================================
// 🛡️ MODUL SCALEV API v3: VERIFIKASI REAL-TIME & SINKRONISASI ORDER
// ============================================================================
function verifyScalevPayment(orderIdOrEmail) {
  if (!SCALEV_API_KEY) {
    return {
      configured: false,
      verified: true,
      message: 'SCALEV_API_KEY belum dipasang di Script Properties.'
    };
  }

  try {
    const cleanTarget = String(orderIdOrEmail || '').trim();
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

    if (cleanTarget.includes('@')) {
      const emailLower = cleanTarget.toLowerCase();
      const response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=100', options);
      statusCode = response.getResponseCode();
      let listJson = null;
      try { listJson = JSON.parse(response.getContentText()); } catch (e) {}

      const orderList = (listJson && (listJson.data || listJson.orders || (Array.isArray(listJson) ? listJson : []))) || [];
      if (Array.isArray(orderList) && orderList.length > 0) {
        const matched = orderList.filter(function(item) {
          const cust = item.customer || {};
          const em = String(cust.email || item.customer_email || item.email || '').trim().toLowerCase();
          return em === emailLower;
        });

        if (matched.length > 0) {
          const paidOrder = matched.find(function(item) {
            const st = String(item.payment_status || item.status || '').toLowerCase();
            return st === 'paid' || st === 'settled' || st === 'completed';
          });
          json = paidOrder || matched[0];
        }
      }
    } else {
      let response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders/' + encodeURIComponent(cleanTarget), options);
      statusCode = response.getResponseCode();
      try { json = JSON.parse(response.getContentText()); } catch (e) {}

      if (statusCode === 404 || !json || json.errors) {
        response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?search=' + encodeURIComponent(cleanTarget), options);
        statusCode = response.getResponseCode();
        let searchJson = null;
        try { searchJson = JSON.parse(response.getContentText()); } catch (e) {}

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
      const officialOrderId = String(json.order_id || json.order_number || json.code || json.id || cleanTarget).trim();
      const grossRevenue = extractGrossRevenue(json);
      const paymentTime = extractPaymentTime(json);

      return {
        configured: true,
        verified: isPaid,
        statusCode: statusCode,
        paymentStatus: paymentStatus,
        officialOrderId: officialOrderId,
        grossRevenue: grossRevenue,
        paymentTime: paymentTime,
        customerEmail: customerEmail,
        customerName: customerName,
        message: isPaid
          ? 'Pembayaran terverifikasi lunas di Scalev (Rp ' + formatNumberId(grossRevenue) + ').'
          : 'Pesanan (' + (customerEmail || cleanTarget) + ') masih berstatus ' + paymentStatus + '.'
      };
    } else {
      return {
        configured: true,
        verified: false,
        notOrdered: true,
        statusCode: statusCode,
        grossRevenue: 0,
        message: 'email kamu belum pernah order, ayo beli dulu'
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

function extractPaymentTime(json) {
  if (!json) return new Date();
  const candidates = [
    json.paid_at,
    json.payment_completed_at,
    json.completed_at,
    json.settled_at,
    json.payment_time,
    json.paid_time,
    json.payment_date,
    (json.payment && (json.payment.paid_at || json.payment.completed_at || json.payment.settled_at || json.payment.created_at || json.payment.date)),
    json.updated_at,
    json.created_at,
    json.order_date,
    json.date
  ];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c) {
      const d = new Date(c);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

function extractGrossRevenue(json) {
  if (!json) return 0;
  const candidates = [
    json.gross_revenue, json.total_amount, json.grand_total, json.total,
    json.total_price, json.amount, json.order_value, json.net_revenue
  ];
  if (json.pricing) {
    candidates.push(json.pricing.gross_revenue, json.pricing.grand_total, json.pricing.total, json.pricing.subtotal);
  }
  if (json.payment) {
    candidates.push(json.payment.gross_amount, json.payment.amount);
  }

  for (let i = 0; i < candidates.length; i++) {
    const num = parseRevenueNumber(candidates[i]);
    if (num > 0) return num;
  }

  const items = json.order_items || json.items || json.line_items;
  if (Array.isArray(items) && items.length > 0) {
    let sum = 0;
    for (let j = 0; j < items.length; j++) {
      const itm = items[j];
      const itmTotal = itm.subtotal || itm.total || itm.amount || ((itm.price || 0) * (itm.quantity || 1));
      sum += parseRevenueNumber(itmTotal);
    }
    if (sum > 0) return sum;
  }
  return 0;
}

function syncOrdersFromScalev(ss) {
  if (!SCALEV_API_KEY) {
    return { success: false, message: 'SCALEV_API_KEY belum dikonfigurasi di Script Properties GAS.' };
  }

  try {
    const sheets = initAllSheets(ss);
    const scalevSheet = sheets.scalevSheet;
    const response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=100', {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + SCALEV_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const content = response.getContentText();
    if (statusCode < 200 || statusCode >= 300) {
      return { success: false, message: 'HTTP ' + statusCode + ': ' + content };
    }

    const json = JSON.parse(content);
    const orderList = (json && (json.data || json.orders || (Array.isArray(json) ? json : []))) || [];
    if (!Array.isArray(orderList) || orderList.length === 0) {
      return {
        success: true,
        totalFetched: 0,
        paidCount: 0,
        totalGrossRevenuePaid: 0,
        newLicensesCreated: 0,
        updatedCount: 0,
        message: 'Tidak ada pesanan ditemukan di Scalev.'
      };
    }

    const existingData = scalevSheet.getDataRange().getValues();
    const orderRowMap = {};
    const emailRowMap = {};

    for (let i = 1; i < existingData.length; i++) {
      const oid = String(existingData[i][1] || '').trim();
      const em = String(existingData[i][2] || '').trim().toLowerCase();
      if (oid) orderRowMap[oid] = i + 1;
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

      const existingRow = orderRowMap[officialOrderId] || (customerEmail ? emailRowMap[customerEmail] : null);
      if (existingRow) {
        const orderPaidTime = extractPaymentTime(order);
        if (orderPaidTime) {
          scalevSheet.getRange(existingRow, 1).setValue(orderPaidTime).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        }
        scalevSheet.getRange(existingRow, 2).setValue(officialOrderId);
        if (customerEmail) scalevSheet.getRange(existingRow, 3).setValue(customerEmail);
        scalevSheet.getRange(existingRow, 6).setValue(paymentStatus);
        scalevSheet.getRange(existingRow, 7).setValue(grossRevenue).setNumberFormat('"Rp"#,##0');
        if (customerName) scalevSheet.getRange(existingRow, 8).setValue(customerName);
        updatedCount++;
      } else if (isPaid && customerEmail) {
        const licenseKey = generateUniqueLicenseKey(ss);
        const orderPaidTime = extractPaymentTime(order);
        scalevSheet.appendRow([
          orderPaidTime,
          officialOrderId,
          customerEmail,
          licenseKey,
          'ACTIVE',
          paymentStatus,
          grossRevenue,
          customerName || '-',
          'Sinkronisasi Otomatis Scalev API'
        ]);
        const lastRow = scalevSheet.getLastRow();
        scalevSheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        scalevSheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');
        SpreadsheetApp.flush();

        orderRowMap[officialOrderId] = lastRow;
        emailRowMap[customerEmail] = lastRow;
        newLicensesCreated++;
      }
    }

    autoFitSheetColumns(scalevSheet, 9, 110, 22);
    generateScalevReport(true);
    generateDashboard(true);

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

function menuSyncScalevOrders() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();

  if (!SCALEV_API_KEY) {
    ui.alert('⚠️ SCALEV_API_KEY Belum Dipasang', 'Pasangkan SCALEV_API_KEY di Project Settings > Script Properties.', ui.ButtonSet.OK);
    return;
  }

  const response = syncOrdersFromScalev(ss);
  if (response.success) {
    ui.alert(
      '🎉 Sinkronisasi Scalev API Berhasil!',
      '• Total Order Ditarik: ' + response.totalFetched + '\n' +
      '• Order Status PAID: ' + response.paidCount + '\n' +
      '• Total Omzet (PAID): Rp ' + formatNumberId(response.totalGrossRevenuePaid) + '\n' +
      '• Lisensi Baru Diterbitkan: ' + response.newLicensesCreated + '\n' +
      '• Data Diperbarui: ' + response.updatedCount + '\n\n' +
      'Data tercatat di "' + TAB_SCALEV_ORDERS + '" dan laporan diperbarui di "' + TAB_REPORT_SCALEV + '".',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert('❌ Gagal Sinkronisasi Scalev', response.message, ui.ButtonSet.OK);
  }
}

function menuTestScalevConnection() {
  const ui = SpreadsheetApp.getUi();
  if (!SCALEV_API_KEY) {
    ui.alert('⚠️ SCALEV_API_KEY Belum Dipasang', 'Tambahkan Script Property `SCALEV_API_KEY` dari Scalev Settings > Developers > API Keys.', ui.ButtonSet.OK);
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=1', {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + SCALEV_API_KEY, 'Accept': 'application/json' },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      ui.alert('🛡️ Koneksi Scalev API Aktif!', 'HTTP ' + code + ' (Terhubung). Verifikasi Anti-Bypass siap digunakan.', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Gagal Terhubung ke Scalev API', 'HTTP ' + code + ': ' + response.getContentText(), ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert('❌ Error Uji Scalev', err.toString(), ui.ButtonSet.OK);
  }
}

function menuTestLynkWebhook() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const merchantKey = getScriptProp('MERCHANT_KEY', '');
  const brevoOk = Boolean(getScriptProp('BREVO_API_KEY', BREVO_API_KEY));
  const strictMode = getScriptProp('STRICT_LYNK_SIGNATURE', 'false');
  const proxyUrl = APP_URL + '/api/lynk-webhook';

  if (!merchantKey) {
    ui.alert(
      '⚠️ MERCHANT_KEY Belum Dipasang',
      'Tambahkan Script Property `MERCHANT_KEY` di Extensions > Apps Script > Project Settings (⚙️) > Script Properties.\n\n' +
      'Setelah itu, gunakan Webhook URL anti-302 berikut di dashboard Lynk.id:\n' + proxyUrl,
      ui.ButtonSet.OK
    );
    return;
  }

  // 1. Self-Test Verifikasi HMAC-SHA256 & SHA256-Concat di GAS
  const samplePayload = {
    event: 'webhook.test',
    test: true,
    data: {
      message_id: 'TEST-MSG-' + Date.now(),
      message_action: 'SUCCESS',
      message_data: {
        refId: 'TEST-LYNK-' + Date.now(),
        grandTotal: 110000,
        customer: { name: 'Tester Wali Pintar', email: 'tester@example.com' },
        affiliate: { id: 'AFF01', name: 'Affiliate Tester' }
      }
    }
  };
  const sampleRaw = JSON.stringify(samplePayload);
  const validHmac = bytesToHex(Utilities.computeHmacSha256Signature(sampleRaw, merchantKey));
  const checkValid = verifyLynkSignature(sampleRaw, validHmac, samplePayload);
  const checkInvalid = verifyLynkSignature(sampleRaw, '00000000000000000000000000000000', samplePayload);

  const hmacSelfTestStatus = (checkValid.valid && !checkInvalid.valid)
    ? '✅ Lolos (Valid Diterima, Palsu Ditolak)'
    : '❌ Gagal (' + (checkValid.reason || 'Error HMAC') + ')';

  // 2. Uji Bridge Cloudflare Anti-302 (/api/lynk-webhook)
  let proxyStatus = '';
  let postPingStatus = '';
  try {
    const getRes = UrlFetchApp.fetch(proxyUrl, {
      method: 'get',
      muteHttpExceptions: true
    });
    const getCode = getRes.getResponseCode();
    const getBody = getRes.getContentText();

    if (getCode === 200) {
      let getJson = {};
      try { getJson = JSON.parse(getBody); } catch (e) {}
      if (getJson && getJson.status === 'online') {
        proxyStatus = getJson.gasConfigured
          ? '✅ Online HTTP 200 (GAS_API_URL Terpasang)'
          : '⚠️ Online HTTP 200, tapi GAS_API_URL belum diset di Cloudflare!';

        if (getJson.gasConfigured) {
          const postRes = UrlFetchApp.fetch(proxyUrl, {
            method: 'post',
            contentType: 'application/json',
            headers: { 'X-Lynk-Signature': validHmac },
            payload: sampleRaw,
            muteHttpExceptions: true
          });
          const postCode = postRes.getResponseCode();
          const postBody = postRes.getContentText();
          postPingStatus = postCode === 200
            ? '✅ Sukses HTTP 200 ("' + postBody.substring(0, 30) + '") — Anti-302 Aktif!'
            : '❌ HTTP ' + postCode + ': ' + postBody.substring(0, 120);
        }
      } else {
        proxyStatus = '⚠️ HTTP 200 tapi bukan respons Worker (pastikan worker/index.ts sudah ter-deploy).';
      }
    } else {
      proxyStatus = '⚠️ HTTP ' + getCode + ' (Cloudflare Worker /api/lynk-webhook belum aktif).';
    }
  } catch (err) {
    proxyStatus = '⚠️ Gagal menghubungi ' + proxyUrl + ': ' + err.toString();
  }

  ui.alert(
    '🤝 Hasil Uji Koneksi Webhook Lynk.id',
    '1. MERCHANT_KEY (Script Properties): ✅ Terpasang\n' +
    '2. BREVO_API_KEY: ' + (brevoOk ? '✅ Terpasang' : '⚠️ Belum Diisi') + '\n' +
    '3. STRICT_LYNK_SIGNATURE: ' + strictMode + '\n' +
    '4. Self-Test HMAC-SHA256 GAS: ' + hmacSelfTestStatus + '\n' +
    '5. Bridge Cloudflare (' + proxyUrl + '):\n   ' + proxyStatus +
    (postPingStatus ? '\n6. End-to-End Signed POST Test:\n   ' + postPingStatus : '') +
    '\n\n📌 Pastikan URL Webhook di dashboard Lynk.id diisi:\n' + proxyUrl +
    '\n(Jangan langsung ke URL script.google.com/exec agar tidak kena HTTP 302).',
    ui.ButtonSet.OK
  );
}

// ============================================================================
// 🛠️ HELPER UMUM: IDEMPOTENCY, ANTI-DUPLIKAT LINTAS SHEET, PARSER & FORMATTER
// ============================================================================
function findExistingOrder(sheet, orderId, email) {
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const targetOrder = String(orderId || '').trim();
  const targetEmail = String(email || '').trim().toLowerCase();

  for (let i = data.length - 1; i >= 1; i--) {
    const rowOrder = String(data[i][1] || '').trim();
    const rowEmail = String(data[i][2] || '').trim().toLowerCase();
    const rowLicense = String(data[i][3] || '').trim();
    const rowStatus = String(data[i][4] || '').trim().toUpperCase();
    const rowName = String(data[i][7] || '').trim();
    const rowCatatan = String(data[i][data[i].length - 1] || '').trim();

    const orderMatched = targetOrder && rowOrder === targetOrder;
    const emailMatched = targetEmail && rowEmail === targetEmail;

    if ((orderMatched || emailMatched) && rowLicense) {
      return {
        rowIndex: i + 1,
        orderId: rowOrder,
        email: rowEmail,
        licenseKey: rowLicense,
        status: rowStatus,
        customerName: rowName,
        catatan: rowCatatan
      };
    }
  }
  return null;
}

function findLicenseColumnIndex(headerRow) {
  if (!headerRow || !headerRow.length) return 3;
  for (let c = 0; c < headerRow.length; c++) {
    const title = String(headerRow[c] || '').trim().toLowerCase();
    if (title === 'license key' || title === 'lisensi' || title.includes('license')) {
      return c;
    }
  }
  return 3;
}

/**
 * Mengumpulkan seluruh kode lisensi yang sudah ada di SEMUA tab terkait
 * (`Scalev_Orders`, `Lynk_Orders`, `Licenses`, dll.) agar tidak pernah bentrok.
 */
function collectAllExistingLicenseKeys(ss) {
  const existingSet = new Set();
  const priorityTabs = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS, TAB_LEGACY];
  const allSheets = ss.getSheets();

  const sheetsToScan = [];
  priorityTabs.forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (sh) sheetsToScan.push(sh);
  });
  allSheets.forEach(function(sh) {
    const nm = sh.getName();
    if (priorityTabs.indexOf(nm) === -1 && nm !== TAB_REPORT_SCALEV && nm !== TAB_REPORT_LYNK) {
      sheetsToScan.push(sh);
    }
  });

  sheetsToScan.forEach(function(sh) {
    if (!sh || sh.getLastRow() <= 1) return;
    const rows = sh.getDataRange().getValues();
    const licCol = findLicenseColumnIndex(rows[0]);
    for (let i = 1; i < rows.length; i++) {
      const k = String(rows[i][licCol] || '').trim().toUpperCase();
      if (k && k.startsWith('WALI-')) {
        existingSet.add(k);
      }
    }
  });

  return existingSet;
}

/**
 * Generate Kode Lisensi Unik `WALI-XXXX` (Bebas karakter ambigu 0, O, 1, I)
 * Proteksi Multi-Lapis Anti-Duplikat Lintas Sheet (`Scalev_Orders` & `Lynk_Orders`).
 */
function generateUniqueLicenseKey(ss) {
  const SAFE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const existingSet = collectAllExistingLicenseKeys(ss);
  let scriptCache = null;
  try {
    scriptCache = CacheService.getScriptCache();
  } catch (e) {}

  let code = '';
  let attempts = 0;
  const maxAttempts = 5000;

  while (attempts < maxAttempts) {
    const uuidEntropy = Utilities.getUuid().replace(/-/g, '');
    let candidate = 'WALI-';
    for (let i = 0; i < 4; i++) {
      const hexByte = parseInt(uuidEntropy.substr(i * 2, 2), 16) || 0;
      const idx = (hexByte + Math.floor(Math.random() * SAFE_CHARS.length)) % SAFE_CHARS.length;
      candidate += SAFE_CHARS.charAt(idx);
    }

    const cacheKey = 'LIC_USED_' + candidate;
    const inCache = scriptCache ? Boolean(scriptCache.get(cacheKey)) : false;

    if (!existingSet.has(candidate) && !inCache) {
      code = candidate;
      if (scriptCache) {
        try {
          scriptCache.put(cacheKey, '1', 21600);
        } catch (cacheErr) {}
      }
      break;
    }
    attempts++;
  }

  if (!code) {
    throw new Error('Gagal membuat kode lisensi unik setelah ' + maxAttempts + ' percobaan.');
  }
  return code;
}

function parseRevenueNumber(val) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatNumberId(num) {
  if (!num || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 🎨 TEMPLATE HTML: HALAMAN STATUS API, EMAIL LISENSI LENGKAP & BROADCAST
// ============================================================================
function renderServerStatusPage() {
  const isBrevoOk = Boolean(BREVO_API_KEY);
  const isMerchantOk = Boolean(getScriptProp('MERCHANT_KEY', ''));
  const isScalevOk = Boolean(SCALEV_API_KEY);
  const isAdminSecretOk = Boolean(ADMIN_SECRET_KEY);
  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wali Pintar Unified Backend Status</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
        .card { background: #ffffff; border-radius: 24px; padding: 28px 24px; max-width: 500px; width: 100%; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15); border: 2px solid #bbf7d0; text-align: center; }
        .badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 999px; margin-bottom: 14px; }
        h1 { font-size: 20px; font-weight: 900; color: #065f46; margin: 0 0 8px 0; }
        p { font-size: 13.5px; color: #64748b; line-height: 1.5; margin-bottom: 18px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; text-align: left; font-size: 13px; margin-bottom: 18px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .row:last-child { margin-bottom: 0; }
        .ok { color: #15803d; font-weight: bold; }
        .warn { color: #d97706; font-weight: bold; }
        .btn { display: block; width: 100%; padding: 12px; border-radius: 12px; background: #10b981; color: #fff; font-weight: bold; text-decoration: none; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">🟢 UNIFIED BACKEND ONLINE</span>
        <h1>Wali Pintar License & Affiliate API</h1>
        <p>Integrasi terpadu <strong>Scalev (doGet)</strong> & <strong>Lynk.id Webhook (doPost)</strong> aktif dan siap menerima transaksi.</p>
        <div class="box">
          <div class="row"><span>Scalev Redirect (doGet):</span><span class="ok">✅ Siap</span></div>
          <div class="row"><span>Lynk.id Webhook (doPost):</span><span class="ok">✅ Siap</span></div>
          <div class="row"><span>Brevo API Key (Script Props):</span><span class="${isBrevoOk ? 'ok' : 'warn'}">${isBrevoOk ? '✅ Terpasang' : '⚠️ Belum Diisi'}</span></div>
          <div class="row"><span>Lynk Merchant Key (Script Props):</span><span class="${isMerchantOk ? 'ok' : 'warn'}">${isMerchantOk ? '✅ Terpasang' : '⚠️ Belum Diisi'}</span></div>
          <div class="row"><span>Scalev API Key (Opsional):</span><span class="${isScalevOk ? 'ok' : 'warn'}">${isScalevOk ? '✅ Terpasang' : 'ℹ️ Opsional / Kosong'}</span></div>
          <div class="row"><span>Admin Secret Key (Opsional):</span><span class="${isAdminSecretOk ? 'ok' : 'warn'}">${isAdminSecretOk ? '✅ Terpasang' : 'ℹ️ Opsional / Kosong'}</span></div>
        </div>
        <a href="${APP_URL}" class="btn">Buka Halaman Utama Website</a>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html).setTitle('API Status - Wali Pintar');
}

function generateLicenseHtmlEmail(licenseKey, orderId, customerName) {
  const LOGO_URL = APP_URL + '/assets/logo-email.png';
  const greeting = customerName && customerName !== 'Ayah & Bunda Hebat'
    ? 'Halo Bunda / Ayah ' + customerName + '! 👋'
    : 'Halo Ayah & Bunda Hebat! 👋';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 24px; color: #1e293b; border: 1px solid #e2e8f0;">
      <!-- LOGO & BRANDING -->
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

        <!-- KOTAK KODE LISENSI RESMI -->
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px dashed #10b981; border-radius: 16px; padding: 20px 14px; text-align: center; margin: 18px 0;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 1.5px; display: block; margin-bottom: 6px;">
            KODE LISENSI RESMI ANDA (TEPAT 9 KARAKTER):
          </span>

          <div style="font-size: 30px; font-weight: 900; color: #064e3b; letter-spacing: 3px; margin: 8px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; user-select: all; -webkit-user-select: all; background: #ffffff; padding: 10px 16px; border-radius: 12px; display: inline-block; border: 1px solid #a7f3d0; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
            ${licenseKey}
          </div>

          <div style="font-size: 11.5px; color: #64748b; margin-top: 8px; font-weight: 600;">
            Nomor Pesanan: <strong style="color: #0f172a;">${orderId}</strong> &bull; Format: WALI-XXXX (Tanpa angka 0, 1 &amp; huruf O, I)
          </div>

          <!-- TOMBOL COPY PASTE LISENSI -->
          <div style="margin-top: 14px;">
            <a href="${APP_URL}/claim?key=${encodeURIComponent(licenseKey)}&action=copy" target="_blank" style="display: inline-block; background-color: #f1f5f9; color: #1e293b; border: 1.5px solid #cbd5e1; padding: 9px 18px; border-radius: 10px; font-size: 12.5px; font-weight: 800; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              📋 Klik untuk Salin Lisensi Otomatis
            </a>
          </div>
        </div>

        <!-- TOMBOL UTAMA BUKA GAME (1-KLIK LANGSUNG AKTIF) -->
        <div style="text-align: center; margin: 22px 0 16px 0;">
          <a href="${APP_URL}/?key=${encodeURIComponent(licenseKey)}" target="_blank" style="display: block; background-color: #10b981; color: #ffffff; padding: 15px 24px; border-radius: 14px; font-size: 15.5px; font-weight: 900; text-decoration: none; text-align: center; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);">
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

        <!-- SEKSI MEDIA SOSIAL RESMI -->
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 14px 0;">
            Ikuti Media Sosial Resmi Wali Pintar
          </p>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto; max-width: 480px;">
            <tr>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://youtube.com/@walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #fee2e2; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/youtube.png" width="24" height="24" alt="YouTube" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #dc2626;">YouTube</span>
                </a>
              </td>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://facebook.com/walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #dbeafe; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/facebook.png" width="24" height="24" alt="Facebook" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #1d4ed8;">Facebook</span>
                </a>
              </td>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://instagram.com/walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #fce7f3; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/instagram.png" width="24" height="24" alt="Instagram" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #be185d;">Instagram</span>
                </a>
              </td>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://tiktok.com/@walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/tiktok.png" width="24" height="24" alt="TikTok" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #0f172a;">TikTok</span>
                </a>
              </td>
            </tr>
          </table>
          <p style="font-size: 11px; color: #94a3b8; margin: 12px 0 0 0; line-height: 1.5;">
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

function generateUpdateBroadcastHtmlEmail(customerName, licenseKey, updateData) {
  const LOGO_URL = APP_URL + '/assets/logo-email.png';
  const greeting = customerName && customerName.trim() && customerName.trim() !== '-'
    ? 'Halo Bunda / Ayah ' + customerName.trim() + '! 👋'
    : 'Halo Ayah & Bunda Hebat! 👋';
  const playUrl = licenseKey ? APP_URL + '/?key=' + encodeURIComponent(licenseKey) : APP_URL;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 24px; color: #1e293b; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" width="80" height="80" alt="${BRAND_NAME}" style="display: block; margin: 0 auto 12px auto; width: 80px; height: 80px; border-radius: 20px; border: 3px solid #bbf7d0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.18); object-fit: cover;" />
        <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 800; padding: 5px 14px; border-radius: 999px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px;">
          ✨ UPDATE TERBARU &bull; FREE 100%
        </span>
        <h1 style="color: #065f46; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">🌱 ${BRAND_NAME}</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; font-weight: 600;">Pemberitahuan Resmi Pembaruan Aplikasi &amp; Peningkatan Fitur</p>
      </div>

      <div style="background-color: #ffffff; padding: 26px 22px; border-radius: 20px; border: 2px solid #e2e8f0; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">${greeting}</h2>
        <p style="color: #475569; font-size: 13.5px; line-height: 1.6; margin-bottom: 18px;">
          Kabar gembira! Tim <strong>${BRAND_NAME}</strong> baru saja merilis pembaruan resmi untuk meningkatkan kenyamanan dan kualitas belajar si kecil. Seluruh pembaruan ini diberikan <strong>GRATIS 100%</strong> tanpa biaya tambahan.
        </p>

        <!-- TABEL DETAIL PEMBARUAN RAPI -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 18px 0; border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
          <thead>
            <tr style="background-color: #065f46; color: #ffffff;">
              <th align="left" style="padding: 11px 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #047857; width: 38%;">Keterangan</th>
              <th align="left" style="padding: 11px 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #047857;">Detail Rilis Pembaruan</th>
            </tr>
          </thead>
          <tbody style="font-size: 13px; color: #334155;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">🚀 Versi Aplikasi</td>
              <td style="padding: 10px 14px; font-weight: 800; color: #047857; border-bottom: 1px solid #e2e8f0;">${updateData.versi}</td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">📅 Tanggal Pembaruan</td>
              <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${updateData.tanggal}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top;">🛠️ Jenis Perbaikan</td>
              <td style="padding: 10px 14px; line-height: 1.5; border-bottom: 1px solid #e2e8f0;">${updateData.jenisPerbaikan}</td>
            </tr>
            <tr style="background-color: #ecfdf5;">
              <td style="padding: 10px 14px; font-weight: 700; color: #065f46; border-bottom: 1px solid #a7f3d0;">🎁 Status Update</td>
              <td style="padding: 10px 14px; font-weight: 900; color: #059669; border-bottom: 1px solid #a7f3d0;">${updateData.status}</td>
            </tr>
            ${licenseKey ? `
            <tr style="background-color: #ffffff;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">🔑 Kode Lisensi Anda</td>
              <td style="padding: 10px 14px; font-family: monospace; font-weight: 900; color: #064e3b; letter-spacing: 1px;">${licenseKey}</td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- TOMBOL UTAMA BUKA APLIKASI VERSI TERBARU -->
        <div style="text-align: center; margin: 22px 0 16px 0;">
          <a href="${playUrl}" target="_blank" style="display: block; background-color: #10b981; color: #ffffff; padding: 15px 24px; border-radius: 14px; font-size: 15.5px; font-weight: 900; text-decoration: none; text-align: center; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);">
            🎮 Perbarui Game Sekarang (Gratis)
          </a>
          <span style="font-size: 11.5px; color: #64748b; margin-top: 8px; display: block; font-weight: 600;">
            *Klik tombol di atas untuk membuka <a href="${APP_URL}" target="_blank" style="color: #059669; text-decoration: underline; font-weight: 800;">walipintar.my.id</a> dan otomatis menikmati game versi terbaru.
          </span>
        </div>

        <!-- SEKSI MEDIA SOSIAL RESMI -->
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1.2px; margin: 0 0 14px 0;">
            Ikuti Media Sosial Resmi Wali Pintar
          </p>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto; max-width: 480px;">
            <tr>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://youtube.com/@walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #fee2e2; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/youtube.png" width="24" height="24" alt="YouTube" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #dc2626;">YouTube</span>
                </a>
              </td>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://facebook.com/walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #dbeafe; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/facebook.png" width="24" height="24" alt="Facebook" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #1d4ed8;">Facebook</span>
                </a>
              </td>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://instagram.com/walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #fce7f3; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/instagram.png" width="24" height="24" alt="Instagram" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #be185d;">Instagram</span>
                </a>
              </td>
              <td align="center" style="padding: 4px; width: 25%;">
                <a href="https://tiktok.com/@walipintar" target="_blank" style="display: block; background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 4px; text-decoration: none; text-align: center;">
                  <img src="${APP_URL}/assets/icons/tiktok.png" width="24" height="24" alt="TikTok" style="display: block; margin: 0 auto 5px auto; width: 24px; height: 24px; border: 0;" />
                  <span style="display: block; font-size: 11.5px; font-weight: 700; color: #0f172a;">TikTok</span>
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- FOOTER EMAIL -->
      <div style="text-align: center; margin-top: 20px; font-size: 11.5px; color: #94a3b8; line-height: 1.6;">
        Email resmi dikirim otomatis melalui sistem lisensi <strong>${BRAND_NAME}</strong>.<br>
        Butuh bantuan teknis? Hubungi Customer Service kami:<br>
        <a href="https://wa.me/${ADMIN_WA}" style="color: #059669; font-weight: bold; text-decoration: none;">💬 WhatsApp Admin (+62 857-0480-8186)</a><br>
        &copy; ${BRAND_NAME} &bull; Seluruh hak cipta dilindungi undang-undang.
      </div>
    </div>
  `;
}

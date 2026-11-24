/**
 * ============================================================================
 * WALI PINTAR UNIFIED LICENSE, AFFILIATE & ADMIN SYSTEM (GOOGLE APPS SCRIPT V8)
 * ============================================================================
 * Arsitektur Terpadu Lengkap:
 * 1. Scalev (Meta Ads - Redirect URL)  -> ditangani oleh `doGet(e)` -> tab `Scalev_Orders`
 * 2. Lynk.id (Affiliate - Webhook POST)-> ditangani oleh `doPost(e)` -> tab `Lynk_Orders`
 * 3. Frontend Web Game (`?action=check`, `?action=create`, `?action=resend`)
 *    -> Mengecek lintas tab `Scalev_Orders` dan `Lynk_Orders`
 * 4. Email Delivery 100% Brevo REST API v3 (UrlFetchApp, tanpa MailApp/Gmail limit)
 *    + Template lengkap: Tombol Salin Otomatis, 1-Klik Main, Panduan PWA Offline, & Sosmed.
 * 5. Proteksi Anti-Duplikat Lintas Sheet (`Scalev_Orders` vs `Lynk_Orders`):
 *    LockService + Pemindaian Dinamis Semua Tab + CacheService + SpreadsheetApp.flush().
 * 6. Menu Lengkap Google Sheets:
 *    - 📊 Menu Laporan: Generate `Report_Scalev`, `lynk_affiliate` (Komisi Affiliate), & Cek Duplikat.
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
 * 6. `BREVO_SENDER_EMAIL`    : (Wajib jika beda) Email pengirim terverifikasi Brevo (default: admin@walipintar.my.id)
 * 7. `BREVO_SENDER_NAME`     : (Opsional) Nama pengirim email Brevo (default: Admin Wali Pintar)
 * 8. `DEVELOPER_EMAIL`       : (Wajib untuk alert error) Gmail developer penerima laporan Error_Log 18:01 WIB
 * 9. `STRICT_LYNK_SIGNATURE` : (Opsional) Set "true" jika memakai reverse proxy
 *                              (misal Cloudflare Worker) yang meneruskan header X-Lynk-Signature.
 * 10. Opsional Brand/URL     : `BRAND_NAME`, `APP_URL`, `SCALEV_URL`, `LYNK_LP_URL`, `ADMIN_WA`
 * ============================================================================
 */

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

// ======================= [ KONFIGURASI SPREADSHEET & TAB ] =======================
const TAB_SCALEV_ORDERS = 'Scalev_Orders';
const TAB_LYNK_ORDERS   = 'Lynk_Orders';
const TAB_REPORT_SCALEV = 'Report_Scalev';
const TAB_REPORT_LYNK   = 'lynk_affiliate';
const TAB_DASHBOARD     = 'Dashboard';
const TAB_ERROR_LOG        = 'Error_Log';
const TAB_LOGVERSI         = 'Logversi WPApp';
const TAB_BLOCKED_LICENSES = 'Lisensi terblokir';
const TAB_ORDERS_SNAPSHOT  = '_Snapshot_Orders';

const DEFAULT_AFFILIATE_COMMISSION_RATE = 20; // Default komisi affiliate 20%
const EMAIL_RESEND_COOLDOWN_DAYS = 90;       // Kirim ulang email Brevo maksimal 1x per 3 bulan (90 hari)
const ERROR_LOG_TTL_HOURS = 24;              // Error satu-kali yang tidak terulang > 24 jam otomatis dibersihkan

// Konfigurasi Brand & URL (bisa dioverride langsung lewat Properti Skrip GAS tanpa edit kode)
const BRAND_NAME  = getScriptProp('BRAND_NAME', 'Wali Pintar');
const APP_URL     = getScriptProp('APP_URL', 'https://walipintar.my.id');
const SCALEV_URL  = getScriptProp('SCALEV_URL', 'https://walipintar.myscalev.com/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia');
const LYNK_LP_URL = getScriptProp('LYNK_LP_URL', 'https://javapedia.lynk.id/p/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia');
const ADMIN_WA    = getScriptProp('ADMIN_WA', '6285704808186');

// Semua kredensial & email dibaca eksklusif dari GAS Script Properties (tanpa edit kode manual)
const SPREADSHEET_ID     = getScriptProp('SPREADSHEET_ID', '');
const ADMIN_SECRET_KEY   = getScriptProp('ADMIN_SECRET_KEY', '');
const BREVO_API_KEY      = getScriptProp('BREVO_API_KEY', '');
const BREVO_SENDER_NAME  = getScriptProp('BREVO_SENDER_NAME', 'Admin Wali Pintar');
const BREVO_SENDER_EMAIL = getScriptProp('BREVO_SENDER_EMAIL', 'admin@walipintar.my.id');
const SCALEV_API_KEY     = getScriptProp('SCALEV_API_KEY', '');

function getBrevoSenderName() {
  return getScriptProp('BREVO_SENDER_NAME', BREVO_SENDER_NAME);
}

function getBrevoSenderEmail() {
  return getScriptProp('BREVO_SENDER_EMAIL', BREVO_SENDER_EMAIL);
}

function getDeveloperEmail() {
  const fromProp = getScriptProp('DEVELOPER_EMAIL', '');
  return (fromProp && fromProp.includes('@')) ? fromProp : '';
}

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
  Logger.log('✅ 1. Tab "' + TAB_SCALEV_ORDERS + '", "' + TAB_LYNK_ORDERS + '", & "' + TAB_ERROR_LOG + '" siap.');

  generateScalevReport(true);
  generateLynkReport(true);
  generateDashboard(true);
  try {
    setupErrorMonitorTrigger(true);
    setupBlockedLicenseMonitorTrigger(true);
    Logger.log('✅ 2. Tab laporan, Lisensi terblokir & Dashboard disegarkan + trigger monitor aktif.');
  } catch (trigErr) {
    Logger.log('ℹ️ 2. Tab laporan & Dashboard disegarkan. Trigger monitor: ' + trigErr.toString());
  }

  if (!getScriptProp('BREVO_API_KEY', BREVO_API_KEY)) {
    Logger.log('⚠️ 3. BREVO_API_KEY belum diisi di Properti Skrip GAS.');
  } else {
    Logger.log('✅ 3. BREVO_API_KEY terpasang | Pengirim: ' + getBrevoSenderName() + ' <' + getBrevoSenderEmail() + '>');
  }

  const merchantKey = getScriptProp('MERCHANT_KEY', '');
  if (!merchantKey) {
    Logger.log('⚠️ 4. MERCHANT_KEY (Lynk.id Webhook) belum diisi di Properti Skrip GAS.');
  } else {
    Logger.log('✅ 4. MERCHANT_KEY terpasang di Properti Skrip GAS (Lynk.id HMAC Verification siap).');
  }

  const devEmail = getDeveloperEmail();
  if (!devEmail) {
    Logger.log('⚠️ 5. DEVELOPER_EMAIL belum diisi di Properti Skrip GAS (wajib untuk kirim digest Error_Log 18:01 WIB).');
  } else {
    Logger.log('✅ 5. DEVELOPER_EMAIL terpasang di Properti Skrip GAS: ' + devEmail);
  }

  if (!getScriptProp('SCALEV_API_KEY', SCALEV_API_KEY)) {
    Logger.log('ℹ️ 6. SCALEV_API_KEY belum diisi di Properti Skrip GAS (opsional untuk sync & anti-bypass klaim).');
  } else {
    Logger.log('✅ 6. SCALEV_API_KEY terpasang di Properti Skrip GAS.');
  }

  if (!getScriptProp('ADMIN_SECRET_KEY', ADMIN_SECRET_KEY)) {
    Logger.log('ℹ️ 7. ADMIN_SECRET_KEY belum diisi di Properti Skrip GAS (opsional untuk API delete/broadcast).');
  } else {
    Logger.log('✅ 7. ADMIN_SECRET_KEY terpasang di Properti Skrip GAS.');
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
    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight('bold')
    .setBackground(headerBg || '#0369a1')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);

  return sheet;
}

function initAllSheets(ss) {
  // 1. Migrasi otomatis: ganti nama `Report_Lynk` -> `lynk_affiliate` (pertahankan rate komisi)
  const oldReportLynk = ss.getSheetByName('Report_Lynk');
  const currentReportLynk = ss.getSheetByName(TAB_REPORT_LYNK);
  if (oldReportLynk && !currentReportLynk) {
    oldReportLynk.setName(TAB_REPORT_LYNK);
  } else if (oldReportLynk && currentReportLynk && ss.getSheets().length > 1) {
    ss.deleteSheet(oldReportLynk);
  }

  // 2. Pastikan tab utama tersedia terlebih dahulu (Scalev: Biru Laut #0369a1, Lynk: Hijau Botol #065f46)
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
  ], '#0369a1');

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
  ], '#065f46');

  ensureSheetHeaders(ss, TAB_REPORT_SCALEV, [
    'Total Omzet',
    'Total Transaksi',
    'Lisensi Aktif'
  ], '#0369a1');

  ensureSheetHeaders(ss, TAB_REPORT_LYNK, [
    'Nama Affiliate',
    'Total Transaksi',
    'Total Omzet',
    'Rate Komisi (%)',
    'Total Komisi'
  ], '#065f46');

  ensureSheetHeaders(ss, TAB_ERROR_LOG, [
    'Jam Mulai Error',
    'Terakhir Terjadi',
    'Progress',
    'Sumber',
    'Order / Ref ID',
    'Email Terkait',
    'Kejadian',
    'Nama / Pesan Error',
    'Detail',
    'Incident Key'
  ], '#991b1b');

  // 3. Pastikan tab sumber versi tunggal `Logversi WPApp` & tab `Lisensi terblokir` tersedia
  ensureLogversiSheet(ss);
  ensureBlockedLicensesSheet(ss);
  syncOrderSnapshot(ss);

  // 4. Hapus tab legacy `Licenses` jika masih ada agar tidak pernah double-count
  const legacyLicensesSheet = ss.getSheetByName('Licenses');
  if (legacyLicensesSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(legacyLicensesSheet);
  }

  return { scalevSheet: scalevSheet, lynkSheet: lynkSheet };
}

/**
 * Lookup cepat tab order tanpa memformat ulang 7 sheet & snapshot pada setiap API request.
 */
function getFastOrderSheets(ss) {
  const scalevSheet = ss.getSheetByName(TAB_SCALEV_ORDERS);
  const lynkSheet = ss.getSheetByName(TAB_LYNK_ORDERS);
  if (!scalevSheet || !lynkSheet) {
    return initAllSheets(ss);
  }
  return { scalevSheet: scalevSheet, lynkSheet: lynkSheet };
}

// ============================================================================
// 📋 MENU KHUSUS GOOGLE SHEETS (`📊 Menu Laporan` & `🎮 WaliPintar Admin`)
// ============================================================================
function onOpen() {
  try {
    syncOrderSnapshot(getTargetSpreadsheet());
  } catch (e) {}
  const ui = SpreadsheetApp.getUi();

  // Menu 1: Laporan Keuangan & Affiliate
  ui.createMenu('📊 Menu Laporan')
    .addItem('📊 Segarkan Dashboard Monitoring', 'generateDashboard')
    .addItem('📈 Generate Laporan Scalev (Report_Scalev)', 'generateScalevReport')
    .addItem('🤝 Generate Laporan Affiliate Lynk (lynk_affiliate)', 'generateLynkReport')
    .addItem('🔄 Segarkan Semua Laporan & Dashboard', 'generateAllReports')
    .addSeparator()
    .addItem('📐 Rapikan Lebar Kolom Semua Sheet (Auto-Width)', 'menuAutoFitAllSheets')
    .addItem('🔍 Cek Duplikat Lisensi (Scalev vs Lynk)', 'menuCheckDuplicateLicenses')
    .addItem('🛠️ Siapkan Semua Tab & Header Sheet', 'menuInitializeTabs')
    .addToUi();

  // Menu 2: Alat Manajemen Admin Lengkap (Tetap 1 Menu Broadcast Versi)
  ui.createMenu('🎮 WaliPintar Admin')
    .addItem('broadcast versi brevo & github', 'menuBroadcastUpdate')
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
    .addSeparator()
    .addItem('⚙️ Cek Status Properti Skrip GAS', 'menuCheckScriptProperties')
    .addItem('⏰ Aktifkan Task Otomatis Error Log (18:01 WIB)', 'menuSetupErrorMonitorTrigger')
    .addItem('🚫 Aktifkan Auto-Deteksi Hapus Baris ke Lisensi terblokir', 'menuSetupBlockedLicenseMonitorTrigger')
    .addItem('🧪 Test Simulasi Error Log & Kirim ke Gmail', 'menuSimulateErrorLogAndNotify')
    .addItem('🚨 Cek & Kirim Digest Error Log ke Gmail', 'menuRunErrorDigestManual')
    .addItem('🧹 Bersihkan Tab Error_Log Manual', 'menuClearErrorLog')
    .addToUi();
}

function menuInitializeTabs() {
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);
  generateScalevReport(true);
  generateLynkReport(true);
  generateDashboard(true);
  let trigNote = '';
  try {
    setupErrorMonitorTrigger(true);
    setupBlockedLicenseMonitorTrigger(true);
    trigNote = '\nTask otomatis Error_Log (18:01 WIB) & pemantau hapus baris ke "Lisensi terblokir" juga diaktifkan.';
  } catch (e) {}
  SpreadsheetApp.getUi().alert(
    '✅ Berhasil',
    'Semua tab (Scalev_Orders, Lynk_Orders, Lisensi terblokir, Report_Scalev, lynk_affiliate, Dashboard, Error_Log) siap.\nGunakan menu "📐 Rapikan Lebar Kolom Semua Sheet (Auto-Width)" bila ingin merapikan lebar kolom manual.' + trigNote,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ============================================================================
// 🌐 1. doGet(e) - SCALEV REDIRECT (META ADS), LOGIN VALIDATION & ADMIN API
// ============================================================================
function doGet(e) {
  e = e || { parameter: {} };
  const params = e.parameter || {};
  const action = String(params.action || '').trim().toLowerCase();

  try {
    // 0. Ping / Warm-up super cepat untuk membangunkan container GAS tanpa menyentuh Sheet
    if (action === 'ping' || action === 'warmup') {
      return createJsonResponse({ ok: true, warm: true, ts: Date.now() });
    }

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

    // G. API Versi Terkunci Terbaru dari Sheet `Logversi WPApp`
    if (action === 'version' || action === 'versi' || action === 'latest_version') {
      return createJsonResponse(getLatestLockedVersionResponse());
    }

    // H. Halaman Status HTML Admin (jika diminta eksplisit)
    if (action === 'status') {
      return renderServerStatusPage();
    }

    // I. Scalev Redirect URL (?order_id=...&email=...&nama=...&produk=...)
    //    ATAU Frontend Claim (`?action=create&email=...` / `?action=claim`)
    const hasScalevParams = Boolean(params.order_id || params.email || params.nama || params.produk);
    if (action === 'create' || action === 'claim' || (!action && hasScalevParams)) {
      return handleScalevOrder(params);
    }

    // J. Default doGet(): Return JSON versi terkunci terbaru dari `Logversi WPApp`
    return createJsonResponse(getLatestLockedVersionResponse());

  } catch (err) {
    Logger.log('Error doGet: ' + err.toString());
    try {
      recordErrorLog(null, {
        incidentKey: 'SYSTEM_DOGET_ERROR',
        source: 'SYSTEM',
        orderId: String(params.order_id || params.orderId || ''),
        email: String(params.email || ''),
        message: 'Error server doGet: ' + err.toString(),
        detail: 'Action: ' + action
      });
    } catch (logErr) {}
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Terjadi kesalahan server: ' + err.toString()
    });
  }
}

function buildExistingOrderSuccessResponse(found, sourceName, emailSentNow, elig) {
  return createJsonResponse({
    status: 'success',
    success: true,
    isExisting: true,
    isAlreadyClaimed: true,
    source: sourceName,
    license: found.licenseKey,
    licenseKey: found.licenseKey,
    orderId: found.orderId,
    email: found.email,
    name: found.customerName,
    emailSent: emailSentNow || !elig.cooldownActive,
    emailSentNow: emailSentNow,
    wasBrevoPending: !elig.isResend && elig.allowed,
    cooldownActive: !emailSentNow && elig.cooldownActive,
    copyOnlyPopup: !emailSentNow && elig.cooldownActive,
    resendAllowed: elig.allowed,
    daysSinceLastEmail: elig.daysSince,
    remainingDays: elig.remainingDays,
    cooldownDays: EMAIL_RESEND_COOLDOWN_DAYS,
    lastEmailDate: elig.lastEmailDate,
    nextEligibleDate: elig.nextEligibleDate,
    message: (!emailSentNow && elig.cooldownActive)
      ? 'Lisensi aktif ditemukan! Kirim ulang email tersedia tiap 3 bulan sekali (berikutnya: ' + elig.nextEligibleDate + '). Silakan langsung Copy-Paste kode lisensi Anda.'
      : (sourceName === 'Scalev'
          ? 'Alhamdulillah! Pembayaran Anda telah terkonfirmasi. Lisensi siap digunakan!'
          : 'Alhamdulillah! Pembayaran Anda dari ' + sourceName + ' telah terkonfirmasi. Lisensi siap digunakan!')
  });
}

function trySendExistingOrderEmailAndBuildResponse(sheet, found, sourceName, noteCol, notePrefix) {
  let emailSentNow = false;
  const elig = evaluateEmailResendEligibility(found.paymentTime, found.catatan);
  if (elig.allowed && found.email && found.email.includes('@')) {
    const resendRes = sendEmailBrevo(found.email, found.licenseKey, found.customerName, found.orderId, elig.isResend);
    if (resendRes.success) {
      emailSentNow = true;
      const baseLabel = elig.isResend ? 'TERKIRIM ULANG (Brevo 3-Bulanan)' : 'Email Brevo: TERKIRIM (Auto-Retry)';
      const noteLabel = notePrefix ? (notePrefix + baseLabel) : baseLabel;
      sheet.getRange(found.rowIndex, noteCol).setValue(stampEmailSentDate(noteLabel));
      SpreadsheetApp.flush();
    }
  }
  return buildExistingOrderSuccessResponse(found, sourceName, emailSentNow, elig);
}

function isPaidPaymentStatus(paymentStatusRaw) {
  const s = String(paymentStatusRaw || '').trim().toUpperCase();
  return (
    s === 'PAID' ||
    s === 'COMPLETED' ||
    s === 'SETTLED' ||
    s === 'SETTLEMENT' ||
    s === 'SUCCESS' ||
    s === 'LUNAS'
  );
}

function isOrderRecordClaimable(record) {
  if (!record) return false;
  const lic = String(record.licenseKey || '').trim().toUpperCase();
  const status = String(record.status || '').trim().toUpperCase();
  return lic.startsWith('WALI-') && status === 'ACTIVE' && isPaidPaymentStatus(record.paymentStatus);
}

function doesFoundOrderMatchCallerEmail(found, callerEmail) {
  if (!found) return false;
  if (!callerEmail) return true;
  const rowEmail = String(found.email || '').trim().toLowerCase();
  return Boolean(rowEmail && rowEmail === callerEmail);
}

/**
 * Memproses Order Scalev dari Redirect URL (`doGet`) atau Klaim Frontend (`?action=create`)
 * Anti-Bypass Ketat:
 * - Email/order yang pernah diblokir selalu ditolak ("Lisensi mu terblokir").
 * - Row existing di Sheet hanya sah jika Status Lisensi = ACTIVE DAN Payment Status = PAID/COMPLETED/SETTLED/SUCCESS.
 * - Order baru WAJIB terverifikasi lunas lewat Scalev API v3 server-side (parameter URL tidak pernah dipercaya mentah).
 */
function handleScalevOrder(params) {
  const ss = getTargetSpreadsheet();
  const sheets = getFastOrderSheets(ss);
  const scalevSheet = sheets.scalevSheet;
  const lynkSheet = sheets.lynkSheet;

  let orderId = String(params.order_id || params.orderId || '').trim();
  let email = String(params.email || params.customer_email || '').trim().toLowerCase();
  let nama = String(params.nama || params.name || params.customer_name || params.buyer_name || '').trim();
  let produk = String(params.produk || params.product || params.product_name || '').trim();

  if (orderId.startsWith('{')) orderId = '';
  if (email.startsWith('{')) email = '';
  if (nama.startsWith('{')) nama = '';
  if (produk.startsWith('{')) produk = '';

  let grossRevenue = 0;

  if (!orderId && !email) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Parameter order_id atau email wajib diisi.'
    });
  }

  // 1. CEK TERBLOKIR PERTAMA (Mencegah email/order terblokir pernah diklaim ulang)
  const blockedCreateMatch = findBlockedLicenseEntry(ss, '', email, orderId);
  if (blockedCreateMatch) {
    return createJsonResponse({
      status: 'error',
      success: false,
      verified: false,
      blocked: true,
      email: email || blockedCreateMatch.email,
      licenseKey: blockedCreateMatch.licenseKey,
      message: 'Lisensi mu terblokir',
      adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
        'Halo Admin ' + BRAND_NAME + ', lisensi saya (' + (blockedCreateMatch.licenseKey || email) + ') terblokir. Mohon bantuannya.'
      )
    });
  }

  // 2. CEK EXISTING DI Scalev_Orders & Lynk_Orders (WAJIB ACTIVE + PAID + email cocok)
  const existingScalev = findExistingOrder(scalevSheet, orderId, email);
  if (isOrderRecordClaimable(existingScalev) && doesFoundOrderMatchCallerEmail(existingScalev, email)) {
    return trySendExistingOrderEmailAndBuildResponse(scalevSheet, existingScalev, 'Scalev', existingScalev.noteCol || 9, '');
  }

  if (lynkSheet) {
    const foundLynk = findExistingOrder(lynkSheet, orderId, email);
    if (isOrderRecordClaimable(foundLynk) && doesFoundOrderMatchCallerEmail(foundLynk, email)) {
      return trySendExistingOrderEmailAndBuildResponse(lynkSheet, foundLynk, 'Lynk.id', foundLynk.noteCol || 11, 'Webhook Lynk.id | ');
    }
  }

  // 3. ANTI-BYPASS MUTLAK: Setiap order/email baru WAJIB lolos verifikasi lunas di Scalev API v3
  if (!SCALEV_API_KEY) {
    return createJsonResponse({
      status: 'error',
      success: false,
      verified: false,
      notOrdered: true,
      email: email,
      message: 'email kamu belum pernah order, ayo beli dulu'
    });
  }

  let paymentTime = new Date();
  let scalevVerify = verifyScalevPayment(email || orderId);

  // Jika pencarian awal memakai email gagal tapi orderId tersedia (misal Thank You Page redirect), cek ulang by orderId lalu cocokkan email
  if ((!scalevVerify || !scalevVerify.verified) && orderId && email) {
    const byOrderVerify = verifyScalevPayment(orderId);
    if (byOrderVerify && byOrderVerify.verified) {
      const apiEmail = String(byOrderVerify.customerEmail || '').trim().toLowerCase();
      if (!apiEmail || apiEmail === email) {
        scalevVerify = byOrderVerify;
      }
    }
  }

  if (!scalevVerify || !scalevVerify.verified) {
    return createJsonResponse({
      status: 'error',
      success: false,
      verified: false,
      notOrdered: Boolean(!scalevVerify || scalevVerify.notOrdered),
      email: email,
      orderId: orderId,
      grossRevenue: (scalevVerify && scalevVerify.grossRevenue) || 0,
      paymentStatus: (scalevVerify && scalevVerify.paymentStatus) || 'unpaid',
      message: (!scalevVerify || scalevVerify.notOrdered)
        ? 'email kamu belum pernah order, ayo beli dulu'
        : (scalevVerify.message || 'Pembayaran belum terkonfirmasi lunas.')
    });
  }

  // Selalu gunakan data resmi dari Scalev API (bukan dari URL parameter agar tidak bisa dipalsukan)
  orderId = scalevVerify.officialOrderId || orderId || ('SCLV-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss'));
  if (scalevVerify.customerEmail) {
    const verifiedEmail = String(scalevVerify.customerEmail).trim().toLowerCase();
    if (email && email !== verifiedEmail) {
      return createJsonResponse({
        status: 'error',
        success: false,
        verified: false,
        notOrdered: true,
        email: email,
        message: 'email kamu belum pernah order, ayo beli dulu'
      });
    }
    email = verifiedEmail;
  }
  nama = nama || scalevVerify.customerName || '-';
  grossRevenue = scalevVerify.grossRevenue > 0 ? scalevVerify.grossRevenue : 0;
  if (scalevVerify.paymentTime) paymentTime = new Date(scalevVerify.paymentTime);

  if (!email || !email.includes('@')) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Alamat email pembeli valid diperlukan untuk pengiriman lisensi resmi.'
    });
  }

  // Cek ulang daftar blokir menggunakan official email/orderId hasil verifikasi Scalev
  const postVerifyBlocked = findBlockedLicenseEntry(ss, '', email, orderId);
  if (postVerifyBlocked) {
    return createJsonResponse({
      status: 'error',
      success: false,
      verified: false,
      blocked: true,
      email: email,
      licenseKey: postVerifyBlocked.licenseKey,
      message: 'Lisensi mu terblokir',
      adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
        'Halo Admin ' + BRAND_NAME + ', lisensi saya (' + (postVerifyBlocked.licenseKey || email) + ') terblokir. Mohon bantuannya.'
      )
    });
  }

  // 4. KUNCI HANYA SAAT AKAN MENULIS ORDER BARU KE SHEET
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(12000);
  } catch (lockErr) {
    return createJsonResponse({
      status: 'error',
      success: false,
      message: 'Server sedang sibuk memproses pesanan lain. Silakan coba lagi beberapa detik lagi.'
    });
  }

  try {
    // Re-check idempotency di dalam lock pada KEDUA sheet (Scalev_Orders & Lynk_Orders)
    const raceScalev = findExistingOrder(scalevSheet, orderId, email);
    if (isOrderRecordClaimable(raceScalev) && doesFoundOrderMatchCallerEmail(raceScalev, email)) {
      return trySendExistingOrderEmailAndBuildResponse(scalevSheet, raceScalev, 'Scalev', raceScalev.noteCol || 9, '');
    }
    if (lynkSheet) {
      const raceLynk = findExistingOrder(lynkSheet, orderId, email);
      if (isOrderRecordClaimable(raceLynk) && doesFoundOrderMatchCallerEmail(raceLynk, email)) {
        return trySendExistingOrderEmailAndBuildResponse(lynkSheet, raceLynk, 'Lynk.id', raceLynk.noteCol || 11, 'Webhook Lynk.id | ');
      }
    }

    // Pastikan 1 email selalu memiliki 1 kode lisensi WALI-XXXX yang fix & paten di sheet
    const fixedExisting = findFixedLicenseForEmail(ss, email);
    const licenseKey = fixedExisting ? fixedExisting.licenseKey : generateUniqueLicenseKey(ss);

    // Simpan ke tab Scalev_Orders
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
    catatanParts.push(brevoRes.success ? stampEmailSentDate('Email Brevo: TERKIRIM') : 'Email Brevo: GAGAL (' + brevoRes.error + ')');
    scalevSheet.getRange(lastRow, 9).setValue(catatanParts.join(' | '));
    appendOrderSnapshotRow(ss, TAB_SCALEV_ORDERS, orderId, email, licenseKey, nama || '-');
    SpreadsheetApp.flush();

    if (brevoRes.success) {
      resolveErrorLog(ss, ['BREVO_API_GLOBAL', 'BREVO_TX|' + email + '|' + orderId, 'SCALEV_ORDER|' + orderId, 'SCALEV_ORDER|' + email]);
    } else {
      recordErrorLog(ss, {
        incidentKey: 'BREVO_TX|' + email + '|' + orderId,
        source: 'BREVO_EMAIL',
        orderId: orderId,
        email: email,
        message: 'Gagal kirim email Brevo (Scalev): ' + brevoRes.error,
        detail: 'Lisensi: ' + licenseKey
      });
    }

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
      try {
        recordErrorLog(null, {
          incidentKey: 'LYNK_JSON_INVALID',
          source: 'LYNK_WEBHOOK',
          message: 'Payload JSON Lynk tidak valid',
          detail: parseErr.toString() + ' | Preview: ' + rawBody.slice(0, 160)
        });
      } catch (logErr) {}
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
  if (action === 'log_error')        return handleApiLogError(payload);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    try {
      recordErrorLog(null, {
        incidentKey: 'LYNK_LOCK_BUSY',
        source: 'LYNK_WEBHOOK',
        message: 'Antrean LockService penuh (>30s) saat webhook Lynk masuk',
        detail: lockErr.toString()
      });
    } catch (logErr) {}
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
        try {
          recordErrorLog(null, {
            incidentKey: 'LYNK_SIGNATURE_INVALID',
            source: 'LYNK_WEBHOOK',
            message: 'Signature X-Lynk-Signature ditolak (' + sigCheck.reason + ')',
            detail: 'Preview: ' + rawBody.slice(0, 160)
          });
        } catch (logErr) {}
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
    const explicitPayStatus = String(
      msgData.payment_status ||
      msgData.status ||
      ''
    ).trim().toUpperCase();
    const rawPayStatus = String(
      explicitPayStatus ||
      dataObj.message_action ||
      ''
    ).trim().toUpperCase();

    if (
      payload.test === true ||
      eventName === 'TEST' ||
      eventName === 'PING' ||
      eventName === 'WEBHOOK.TEST' ||
      eventName === 'TEST_WEBHOOK'
    ) {
      Logger.log('Lynk.id Test Webhook / Ping diterima & diverifikasi.');
      resolveErrorLog(null, ['LYNK_SIGNATURE_INVALID', 'LYNK_JSON_INVALID', 'LYNK_DOPOST_ERROR', 'LYNK_LOCK_BUSY', 'WORKER_LYNK_BRIDGE', 'WORKER_LYNK|GLOBAL']);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    if (
      eventName &&
      (eventName.includes('FAILED') || eventName.includes('EXPIRED') || eventName.includes('CANCEL') || eventName.includes('REFUND'))
    ) {
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    // Tolak aktivasi lisensi jika status pembayaran Lynk.id belum lunas (UNPAID / PENDING / dll.)
    const lynkPaidByEvent = !explicitPayStatus && (eventName === 'PAYMENT.RECEIVED' || String(dataObj.message_action || '').trim().toUpperCase() === 'SUCCESS');
    if (!isPaidPaymentStatus(rawPayStatus) && !lynkPaidByEvent) {
      Logger.log('Webhook Lynk.id diabaikan karena status belum lunas: ' + (rawPayStatus || eventName || 'UNKNOWN'));
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
      try {
        recordErrorLog(null, {
          incidentKey: 'LYNK_EMAIL_MISSING|' + (refId || 'GLOBAL'),
          source: 'LYNK_WEBHOOK',
          orderId: refId,
          message: 'Email pelanggan tidak ditemukan pada payload Lynk.id',
          detail: 'Nama: ' + customerName + ' | Preview: ' + rawBody.slice(0, 140)
        });
      } catch (logErr) {}
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
      resolveErrorLog(ss, ['LYNK_SIGNATURE_INVALID', 'LYNK_JSON_INVALID', 'LYNK_DOPOST_ERROR', 'LYNK_LOCK_BUSY', 'WORKER_LYNK|' + orderIdToSave, 'WORKER_LYNK|' + customerEmail]);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    // 4. GUNAKAN LISENSI PATEN EMAIL (JIKA SUDAH ADA) ATAU GENERATE BARU, LALU FLUSH KE SHEET
    const existingEmailLic = findFixedLicenseForEmail(ss, customerEmail);
    const licenseKey = existingEmailLic ? existingEmailLic.licenseKey : generateUniqueLicenseKey(ss);
    const now = new Date();
    const baseTag = 'Webhook Lynk.id' + (signatureHeader ? ' (HMAC Verified)' : ' (Direct GAS)');

    lynkSheet.appendRow([
      now,
      orderIdToSave,
      customerEmail,
      licenseKey,
      'ACTIVE',
      'PAID',
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
    const rawCatatan = baseTag + ' | Email Brevo: ' + (brevoRes.success ? 'TERKIRIM' : 'GAGAL (' + brevoRes.error + ')');
    const catatan = brevoRes.success ? stampEmailSentDate(rawCatatan) : rawCatatan;
    lynkSheet.getRange(lastRow, 11).setValue(catatan);
    generateDashboard(true);
    syncOrderSnapshot(ss);
    SpreadsheetApp.flush();

    // Auto-resolve error webhook Lynk (dan Brevo jika sukses)
    const keysToResolve = [
      'LYNK_SIGNATURE_INVALID',
      'LYNK_JSON_INVALID',
      'LYNK_DOPOST_ERROR',
      'LYNK_LOCK_BUSY',
      'WORKER_LYNK_BRIDGE',
      'WORKER_LYNK|GLOBAL',
      'WORKER_LYNK|' + orderIdToSave,
      'WORKER_LYNK|' + customerEmail,
      'LYNK_EMAIL_MISSING|' + orderIdToSave,
      'LYNK_EMAIL_MISSING|GLOBAL'
    ];
    if (brevoRes.success) {
      keysToResolve.push('BREVO_API_GLOBAL', 'BREVO_TX|' + customerEmail + '|' + orderIdToSave);
    } else {
      recordErrorLog(ss, {
        incidentKey: 'BREVO_TX|' + customerEmail + '|' + orderIdToSave,
        source: 'BREVO_EMAIL',
        orderId: orderIdToSave,
        email: customerEmail,
        message: 'Gagal kirim email Brevo (Lynk): ' + brevoRes.error,
        detail: 'Lisensi: ' + licenseKey
      });
    }
    resolveErrorLog(ss, keysToResolve);

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log('Error doPost (Lynk Webhook): ' + err.toString());
    try {
      recordErrorLog(null, {
        incidentKey: 'LYNK_DOPOST_ERROR',
        source: 'LYNK_WEBHOOK',
        message: 'Error internal doPost Lynk: ' + err.toString(),
        detail: 'Preview: ' + rawBody.slice(0, 140)
      });
    } catch (logErr) {}
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
// 📊 3. AUTOMATED REPORTING (`Dashboard`, `Report_Scalev`, `lynk_affiliate` & AUTO-WIDTH)
// ============================================================================
/**
 * Menilai apakah sebuah baris order benar-benar LUNAS (PAID/COMPLETED/SETTLED/SUCCESS)
 * DAN telah menghasilkan kode lisensi resmi (`WALI-...`) berstatus `ACTIVE`.
 */
function isOrderTrulyPaidWithLicense(licenseKey, statusLisensi, paymentStatus) {
  const lic = String(licenseKey || '').trim().toUpperCase();
  const stLic = String(statusLisensi || '').trim().toUpperCase();
  const paySt = String(paymentStatus || '').trim().toUpperCase();

  if (!lic || !lic.startsWith('WALI-')) return false;
  if (stLic !== 'ACTIVE') return false;

  const unpaidStatuses = ['UNPAID', 'PENDING', 'CANCELED', 'CANCELLED', 'FAILED', 'EXPIRED', 'REFUNDED', 'VOID', 'DRAFT', 'INACTIVE'];
  if (unpaidStatuses.indexOf(paySt) !== -1) return false;

  const paidStatuses = ['PAID', 'COMPLETED', 'SETTLED', 'SUCCESS', 'LUNAS'];
  return paidStatuses.indexOf(paySt) !== -1;
}
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

function formatDashboardLayout(dashSheet) {
  if (!dashSheet) return;
  try {
    dashSheet.setHiddenGridlines(true);
    dashSheet.setFrozenRows(1);
    dashSheet.setColumnWidth(1, 235);
    dashSheet.setColumnWidth(2, 145);
    dashSheet.setColumnWidth(3, 115);
    dashSheet.setColumnWidth(4, 195);
  } catch (err) {
    Logger.log('Warning formatDashboardLayout: ' + err.toString());
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
  if (s5) formatDashboardLayout(s5);
  const s6 = targetSs.getSheetByName(TAB_ERROR_LOG);
  if (s6) autoFitSheetColumns(s6, 10, 110, 22);
  const s7 = targetSs.getSheetByName(TAB_BLOCKED_LICENSES);
  if (s7) autoFitSheetColumns(s7, 7, 120, 22);
  const s8 = targetSs.getSheetByName(TAB_LOGVERSI);
  if (s8) formatLogversiLayout(s8);
}

function menuAutoFitAllSheets() {
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);
  autoFitAllSheets(ss);
  SpreadsheetApp.getUi().alert('✅ Selesai', 'Lebar seluruh kolom di semua tab (termasuk Dashboard & Logversi WPApp) telah dirapikan.', SpreadsheetApp.getUi().ButtonSet.OK);
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
    SpreadsheetApp.getUi().alert('✅ Selesai', 'Dashboard, Report_Scalev, dan lynk_affiliate berhasil diperbarui dengan lebar kolom otomatis!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

function writeDashboardTable(dashSheet, startRow, title, headerBg, rows) {
  dashSheet.getRange(startRow, 1, 1, 4).merge()
    .setValue('  ' + title)
    .setBackground(headerBg)
    .setFontColor('#ffffff')
    .setFontFamily('Roboto')
    .setFontWeight('bold')
    .setFontSize(10.5)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');
  dashSheet.setRowHeight(startRow, 32);

  for (let r = 0; r < rows.length; r++) {
    const rowIdx = startRow + 1 + r;
    const item = rows[r];
    dashSheet.getRange(rowIdx, 1, 1, 3).merge()
      .setValue('  ' + item.label)
      .setBackground(item.bg)
      .setFontColor(item.color)
      .setFontFamily('Roboto')
      .setFontSize(10)
      .setFontWeight(item.bold ? 'bold' : 'normal')
      .setWrap(true)
      .setHorizontalAlignment('left')
      .setVerticalAlignment('middle');

    const valCell = dashSheet.getRange(rowIdx, 4);
    if (item.formula) {
      valCell.setFormula(item.formula);
    } else {
      valCell.setValue(item.val);
    }
    valCell
      .setNumberFormat(item.fmt)
      .setBackground(item.bg)
      .setFontColor(item.color)
      .setFontFamily('Roboto')
      .setFontSize(10)
      .setFontWeight(item.bold ? 'bold' : 'normal')
      .setHorizontalAlignment('right')
      .setVerticalAlignment('middle');
    dashSheet.setRowHeight(rowIdx, 27);
  }

  const endRow = startRow + rows.length;
  dashSheet.getRange(startRow, 1, rows.length + 1, 4)
    .setBorder(true, true, true, true, false, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
  dashSheet.getRange(startRow, 1, rows.length + 1, 4)
    .setBorder(true, true, true, true, null, null, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);
  return endRow;
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
    const sep = getFormulaSeparator(ss);

    let scalevRevenue = 0;
    let scalevPaidTx = 0;
    let scalevTodayRev = 0;

    let lynkRevenue = 0;
    let lynkPaidTx = 0;
    let lynkTodayRev = 0;

    let totalLicenses = 0;
    let activeLicenses = 0;
    let licensesToday = 0;
    let totalEmailsSent = 0;
    let emailsTodayFromSheet = 0;

    const sources = [
      { sh: sheets.scalevSheet, type: 'SCALEV' },
      { sh: sheets.lynkSheet, type: 'LYNK' }
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
        const hasValidLicense = license.toUpperCase().startsWith('WALI-');

        if (hasValidLicense) {
          totalLicenses++;
          if (statusLisensi === 'ACTIVE') activeLicenses++;
          if (isToday) licensesToday++;
        }

        const isPaid = isOrderTrulyPaidWithLicense(license, statusLisensi, paymentStatus);
        if (isPaid) {
          if (src.type === 'SCALEV') {
            scalevPaidTx++;
            scalevRevenue += rev;
            if (isToday) scalevTodayRev += rev;
          } else if (src.type === 'LYNK') {
            lynkPaidTx++;
            lynkRevenue += rev;
            if (isToday) lynkTodayRev += rev;
          }
        }

        if (catatan.includes('TERKIRIM')) {
          totalEmailsSent++;
          if (isToday) emailsTodayFromSheet++;
        }
      }
    });

    const scalevAvg = scalevPaidTx > 0 ? Math.round(scalevRevenue / scalevPaidTx) : 0;
    const lynkAvg = lynkPaidTx > 0 ? Math.round(lynkRevenue / lynkPaidTx) : 0;

    const totalRevenue = scalevRevenue + lynkRevenue;
    const totalPaidTx = scalevPaidTx + lynkPaidTx;
    const avgRevenue = totalPaidTx > 0 ? Math.round(totalRevenue / totalPaidTx) : 0;
    const revenueToday = scalevTodayRev + lynkTodayRev;
    const scalevSharePct = totalRevenue > 0 ? Math.round((scalevRevenue / totalRevenue) * 100) : 0;
    const lynkSharePct = totalRevenue > 0 ? (100 - scalevSharePct) : 0;

    const emailsTodayTotal = getDailyEmailSentCount(emailsTodayFromSheet);
    const updatedAt = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy, HH.mm.ss');

    dashSheet.clear();
    dashSheet.clearFormats();

    // Banner Utama (Row 1) & Info Bar (Row 2)
    dashSheet.getRange('A1:D1').merge()
      .setValue('📊 DASHBOARD MONITORING PENJUALAN, LISENSI & BREVO WALI PINTAR')
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setFontFamily('Roboto')
      .setFontWeight('bold')
      .setFontSize(12.5)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    dashSheet.setRowHeight(1, 42);

    dashSheet.getRange('A2:D2').merge()
      .setValue('🔄 Diperbarui otomatis: ' + updatedAt + ' WIB   •   Sumber: Scalev_Orders & Lynk_Orders')
      .setBackground('#f1f5f9')
      .setFontColor('#334155')
      .setFontFamily('Roboto')
      .setFontSize(9.5)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBorder(false, true, true, true, false, false, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
    dashSheet.setRowHeight(2, 24);
    dashSheet.setRowHeight(3, 12);

    // ========================================================================
    // TABEL 1: SALES SCALEV (META ADS • BIRU LAUT)
    // ========================================================================
    const scalevStartRow = 4;
    const scalevSumifsFormula =
      '=SUMIFS(Scalev_Orders!G:G' + sep + ' Scalev_Orders!D:D' + sep + ' "WALI-*"' + sep + ' Scalev_Orders!E:E' + sep + ' "ACTIVE"' + sep + ' Scalev_Orders!F:F' + sep + ' "PAID") + ' +
      'SUMIFS(Scalev_Orders!G:G' + sep + ' Scalev_Orders!D:D' + sep + ' "WALI-*"' + sep + ' Scalev_Orders!E:E' + sep + ' "ACTIVE"' + sep + ' Scalev_Orders!F:F' + sep + ' "COMPLETED") + ' +
      'SUMIFS(Scalev_Orders!G:G' + sep + ' Scalev_Orders!D:D' + sep + ' "WALI-*"' + sep + ' Scalev_Orders!E:E' + sep + ' "ACTIVE"' + sep + ' Scalev_Orders!F:F' + sep + ' "SETTLED")';

    const t1End = writeDashboardTable(
      dashSheet,
      scalevStartRow,
      '🔵 TABEL 1: SALES SCALEV (META ADS • LUNAS + BERLISENSI)',
      '#0369a1',
      [
        { label: 'Gross Revenue Scalev (Paid)', val: scalevRevenue, fmt: '"Rp"#,##0', color: '#0c4a6e', bg: '#f0f9ff', bold: true },
        { label: 'Transaksi Scalev Paid (Lunas & Berlisensi)', val: scalevPaidTx + ' Transaksi', fmt: '@', color: '#0f172a', bg: '#ffffff', bold: true },
        { label: 'Rata-Rata Omzet per Transaksi Scalev', val: scalevAvg, fmt: '"Rp"#,##0', color: '#0f172a', bg: '#f8fafc', bold: false },
        { label: 'Gross Revenue Scalev Hari Ini (' + todayDisplay + ')', val: scalevTodayRev, fmt: '"Rp"#,##0', color: '#0369a1', bg: '#f0f9ff', bold: true },
        { label: 'Formula Otomatis Scalev (=SUMIFS Paid)', val: scalevRevenue, fmt: '"Rp"#,##0', color: '#475569', bg: '#ffffff', bold: false, formula: scalevSumifsFormula }
      ]
    );
    dashSheet.setRowHeight(t1End + 1, 12);

    // ========================================================================
    // TABEL 2: SALES LYNK.ID (AFFILIATE & ORGANIK • HIJAU BOTOL)
    // ========================================================================
    const lynkStartRow = t1End + 2;
    const lynkSumifsFormula =
      '=SUMIFS(Lynk_Orders!G:G' + sep + ' Lynk_Orders!D:D' + sep + ' "WALI-*"' + sep + ' Lynk_Orders!E:E' + sep + ' "ACTIVE"' + sep + ' Lynk_Orders!F:F' + sep + ' "PAID") + ' +
      'SUMIFS(Lynk_Orders!G:G' + sep + ' Lynk_Orders!D:D' + sep + ' "WALI-*"' + sep + ' Lynk_Orders!E:E' + sep + ' "ACTIVE"' + sep + ' Lynk_Orders!F:F' + sep + ' "COMPLETED") + ' +
      'SUMIFS(Lynk_Orders!G:G' + sep + ' Lynk_Orders!D:D' + sep + ' "WALI-*"' + sep + ' Lynk_Orders!E:E' + sep + ' "ACTIVE"' + sep + ' Lynk_Orders!F:F' + sep + ' "SETTLED")';

    const t2End = writeDashboardTable(
      dashSheet,
      lynkStartRow,
      '🟢 TABEL 2: SALES LYNK.ID (AFFILIATE & ORGANIK • LUNAS + BERLISENSI)',
      '#065f46',
      [
        { label: 'Gross Revenue Lynk.id (Paid)', val: lynkRevenue, fmt: '"Rp"#,##0', color: '#065f46', bg: '#ecfdf5', bold: true },
        { label: 'Transaksi Lynk.id Paid (Lunas & Berlisensi)', val: lynkPaidTx + ' Transaksi', fmt: '@', color: '#0f172a', bg: '#ffffff', bold: true },
        { label: 'Rata-Rata Omzet per Transaksi Lynk.id', val: lynkAvg, fmt: '"Rp"#,##0', color: '#0f172a', bg: '#f8fafc', bold: false },
        { label: 'Gross Revenue Lynk.id Hari Ini (' + todayDisplay + ')', val: lynkTodayRev, fmt: '"Rp"#,##0', color: '#047857', bg: '#ecfdf5', bold: true },
        { label: 'Formula Otomatis Lynk.id (=SUMIFS Paid)', val: lynkRevenue, fmt: '"Rp"#,##0', color: '#475569', bg: '#ffffff', bold: false, formula: lynkSumifsFormula }
      ]
    );
    dashSheet.setRowHeight(t2End + 1, 12);

    // ========================================================================
    // TABEL 3: REKAP TOTAL / SUMMARY PENJUALAN (SCALEV + LYNK.ID)
    // ========================================================================
    const summaryStartRow = t2End + 2;
    const scalevTotalCellRef = 'D' + (scalevStartRow + 1);
    const lynkTotalCellRef = 'D' + (lynkStartRow + 1);
    const scalevFormulaCellRef = 'D' + t1End;
    const lynkFormulaCellRef = 'D' + t2End;

    const t3End = writeDashboardTable(
      dashSheet,
      summaryStartRow,
      '💰 TABEL 3: REKAP TOTAL / SUMMARY PENJUALAN (SCALEV + LYNK.ID)',
      '#0f766e',
      [
        { label: 'Total Gross Revenue (Semua Jalur Paid)', val: totalRevenue, fmt: '"Rp"#,##0', color: '#065f46', bg: '#ecfdf5', bold: true, formula: '=' + scalevTotalCellRef + '+' + lynkTotalCellRef },
        { label: 'Kontribusi Omzet (Scalev vs Lynk.id)', val: 'Scalev ' + scalevSharePct + '%  |  Lynk.id ' + lynkSharePct + '%', fmt: '@', color: '#334155', bg: '#ffffff', bold: false },
        { label: 'Total Transaksi Paid (Lunas)', val: totalPaidTx + ' Transaksi', fmt: '@', color: '#0f172a', bg: '#f8fafc', bold: true },
        { label: 'Rata-Rata Gross Revenue per Transaksi Paid', val: avgRevenue, fmt: '"Rp"#,##0', color: '#0f172a', bg: '#ffffff', bold: false },
        { label: 'Total Gross Revenue Paid Hari Ini (' + todayDisplay + ')', val: revenueToday, fmt: '"Rp"#,##0', color: '#047857', bg: '#ecfdf5', bold: true },
        { label: 'Formula Otomatis Gabungan (=SUMIFS Paid + Lisensi)', val: totalRevenue, fmt: '"Rp"#,##0', color: '#475569', bg: '#ffffff', bold: false, formula: '=' + scalevFormulaCellRef + '+' + lynkFormulaCellRef }
      ]
    );
    dashSheet.setRowHeight(t3End + 1, 12);

    // Anti-#ERROR! Guard pada seluruh cell formula
    SpreadsheetApp.flush();
    [
      { cell: scalevFormulaCellRef, fallback: scalevRevenue },
      { cell: lynkFormulaCellRef, fallback: lynkRevenue },
      { cell: 'D' + (summaryStartRow + 1), fallback: totalRevenue },
      { cell: 'D' + t3End, fallback: totalRevenue }
    ].forEach(function(guard) {
      const c = dashSheet.getRange(guard.cell);
      const disp = String(c.getDisplayValue() || '');
      if (disp.startsWith('#')) {
        c.setValue(guard.fallback).setNumberFormat('"Rp"#,##0');
      }
    });

    // ========================================================================
    // TABEL 4: MATRIKS OPERASIONAL LISENSI & BREVO
    // ========================================================================
    const opsStartRow = t3End + 2;
    const t4End = writeDashboardTable(
      dashSheet,
      opsStartRow,
      '📈 TABEL 4: MATRIKS OPERASIONAL LISENSI & BREVO',
      '#1e293b',
      [
        { label: 'Total Lisensi Diterbitkan', val: totalLicenses, fmt: '#,##0', color: '#0f172a', bg: '#ffffff', bold: true },
        { label: 'Lisensi Aktif (Siap Main)', val: activeLicenses, fmt: '#,##0', color: '#0f172a', bg: '#f8fafc', bold: true },
        { label: 'Lisensi Terbit Hari Ini (' + todayDisplay + ')', val: licensesToday, fmt: '#,##0', color: '#0f172a', bg: '#ffffff', bold: true },
        { label: 'Total Email Berhasil Terkirim (Brevo)', val: totalEmailsSent, fmt: '#,##0', color: '#0f172a', bg: '#f8fafc', bold: true },
        { label: 'Total Email Terkirim Hari Ini (Brevo)', val: emailsTodayTotal, fmt: '#,##0', color: '#065f46', bg: '#ecfdf5', bold: true },
        { label: 'Terakhir Diperbarui Otomatis', val: updatedAt, fmt: '@', color: '#475569', bg: '#ffffff', bold: true }
      ]
    );
    dashSheet.setRowHeight(t4End + 1, 14);

    // ========================================================================
    // PANDUAN SINGKAT (Kartu rapi A:D dengan wrap & tinggi baris pas)
    // ========================================================================
    const guideStartRow = t4End + 2;
    dashSheet.getRange(guideStartRow, 1, 1, 4).merge()
      .setValue('  💡 PANDUAN PENGELOLAAN SCALEV, LYNK.ID & LISENSI')
      .setBackground('#e2e8f0')
      .setFontFamily('Roboto')
      .setFontSize(10)
      .setFontWeight('bold')
      .setFontColor('#0f172a')
      .setVerticalAlignment('middle');
    dashSheet.setRowHeight(guideStartRow, 28);

    const guides = [
      '1. Tabel 1 (Sales Scalev) & Tabel 2 (Sales Lynk.id) dipisah untuk memantau performa Meta Ads dan Affiliate secara mandiri.',
      '2. Tabel 3 (Rekap Total) menggabungkan seluruh transaksi yang benar-benar LUNAS (PAID/COMPLETED) dan sudah terbit lisensi ACTIVE.',
      '3. Tabel 4 (Matriks Operasional) memantau total lisensi aktif dan kuota email harian Brevo secara real-time.',
      '4. Gunakan menu "📊 Menu Laporan" untuk rincian komisi lynk_affiliate atau "🎮 WaliPintar Admin" untuk sinkronisasi Scalev API.'
    ];
    for (let g = 0; g < guides.length; g++) {
      const rGuide = guideStartRow + 1 + g;
      dashSheet.getRange(rGuide, 1, 1, 4).merge()
        .setValue('  ' + guides[g])
        .setBackground('#f8fafc')
        .setFontFamily('Roboto')
        .setWrap(true)
        .setFontColor('#334155')
        .setFontSize(9.5)
        .setVerticalAlignment('middle');
      dashSheet.setRowHeight(rGuide, 30);
    }
    dashSheet.getRange(guideStartRow, 1, guides.length + 1, 4)
      .setBorder(true, true, true, true, null, null, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    formatDashboardLayout(dashSheet);
    SpreadsheetApp.flush();

    if (!silent) {
      try {
        SpreadsheetApp.getUi().alert(
          '📊 Dashboard 4 Tabel Diperbarui',
          '• Sales Scalev: Rp ' + formatNumberId(scalevRevenue) + ' (' + scalevPaidTx + ' transaksi)\n' +
          '• Sales Lynk.id: Rp ' + formatNumberId(lynkRevenue) + ' (' + lynkPaidTx + ' transaksi)\n' +
          '• Rekap Total Paid: Rp ' + formatNumberId(totalRevenue) + ' (' + totalPaidTx + ' transaksi)\n' +
          '• Email Terkirim Hari Ini (Brevo): ' + emailsTodayTotal + ' email\n' +
          '• Layout & lebar kolom Dashboard sudah dirapikan otomatis.',
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
      const license = String(data[i][3] || '').trim();
      if (!orderId && !email && !license) continue;

      const statusLisensi = String(data[i][4] || '').trim().toUpperCase();
      const paymentStatus = String(data[i][5] || '').trim().toUpperCase();
      const revenue = parseRevenueNumber(data[i][6]);
      const catatan = String(data[i][data[i].length - 1] || '').trim().toUpperCase();

      const isPaid = isOrderTrulyPaidWithLicense(license, statusLisensi, paymentStatus);

      if (isPaid) {
        totalTransaksi++;
        totalOmzet += revenue;
      }
      if (license.toUpperCase().startsWith('WALI-') && statusLisensi === 'ACTIVE') {
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
      .setBackground('#0369a1')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    reportSheet.getRange(2, 1, 1, 3)
      .setValues([[totalOmzet, totalTransaksi, lisensiAktif]])
      .setFontWeight('bold')
      .setFontSize(12)
      .setBackground('#f0f9ff');

    reportSheet.getRange(2, 1).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
    reportSheet.getRange(2, 2).setNumberFormat('#,##0').setHorizontalAlignment('center');
    reportSheet.getRange(2, 3).setNumberFormat('#,##0').setHorizontalAlignment('center');
    reportSheet.getRange(1, 1, 2, 3).setBorder(true, true, true, true, true, true, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);

    // Tambahan counter Email Terkirim Hari Ini (Brevo) di Report_Scalev
    reportSheet.getRange('A4:B4').merge()
      .setValue('Total Email Terkirim Hari Ini (Brevo)')
      .setFontWeight('bold')
      .setBackground('#f8fafc')
      .setFontColor('#0c4a6e');
    reportSheet.getRange('C4')
      .setValue(totalEmailsTodayAll)
      .setNumberFormat('#,##0')
      .setFontWeight('bold')
      .setBackground('#f0f9ff')
      .setFontColor('#0c4a6e')
      .setHorizontalAlignment('center');
    reportSheet.getRange('A4:C4').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);

    reportSheet.getRange('A6:C6').merge()
      .setValue('Terakhir diperbarui: ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'))
      .setFontColor('#64748b')
      .setFontSize(10);

    if (!silent) {
      generateDashboard(true);
      try {
        SpreadsheetApp.getUi().alert(
          '📈 Report_Scalev Diperbarui',
          '• Total Omzet: Rp ' + formatNumberId(totalOmzet) + '\n' +
          '• Total Transaksi (Lunas & Berlisensi): ' + totalTransaksi + '\n' +
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

    // 1. Baca Rate Komisi (%) yang sudah diset manual di lynk_affiliate agar tidak tertimpa
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
      const license = String(lynkData[i][3] || '').trim();
      if (!orderId && !email && !license) continue;

      const statusLisensi = String(lynkData[i][4] || '').trim().toUpperCase();
      const paymentStatus = String(lynkData[i][5] || '').trim().toUpperCase();
      const revenue = parseRevenueNumber(lynkData[i][6]);
      const rawAffName = String(lynkData[i][9] || '').trim();
      const affName = rawAffName || 'Direct / Tanpa Affiliate';

      const isPaid = isOrderTrulyPaidWithLicense(license, statusLisensi, paymentStatus);
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

    // 4. Tulis ke tab lynk_affiliate
    reportSheet.clear();

    const headers = ['Nama Affiliate', 'Total Transaksi', 'Total Omzet', 'Rate Komisi (%)', 'Total Komisi'];
    reportSheet.getRange(1, 1, 1, 5)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#065f46')
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
        .setBackground('#ecfdf5');
      reportSheet.getRange(totalRowIdx, 2).setNumberFormat('#,##0').setHorizontalAlignment('center');
      reportSheet.getRange(totalRowIdx, 3).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');
      reportSheet.getRange(totalRowIdx, 4).setHorizontalAlignment('center');
      reportSheet.getRange(totalRowIdx, 5).setNumberFormat('"Rp"#,##0').setHorizontalAlignment('right');

      reportSheet.getRange(1, 1, totalRowIdx, 5).setBorder(true, true, true, true, true, true, '#94a3b8', SpreadsheetApp.BorderStyle.SOLID);
    }

    const noteRow = outputRows.length + 4;
    reportSheet.getRange(noteRow, 1, 1, 5).merge()
      .setValue('💡 Tips: Ubah angka di kolom "Rate Komisi (%)" (misal: 25), lalu jalankan ulang "Generate Laporan Affiliate Lynk (lynk_affiliate)" untuk menghitung ulang komisi otomatis.')
      .setWrap(true)
      .setFontColor('#64748b')
      .setFontSize(10);

    if (!silent) {
      generateDashboard(true);
    }

    if (!silent) {
      try {
        SpreadsheetApp.getUi().alert(
          '🤝 lynk_affiliate Diperbarui',
          '• Jumlah Affiliate: ' + outputRows.length + '\n' +
          '• Total Transaksi (Lunas & Berlisensi): ' + grandTotalTx + '\n' +
          '• Total Omzet: Rp ' + formatNumberId(grandTotalOmzet) + '\n' +
          '• Total Komisi: Rp ' + formatNumberId(grandTotalKomisi),
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      } catch (uiErr) {}
    }
  } catch (err) {
    Logger.log('Error generateLynkReport: ' + err.toString());
    if (!silent) {
      try { SpreadsheetApp.getUi().alert('❌ Error lynk_affiliate', err.toString(), SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    }
  }
}

function menuCheckDuplicateLicenses() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  initAllSheets(ss);

  const codeToEmailMap = {};
  const emailToCodeMap = {};
  const keyCollisions = [];
  const emailSplits = [];
  let totalChecked = 0;

  [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].forEach(function(tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() <= 1) return;

    const rows = sh.getDataRange().getValues();
    const licCol = findLicenseColumnIndex(rows[0]);
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][2] || '').trim().toLowerCase();
      const code = String(rows[i][licCol] || '').trim().toUpperCase();
      if (!code || !code.startsWith('WALI-')) continue;

      totalChecked++;
      const loc = tabName + ' (Baris ' + (i + 1) + (email ? ', ' + email : '') + ')';

      if (codeToEmailMap[code]) {
        if (codeToEmailMap[code].email && email && codeToEmailMap[code].email !== email) {
          keyCollisions.push(code + ': ' + codeToEmailMap[code].loc + ' vs ' + loc);
        }
      } else {
        codeToEmailMap[code] = { email: email, loc: loc };
      }

      if (email) {
        if (emailToCodeMap[email] && emailToCodeMap[email].code !== code) {
          emailSplits.push(email + ': ' + emailToCodeMap[email].code + ' vs ' + code);
        } else if (!emailToCodeMap[email]) {
          emailToCodeMap[email] = { code: code, loc: loc };
        }
      }
    }
  });

  if (keyCollisions.length === 0 && emailSplits.length === 0) {
    ui.alert(
      '🛡️ 100% Paten & Bebas Bentrok!',
      'Total ' + totalChecked + ' baris lisensi diperiksa (' + Object.keys(emailToCodeMap).length + ' email unik).\nSemua email terikat paten pada masing-masing 1 kode lisensi WALI-XXXX tanpa bentrok.',
      ui.ButtonSet.OK
    );
  } else {
    const msgs = [];
    if (keyCollisions.length > 0) msgs.push('Bentrok kode antar email:\n' + keyCollisions.slice(0, 5).join('\n'));
    if (emailSplits.length > 0) msgs.push('Email punya >1 kode berbeda:\n' + emailSplits.slice(0, 5).join('\n'));
    ui.alert('⚠️ Ditemukan Anomali Lisensi', msgs.join('\n\n'), ui.ButtonSet.OK);
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
  getFastOrderSheets(ss);

  // 1. Cek terlebih dahulu di sheet "Lisensi terblokir"
  const blockedEntry = findBlockedLicenseEntry(ss, licenseKey, String(params.email || ''), '');
  if (blockedEntry) {
    return createJsonResponse({
      status: 'error',
      success: true,
      valid: false,
      blocked: true,
      reason: 'BLOCKED',
      licenseKey: licenseKey,
      email: blockedEntry.email,
      message: 'Lisensi mu terblokir',
      orderUrl: SCALEV_URL,
      lynkUrl: LYNK_LP_URL,
      adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
        'Halo Admin ' + BRAND_NAME + ', lisensi saya (' + licenseKey + ') terblokir. Mohon bantuannya.'
      )
    });
  }

  const sheetsToCheck = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS];
  for (let s = 0; s < sheetsToCheck.length; s++) {
    const sh = ss.getSheetByName(sheetsToCheck[s]);
    if (!sh || sh.getLastRow() <= 1) continue;

    const data = sh.getDataRange().getValues();
    const cols = getOrderSheetColumnIndices(data[0], sheetsToCheck[s]);
    for (let i = 1; i < data.length; i++) {
      const rowKey = String(data[i][cols.license] || '').trim().toUpperCase();
      const rowStatus = String(data[i][cols.status] || '').trim().toUpperCase();
      const rowPayStatus = String(data[i][cols.paymentStatus] || '').trim().toUpperCase();
      if (rowKey === licenseKey && rowStatus === 'ACTIVE' && isPaidPaymentStatus(rowPayStatus)) {
        return createJsonResponse({
          status: 'success',
          success: true,
          valid: true,
          source: sheetsToCheck[s],
          licenseKey: licenseKey,
          license: licenseKey,
          email: String(data[i][cols.email] || '').trim().toLowerCase(),
          orderId: String(data[i][cols.orderId] || '').trim(),
          message: 'Lisensi valid dan aktif!'
        });
      }
    }
  }

  return createJsonResponse({
    status: 'error',
    success: true,
    valid: false,
    blocked: false,
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
  getFastOrderSheets(ss);

  const blockedEmailMatch = findBlockedLicenseEntry(ss, '', email, '');
  if (blockedEmailMatch) {
    return createJsonResponse({
      status: 'error',
      success: false,
      found: false,
      blocked: true,
      licenseKey: blockedEmailMatch.licenseKey,
      message: 'Lisensi mu terblokir',
      adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
        'Halo Admin ' + BRAND_NAME + ', lisensi saya (' + (blockedEmailMatch.licenseKey || email) + ') terblokir. Mohon bantuannya.'
      )
    });
  }

  const sheetsToCheck = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS];
  for (let s = 0; s < sheetsToCheck.length; s++) {
    const sh = ss.getSheetByName(sheetsToCheck[s]);
    if (!sh) continue;

    const existing = findExistingOrder(sh, '', email);
    if (isOrderRecordClaimable(existing)) {
      const elig = evaluateEmailResendEligibility(existing.paymentTime, existing.catatan);
      if (!elig.allowed) {
        return createJsonResponse({
          status: 'success',
          success: true,
          found: true,
          source: sheetsToCheck[s],
          license: existing.licenseKey,
          licenseKey: existing.licenseKey,
          orderId: existing.orderId,
          email: existing.email,
          emailSent: false,
          emailSentNow: false,
          cooldownActive: true,
          copyOnlyPopup: true,
          resendAllowed: false,
          daysSinceLastEmail: elig.daysSince,
          remainingDays: elig.remainingDays,
          cooldownDays: EMAIL_RESEND_COOLDOWN_DAYS,
          lastEmailDate: elig.lastEmailDate,
          nextEligibleDate: elig.nextEligibleDate,
          message: 'Kirim ulang email hanya tersedia tiap 3 bulan sekali (berikutnya: ' + elig.nextEligibleDate + '). Silakan langsung salin (copy-paste) kode lisensi Anda di popup.'
        });
      }

      const brevoRes = sendEmailBrevo(email, existing.licenseKey, existing.customerName, existing.orderId, elig.isResend);
      const statusCol = existing.noteCol || (sheetsToCheck[s] === TAB_LYNK_ORDERS ? 11 : 9);
      sh.getRange(existing.rowIndex, statusCol).setValue(
        brevoRes.success ? stampEmailSentDate('TERKIRIM ULANG (Brevo)') : 'GAGAL KIRIM ULANG (' + brevoRes.error + ')'
      );
      if (brevoRes.success) {
        resolveErrorLog(ss, ['BREVO_API_GLOBAL', 'BREVO_TX|' + email + '|' + existing.orderId]);
      } else {
        recordErrorLog(ss, {
          incidentKey: 'BREVO_TX|' + email + '|' + existing.orderId,
          source: 'BREVO_EMAIL',
          orderId: existing.orderId,
          email: email,
          message: 'Gagal kirim ulang email Brevo (/claim): ' + brevoRes.error,
          detail: 'Lisensi: ' + existing.licenseKey
        });
      }
      return createJsonResponse({
        status: brevoRes.success ? 'success' : 'error',
        success: true,
        found: true,
        source: sheetsToCheck[s],
        license: existing.licenseKey,
        licenseKey: existing.licenseKey,
        orderId: existing.orderId,
        email: existing.email,
        emailSent: brevoRes.success,
        emailSentNow: brevoRes.success,
        cooldownActive: false,
        copyOnlyPopup: false,
        resendAllowed: true,
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
        const rows = sh.getRange(2, 1, cnt, Math.min(8, sh.getLastColumn())).getValues();
        for (let r = 0; r < rows.length; r++) {
          archiveBlockedLicenseRow(ss, {
            licenseKey: rows[r][3],
            email: rows[r][2],
            orderId: rows[r][1],
            sourceSheet: tabName,
            customerName: rows[r][7],
            reason: 'Dihapus via API Reset (' + tabName + ')'
          });
        }
        sh.deleteRows(2, cnt);
        totalDeleted += cnt;
      }
    });

    syncOrderSnapshot(ss);
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

  const latestLocked = getLatestLockedVersionResponse();
  const versi = String(params.versi || latestLocked.versi || 'v.1.0.2').trim();
  const tanggal = String(params.tanggal || latestLocked.tanggal || formatTanggalIndo(new Date())).trim();
  const jenisPerbaikan = String(params.jenis || params.jenis_perbaikan || 'Pembaruan tampilan & performa game edukatif.').trim();
  const status = 'Free / Gratis untuk Pembeli Resmi';
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
      no: params.no !== undefined ? params.no : latestLocked.no,
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
// 🔢 SISTEM VERSI OTOMATIS: `Logversi WPApp` + GITHUB PUSH + BREVO PENDING
// ============================================================================
const REQUIRED_VERSION_PROP_KEYS = [
  'GITHUB_TOKEN',
  'GITHUB_OWNER',
  'GITHUB_REPO',
  'GITHUB_BRANCH',
  'GITHUB_FILE_PATH',
  'BREVO_API_KEY'
];

const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Inisialisasi sekali saja 6 key Script Properties wajib (tanpa hardcode kredensial apapun).
 * Isi nilainya melalui Editor Apps Script > Project Settings (⚙️) > Script Properties.
 */
function setupProperties() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperties();
  const toCreate = {};

  REQUIRED_VERSION_PROP_KEYS.forEach(function(key) {
    if (!(key in existing)) {
      toCreate[key] = '';
    }
  });

  if (Object.keys(toCreate).length > 0) {
    props.setProperties(toCreate, false);
  }

  Logger.log('6 key Script Properties siap diisi di Project Settings > Script Properties: ' + REQUIRED_VERSION_PROP_KEYS.join(', '));
}

function validateSixRequiredProperties() {
  const props = PropertiesService.getScriptProperties();
  const config = {};

  for (let i = 0; i < REQUIRED_VERSION_PROP_KEYS.length; i++) {
    const key = REQUIRED_VERSION_PROP_KEYS[i];
    const val = String(props.getProperty(key) || '').trim();
    if (!val) {
      return {
        ok: false,
        missingKey: key,
        message: key + ' belum diisi di Script Properties'
      };
    }
    config[key] = val;
  }

  return { ok: true, config: config };
}

function getFormulaSeparator(ss) {
  try {
    const loc = String((ss || getTargetSpreadsheet()).getSpreadsheetLocale() || '').toLowerCase();
    // Locale pemisah koma (,) untuk argumen fungsi: en_*, ja_*, ko_*, zh_*, th_*, ms_*
    // Locale Indonesia (id_ID / id) & kebanyakan negara lainnya wajib memakai titik koma (;)
    if (/^(en|ja|ko|zh|th|ms|he|hi|ta|bn|my|km|lo|ne|si|ur)/.test(loc)) {
      return ',';
    }
    return ';';
  } catch (e) {
    return ';';
  }
}

function buildVersionFormula(rowNumber, argSep) {
  if (argSep === 'ARITH') {
    return '="v.1."&INT(A' + rowNumber + '/10)&"."&(A' + rowNumber + '-INT(A' + rowNumber + '/10)*10)';
  }
  const sep = argSep || ';';
  return '="v.1."&INT(A' + rowNumber + '/10)&"."&MOD(A' + rowNumber + sep + '10)';
}

function formatVersionFromNo(no) {
  const n = parseInt(no, 10);
  return 'v.1.' + Math.floor(n / 10) + '.' + (n % 10);
}

function formatTanggalIndo(dateObj) {
  const d = dateObj || new Date();
  const day = Utilities.formatDate(d, 'Asia/Jakarta', 'd');
  const monthIdx = parseInt(Utilities.formatDate(d, 'Asia/Jakarta', 'M'), 10) - 1;
  const year = Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy');
  return day + ' ' + (INDO_MONTH_NAMES[monthIdx] || 'Januari') + ' ' + year;
}

function applyLogversiValidationsAndLocks(sheet, argSep) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const sep = argSep || getFormulaSeparator(sheet.getParent());

  // Validasi Duplikat pada kolom B (Versi) — aman di locale Indonesia (;) maupun US (,)
  try {
    const dupRule = SpreadsheetApp.newDataValidation()
      .requireFormulaSatisfied('=COUNTIF($B$2:$B' + sep + 'B2)=1')
      .setAllowInvalid(false)
      .setHelpText('Versi tidak boleh duplikat dan harus urut v.1.INT(No/10).MOD(No,10).')
      .build();
    sheet.getRange(2, 2, lastRow - 1, 1).setDataValidation(dupRule);
  } catch (err) {
    Logger.log('Info validasi Logversi: ' + err.toString());
  }
}

function formatLogversiLayout(sheet) {
  if (!sheet) return;
  try {
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 32);
    const widths = [64, 110, 155, 320, 235, 115, 165, 165, 235, 195, 115];
    for (let c = 0; c < widths.length; c++) {
      sheet.setColumnWidth(c + 1, widths[c]);
    }
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const count = lastRow - 1;
      sheet.getRange(2, 1, count, 11).setVerticalAlignment('middle');
      sheet.getRange(2, 1, count, 3).setHorizontalAlignment('center');
      sheet.getRange(2, 2, count, 1).setFontWeight('bold').setFontColor('#065f46');
      sheet.getRange(2, 4, count, 1).setHorizontalAlignment('left').setWrap(true);
      sheet.getRange(2, 5, count, 7).setHorizontalAlignment('center').setWrap(true);
    }
  } catch (err) {
    Logger.log('Warning formatLogversiLayout: ' + err.toString());
  }
}

function repairLogversiColumnBFormulas(ss, sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const numRows = lastRow - 1;
  const noValues = sheet.getRange(2, 1, numRows, 1).getDisplayValues();
  let workingSep = getFormulaSeparator(ss);

  function writeFormulasWithSep(sepMode) {
    const formulas = [];
    for (let i = 0; i < numRows; i++) {
      const rowNum = i + 2;
      const noStr = String(noValues[i][0] || '').trim();
      if (noStr === '') {
        formulas.push(['']);
      } else {
        formulas.push([buildVersionFormula(rowNum, sepMode)]);
      }
    }
    sheet.getRange(2, 2, numRows, 1).setFormulas(formulas);
    SpreadsheetApp.flush();
  }

  // Hapus data validation sementara agar sel #ERROR! lama bisa diperbaiki tanpa tertahan rule duplikat
  try {
    sheet.getRange(2, 2, numRows, 1).clearDataValidations();
  } catch (e) {}

  writeFormulasWithSep(workingSep);

  // Verifikasi hasil nyata di sheet (cari sel pertama yang punya No)
  let sampleRow = 2;
  for (let i = 0; i < numRows; i++) {
    if (String(noValues[i][0] || '').trim() !== '') {
      sampleRow = i + 2;
      break;
    }
  }
  let sampleDisp = String(sheet.getRange(sampleRow, 2).getDisplayValue() || '').trim();

  if (sampleDisp.startsWith('#') || sampleDisp === '') {
    workingSep = workingSep === ';' ? ',' : ';';
    writeFormulasWithSep(workingSep);
    sampleDisp = String(sheet.getRange(sampleRow, 2).getDisplayValue() || '').trim();
  }

  if (sampleDisp.startsWith('#') || sampleDisp === '') {
    writeFormulasWithSep('ARITH');
  }

  applyLogversiValidationsAndLocks(sheet, workingSep);
  formatLogversiLayout(sheet);
  SpreadsheetApp.flush();
}

function protectLogversiRow(sheet, rowNumber) {
  try {
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    const targetA1 = 'A' + rowNumber + ':K' + rowNumber;
    for (let i = 0; i < protections.length; i++) {
      if (protections[i].getRange().getA1Notation() === targetA1) {
        return;
      }
    }
    const prot = sheet.getRange(rowNumber, 1, 1, 11).protect();
    prot.setDescription('Terkunci otomatis setelah tanggal versi terisi (Baris ' + rowNumber + ')');
    prot.setWarningOnly(true);
  } catch (err) {
    Logger.log('Info proteksi baris Logversi: ' + err.toString());
  }
}

function ensureLogversiSheet(ss) {
  const headers = [
    'No',
    'Versi',
    'Tanggal',
    'Yang Diubah',
    'Status',
    'Jeda (Menit)',
    'Waktu Klik',
    'Waktu Push GitHub',
    'Waktu Jadwal Kirim Brevo',
    'Waktu Kirim Brevo',
    'Terkunci'
  ];

  const sheet = ensureSheetHeaders(ss, TAB_LOGVERSI, headers, '#065f46');
  const sep = getFormulaSeparator(ss);

  if (sheet.getLastRow() <= 1) {
    const initialDate = formatTanggalIndo(new Date());
    const rows = [];
    for (let no = 0; no <= 100; no++) {
      const sheetRow = no + 2;
      const formulaVersi = buildVersionFormula(sheetRow, sep);
      if (no === 0) {
        rows.push([
          0,
          formulaVersi,
          initialDate,
          'Rilis awal aplikasi Wali Pintar',
          'TERKIRIM',
          '-',
          '-',
          '-',
          '-',
          initialDate,
          'TERKUNCI'
        ]);
      } else if (no === 1) {
        rows.push([
          1,
          formulaVersi,
          initialDate,
          'Pembaruan awal & stabilitas sistem',
          'TERKIRIM',
          '-',
          '-',
          '-',
          '-',
          initialDate,
          'TERKUNCI'
        ]);
      } else if (no === 2) {
        rows.push([
          2,
          formulaVersi,
          initialDate,
          'Perbaikan affiliate, logika game & stabilitas lisensi',
          'TERKIRIM',
          '-',
          '-',
          '-',
          '-',
          initialDate,
          'TERKUNCI'
        ]);
      } else {
        rows.push([no, formulaVersi, '', '', '', '', '', '', '', '', '']);
      }
    }

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(2, 1, rows.length, 1).setNumberFormat('0');
    sheet.getRange(2, 3, rows.length, 1).setNumberFormat('@');
    sheet.getRange(2, 1, 3, headers.length).setBackground('#ecfdf5');
    SpreadsheetApp.flush();

    // Pastikan rumus kolom B tidak #ERROR! apa pun locale spreadsheet-nya
    const checkDisp = String(sheet.getRange(2, 2).getDisplayValue() || '').trim();
    if (checkDisp.startsWith('#') || checkDisp === '') {
      repairLogversiColumnBFormulas(ss, sheet);
    } else {
      applyLogversiValidationsAndLocks(sheet, sep);
      formatLogversiLayout(sheet);
    }
    protectLogversiRow(sheet, 2);
    protectLogversiRow(sheet, 3);
    protectLogversiRow(sheet, 4);
    SpreadsheetApp.flush();
  } else {
    // Auto-deteksi & perbaiki otomatis jika masih ada #ERROR! atau versi kosong di sheet existing
    const lastRow = sheet.getLastRow();
    const checkPairs = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    let needsRepair = false;
    const defaultSeeds = {
      0: 'Rilis awal aplikasi Wali Pintar',
      1: 'Pembaruan awal & stabilitas sistem',
      2: 'Perbaikan affiliate, logika game & stabilitas lisensi'
    };
    const defaultDate = formatTanggalIndo(new Date());

    for (let i = 0; i < checkPairs.length; i++) {
      const a = String(checkPairs[i][0] || '').trim();
      const b = String(checkPairs[i][1] || '').trim();
      const c = String(checkPairs[i][2] || '').trim();
      if (b.startsWith('#') || (a !== '' && b === '')) {
        needsRepair = true;
      }
      const noInt = parseInt(a, 10);
      if (!isNaN(noInt) && (noInt === 0 || noInt === 1 || noInt === 2) && c === '') {
        const targetRow = i + 2;
        sheet.getRange(targetRow, 3, 1, 9).setValues([[
          defaultDate,
          defaultSeeds[noInt],
          'TERKIRIM',
          '-',
          '-',
          '-',
          '-',
          defaultDate,
          'TERKUNCI'
        ]]);
        sheet.getRange(targetRow, 1, 1, 11).setBackground('#ecfdf5');
        protectLogversiRow(sheet, targetRow);
      }
    }
    if (needsRepair) {
      repairLogversiColumnBFormulas(ss, sheet);
    }
  }

  return sheet;
}

/**
 * Pengaman anti-edit untuk baris yang tanggalnya sudah terisi & anti-duplikat versi di Sheet `Logversi WPApp`.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (!sheet) return;
    const sheetName = sheet.getName();

    // Deteksi penghapusan / pengosongan lisensi atau email manual di sheet order -> pindahkan ke "Lisensi terblokir"
    if (sheetName === TAB_SCALEV_ORDERS || sheetName === TAB_LYNK_ORDERS) {
      if (e.range.getRow() >= 2) {
        reconcileDeletedOrderRows(sheet.getParent(), 'Dihapus / dikosongkan manual di ' + sheetName);
      }
      return;
    }

    if (sheetName !== TAB_LOGVERSI) return;

    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (row < 2) return;

    const lockVal = String(sheet.getRange(row, 11).getDisplayValue() || '').trim().toUpperCase();
    const dateVal = String(sheet.getRange(row, 3).getDisplayValue() || '').trim();

    // Cegah edit baris yang sudah terisi tanggalnya / berstatus TERKUNCI
    if (lockVal === 'TERKUNCI' || (col === 3 && e.oldValue !== undefined && String(e.oldValue).trim() !== '') || (col !== 3 && dateVal !== '')) {
      e.range.setValue(e.oldValue !== undefined ? e.oldValue : '');
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Baris ini sudah terkunci karena tanggal versi sudah terisi.',
        '🔒 Terkunci',
        5
      );
      return;
    }

    // Cegah input versi duplikat di kolom B
    if (col === 2) {
      const editedVersi = String(e.range.getDisplayValue() || '').trim();
      const allVersi = sheet.getRange(2, 2, Math.max(1, sheet.getLastRow() - 1), 1).getDisplayValues();
      let count = 0;
      for (let i = 0; i < allVersi.length; i++) {
        if (String(allVersi[i][0] || '').trim() === editedVersi && editedVersi !== '') {
          count++;
        }
      }
      if (count > 1) {
        e.range.setValue(e.oldValue !== undefined ? e.oldValue : '');
        SpreadsheetApp.getActiveSpreadsheet().toast(
          'Versi "' + editedVersi + '" sudah ada. Duplikat versi dilarang!',
          '❌ Duplikat Versi',
          5
        );
      }
    }
  } catch (err) {
    Logger.log('Error onEdit Logversi: ' + err.toString());
  }
}

/**
 * Mengambil data versi terbaru yang tanggalnya sudah terisi (SAH / TERKUNCI) dari Sheet `Logversi WPApp`.
 */
function getLatestLockedVersionResponse() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ensureLogversiSheet(ss);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { versi: 'v.1.0.2', no: 2, tanggal: formatTanggalIndo(new Date()) };
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    let latest = null;

    for (let i = 0; i < values.length; i++) {
      const noRaw = String(values[i][0] || '').trim();
      const versiRaw = String(values[i][1] || '').trim();
      const tanggalRaw = String(values[i][2] || '').trim();

      if (noRaw !== '' && tanggalRaw !== '') {
        const noNum = parseInt(noRaw, 10);
        if (!isNaN(noNum)) {
          const safeVersi = (versiRaw && !versiRaw.startsWith('#')) ? versiRaw : formatVersionFromNo(noNum);
          latest = {
            versi: safeVersi,
            no: noNum,
            tanggal: tanggalRaw
          };
        }
      }
    }

    if (!latest) {
      return { versi: 'v.1.0.2', no: 2, tanggal: formatTanggalIndo(new Date()) };
    }
    return latest;
  } catch (err) {
    Logger.log('Error getLatestLockedVersionResponse: ' + err.toString());
    return { versi: 'v.1.0.2', no: 2, tanggal: '' };
  }
}

/**
 * Tombol GENERATE 50 VERSI BARU:
 * Hanya jalan jika semua tanggal di daftar sebelumnya sudah terisi semua.
 * Melanjutkan dari nomor terakhir + 50, serta mengecek duplikat.
 */
function generate50() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const sheet = ensureLogversiSheet(ss);
  const lastRow = sheet.getLastRow();

  const existingNos = new Set();
  const existingVersions = new Set();
  let emptyDateCount = 0;
  let maxNo = -1;

  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    for (let i = 0; i < rows.length; i++) {
      const noStr = String(rows[i][0] || '').trim();
      const verStr = String(rows[i][1] || '').trim();
      const tglStr = String(rows[i][2] || '').trim();

      if (noStr === '') continue;
      const noNum = parseInt(noStr, 10);
      if (!isNaN(noNum)) {
        existingNos.add(noNum);
        if (noNum > maxNo) maxNo = noNum;
      }
      if (verStr) {
        existingVersions.add(verStr);
      }
      if (tglStr === '') {
        emptyDateCount++;
      }
    }
  }

  if (emptyDateCount > 0) {
    ui.alert(
      '⚠️ Belum Bisa Generate 50 Versi Baru',
      'Semua tanggal di list sebelumnya harus terisi semua terlebih dahulu.\n\n' +
      'Sisa versi yang tanggalnya masih kosong: ' + emptyDateCount + ' versi.',
      ui.ButtonSet.OK
    );
    return;
  }

  const startNo = maxNo + 1;
  const newRows = [];
  const startSheetRow = lastRow + 1;

  const sep = getFormulaSeparator(ss);
  for (let offset = 0; offset < 50; offset++) {
    const nextNo = startNo + offset;
    const nextVersi = formatVersionFromNo(nextNo);
    if (existingNos.has(nextNo) || existingVersions.has(nextVersi)) {
      ui.alert(
        '❌ Validasi Duplikat Gagal',
        'Terdeteksi duplikat nomor/versi pada No ' + nextNo + ' (' + nextVersi + '). Proses dibatalkan.',
        ui.ButtonSet.OK
      );
      return;
    }
    existingNos.add(nextNo);
    existingVersions.add(nextVersi);

    const targetRowNum = startSheetRow + offset;
    const formulaVersi = buildVersionFormula(targetRowNum, sep);
    newRows.push([nextNo, formulaVersi, '', '', '', '', '', '', '', '', '']);
  }

  sheet.getRange(startSheetRow, 1, newRows.length, 11).setValues(newRows);
  sheet.getRange(startSheetRow, 1, newRows.length, 1).setNumberFormat('0');
  sheet.getRange(startSheetRow, 3, newRows.length, 1).setNumberFormat('@');
  SpreadsheetApp.flush();

  const checkNewDisp = String(sheet.getRange(startSheetRow, 2).getDisplayValue() || '').trim();
  if (checkNewDisp.startsWith('#') || checkNewDisp === '') {
    repairLogversiColumnBFormulas(ss, sheet);
  } else {
    applyLogversiValidationsAndLocks(sheet, sep);
    formatLogversiLayout(sheet);
  }
  SpreadsheetApp.flush();

  ui.alert(
    '✅ Berhasil Generate 50 Versi Baru',
    'Berhasil menambahkan 50 versi berurutan:\n' +
    '• Mulai: No ' + startNo + ' (' + formatVersionFromNo(startNo) + ')\n' +
    '• Sampai: No ' + (startNo + 49) + ' (' + formatVersionFromNo(startNo + 49) + ')',
    ui.ButtonSet.OK
  );
}

function getNextUnlockedVersionEntry(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
  const lockedVersions = new Set();

  for (let i = 0; i < rows.length; i++) {
    const v = String(rows[i][1] || '').trim();
    const t = String(rows[i][2] || '').trim();
    if (v && t !== '') lockedVersions.add(v);
  }

  for (let i = 0; i < rows.length; i++) {
    const noRaw = String(rows[i][0] || '').trim();
    const tglRaw = String(rows[i][2] || '').trim();
    if (noRaw !== '' && tglRaw === '') {
      const noNum = parseInt(noRaw, 10);
      if (isNaN(noNum)) continue;
      const expectedVersi = formatVersionFromNo(noNum);
      if (lockedVersions.has(expectedVersi)) {
        throw new Error('Validasi duplikat: versi ' + expectedVersi + ' sudah pernah terkunci.');
      }
      return {
        rowNumber: i + 2,
        no: noNum,
        versi: expectedVersi
      };
    }
  }

  return null;
}

// ============================================================================
// 📢 1 MENU SAJA: "broadcast versi brevo & github"
// ============================================================================
function menuBroadcastUpdate() {
  const ui = SpreadsheetApp.getUi();
  const propCheck = validateSixRequiredProperties();
  if (!propCheck.ok) {
    ui.alert(
      '⚠️ Script Properties Belum Lengkap',
      propCheck.message + '\n\nIsi ke-6 key wajib di Apps Script > Project Settings (⚙️) > Script Properties:\n' +
      REQUIRED_VERSION_PROP_KEYS.join('\n'),
      ui.ButtonSet.OK
    );
    return;
  }

  const ss = getTargetSpreadsheet();
  initAllSheets(ss);
  const logSheet = ensureLogversiSheet(ss);

  let nextEntry = null;
  try {
    nextEntry = getNextUnlockedVersionEntry(logSheet);
  } catch (err) {
    ui.alert('❌ Validasi Versi Gagal', err.message, ui.ButtonSet.OK);
    return;
  }

  if (!nextEntry) {
    ui.alert(
      '⚠️ Slot Versi Habis',
      'Semua baris di sheet "' + TAB_LOGVERSI + '" sudah terisi tanggalnya.\n' +
      'Jalankan fungsi generate50() terlebih dahulu untuk menambah 50 versi baru.',
      ui.ButtonSet.OK
    );
    return;
  }

  const now = new Date();
  const lockedDateText = formatTanggalIndo(now);
  const serverHour = parseInt(Utilities.formatDate(now, 'Asia/Jakarta', 'H'), 10);
  const serverMinute = parseInt(Utilities.formatDate(now, 'Asia/Jakarta', 'm'), 10);
  const activeRecipients = collectBroadcastRecipients(ss, 'SEMUA', '');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
        .card { background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 18px; }
        .badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 800; }
        .locked-date { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 800; margin-bottom: 14px; }
        label { display: block; font-size: 12.5px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
        textarea, input[type="number"] { width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; color: #0f172a; background: #fff; }
        textarea:focus, input[type="number"]:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .field { margin-bottom: 14px; }
        .preview { margin-top: 6px; font-size: 12.5px; font-weight: 700; color: #047857; background: #ecfdf5; padding: 7px 10px; border-radius: 8px; border: 1px solid #a7f3d0; }
        .hint { margin-top: 4px; font-size: 11.5px; color: #64748b; }
        .btn { width: 100%; padding: 13px 16px; border: none; border-radius: 12px; background: #059669; color: #ffffff; font-size: 14.5px; font-weight: 900; cursor: pointer; text-transform: lowercase; letter-spacing: 0.2px; }
        .btn:hover { background: #047857; }
        .btn:disabled { background: #94a3b8; cursor: not-allowed; }
        .status-box { margin-top: 12px; font-size: 12.5px; font-weight: 700; display: none; padding: 10px 12px; border-radius: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge-row">
          <div class="badge">Versi Baru: ${nextEntry.versi} (No ${nextEntry.no})</div>
          <div class="badge">Penerima Aktif: ${activeRecipients.length} Pembeli</div>
        </div>

        <div class="locked-date">
          📅 Tanggal: ${lockedDateText} (Hari Ini - Terkunci)
        </div>

        <div class="field">
          <label for="yangDiubah">Yang Diubah</label>
          <textarea id="yangDiubah" rows="4" placeholder="Tuliskan daftar perbaikan atau pembaruan fitur versi ${nextEntry.versi}..."></textarea>
        </div>

        <div class="field">
          <label for="jedaMenit">Jeda Kirim Brevo (menit)</label>
          <input id="jedaMenit" type="number" min="60" max="360" value="60" oninput="updateSchedulePreview()" />
          <div id="schedulePreview" class="preview"></div>
          <div class="hint">Minimal 60 menit, maksimal 360 menit (6 jam). Kosongkan = otomatis 60 menit.</div>
        </div>

        <button id="submitBtn" type="button" class="btn" onclick="submitBroadcast()">broadcast &amp; push git version</button>
        <div id="statusBox" class="status-box"></div>
      </div>

      <script>
        var BASE_HOUR = ${serverHour};
        var BASE_MIN = ${serverMinute};

        function formatJamFromMinutes(totalMinutes) {
          var wrapped = ((totalMinutes % 1440) + 1440) % 1440;
          var hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
          var mm = String(wrapped % 60).padStart(2, '0');
          return hh + '.' + mm;
        }

        function updateSchedulePreview() {
          var raw = document.getElementById('jedaMenit').value.trim();
          var jeda = raw === '' ? 60 : Number(raw);
          var el = document.getElementById('schedulePreview');

          if (isNaN(jeda) || jeda < 60) {
            el.style.color = '#b91c1c';
            el.style.background = '#fef2f2';
            el.style.borderColor = '#fecaca';
            el.textContent = '⚠️ Minimal 60 menit sejak waktu klik sekarang.';
            return;
          }
          if (jeda > 360) {
            el.style.color = '#b91c1c';
            el.style.background = '#fef2f2';
            el.style.borderColor = '#fecaca';
            el.textContent = '⚠️ Maksimal 360 menit (6 jam).';
            return;
          }

          el.style.color = '#047857';
          el.style.background = '#ecfdf5';
          el.style.borderColor = '#a7f3d0';
          var nowTotal = BASE_HOUR * 60 + BASE_MIN;
          var targetJam = formatJamFromMinutes(nowTotal + Math.round(jeda));
          el.textContent = '⏰ Brevo akan terkirim jam ' + targetJam + ' WIB';
        }

        function submitBroadcast() {
          var yangDiubah = document.getElementById('yangDiubah').value.trim();
          if (!yangDiubah) {
            alert('Isian Yang Diubah wajib diisi!');
            return;
          }

          var rawJeda = document.getElementById('jedaMenit').value.trim();
          var jeda = rawJeda === '' ? 60 : Number(rawJeda);
          if (isNaN(jeda) || jeda < 60) {
            alert('Minimal 60 menit');
            return;
          }
          if (jeda > 360) {
            alert('Maksimal 360 menit');
            return;
          }

          var btn = document.getElementById('submitBtn');
          var statusBox = document.getElementById('statusBox');
          btn.disabled = true;
          btn.textContent = 'Memproses push GitHub & kunci Sheet...';
          statusBox.style.display = 'block';
          statusBox.style.background = '#eff6ff';
          statusBox.style.color = '#1e3a8a';
          statusBox.textContent = 'Menyimpan versi ke Logversi WPApp, push GitHub, dan menjadwalkan trigger Brevo...';

          google.script.run
            .withSuccessHandler(function(res) {
              statusBox.style.background = '#ecfdf5';
              statusBox.style.color = '#065f46';
              statusBox.style.whiteSpace = 'pre-line';
              statusBox.textContent = '✅ ' + res.message;
              btn.textContent = 'Selesai';
              setTimeout(function() {
                google.script.host.close();
              }, 3500);
            })
            .withFailureHandler(function(err) {
              btn.disabled = false;
              btn.textContent = 'broadcast & push git version';
              statusBox.style.background = '#fef2f2';
              statusBox.style.color = '#991b1b';
              statusBox.style.whiteSpace = 'pre-line';
              statusBox.textContent = '❌ ' + (err && err.message ? err.message : String(err));
              alert(err && err.message ? err.message : String(err));
            })
            .processBroadcastAndPushGit({
              yangDiubah: yangDiubah,
              jedaMenit: Math.round(jeda)
            });
        }

        updateSchedulePreview();
      </script>
    </body>
    </html>
  `;

  const output = HtmlService.createHtmlOutput(html).setWidth(520).setHeight(540);
  ui.showModalDialog(output, 'broadcast versi brevo & github');
}

function buildUpdatedManifestJsonText(rawText, newVersion) {
  let manifestObj = {
    id: '/',
    name: 'WaliPintar',
    short_name: 'WaliPintar',
    version: newVersion,
    start_url: '/',
    scope: '/',
    display: 'standalone'
  };
  if (rawText && rawText.trim() !== '') {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object') {
        manifestObj = parsed;
      }
    } catch (e) {}
  }
  // Jaga id, start_url, scope tetap konstan "/" agar update menimpa app lama (tidak ter-install jadi app kedua)
  manifestObj.id = '/';
  manifestObj.start_url = '/';
  manifestObj.scope = '/';
  manifestObj.name = manifestObj.name || 'WaliPintar';
  manifestObj.short_name = manifestObj.short_name || 'WaliPintar';
  manifestObj.version = newVersion;
  return JSON.stringify(manifestObj, null, 2) + '\n';
}

function buildUpdatedServiceWorkerText(rawText, newVersion, stampStr) {
  const buildBanner = '// Build-Version: ' + newVersion + ' (' + stampStr + ')';
  if (rawText && rawText.trim() !== '') {
    let updated = String(rawText);
    updated = updated.replace(/^\/\/ Build-Version:.*$/gm, '').replace(/^\s+/, '');
    updated = updated.replace(
      /(const\s+LOCKED_VERSION\s*=\s*['"])[^'"]*(['"];?)/,
      '$1' + newVersion + '$2'
    );
    if (!/const\s+LOCKED_VERSION\s*=/.test(updated)) {
      updated = "const LOCKED_VERSION = '" + newVersion + "';\n" + updated;
    }
    return buildBanner + '\n' + updated;
  }

  // Template lengkap fallback jika file service-worker.js belum ada di repo
  return [
    buildBanner,
    "const LOCKED_VERSION = '" + newVersion + "';",
    "const CACHE_NAME = 'walipintar-' + LOCKED_VERSION;",
    "const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/pwa-192x192.png', '/pwa-512x512.png'];",
    '',
    "self.addEventListener('install', (event) => {",
    '  event.waitUntil((async () => {',
    '    const cache = await caches.open(CACHE_NAME);',
    '    await Promise.all(CORE_ASSETS.map(async (url) => {',
    "      const res = await fetch(new Request(url, { cache: 'no-store' }));",
    '      if (res && res.ok) await cache.put(url, res);',
    '    }));',
    '    await self.skipWaiting();',
    '  })());',
    '});',
    '',
    "self.addEventListener('activate', (event) => {",
    '  event.waitUntil((async () => {',
    '    const keys = await caches.keys();',
    "    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));",
    '    await self.clients.claim();',
    '  })());',
    '});',
    '',
    "self.addEventListener('message', (event) => {",
    "  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();",
    '});',
    '',
    "self.addEventListener('fetch', (event) => {",
    "  if (event.request.method !== 'GET') return;",
    '  const url = new URL(event.request.url);',
    "  if (url.pathname === '/service-worker.js' || url.hostname.includes('script.google.com')) return;",
    "  if (event.request.mode === 'navigate' || url.pathname === '/manifest.json') {",
    '    event.respondWith(',
    "      fetch(new Request(event.request.url, { cache: 'no-store' }))",
    '        .then((res) => {',
    '          if (res && res.ok) {',
    '            const copy = res.clone();',
    '            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));',
    '          }',
    '          return res;',
    '        })',
    "        .catch(() => caches.match(event.request).then((c) => c || caches.match('/index.html')))",
    '    );',
    '    return;',
    '  }',
    '  if (url.origin === self.location.origin) {',
    '    event.respondWith(',
    '      caches.match(event.request).then((cached) => {',
    '        if (cached) return cached;',
    '        return fetch(event.request).then((res) => {',
    "          if (res && res.ok && res.type === 'basic') {",
    '            const copy = res.clone();',
    '            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));',
    '          }',
    '          return res;',
    '        });',
    '      })',
    '    );',
    '  }',
    '});',
    ''
  ].join('\n');
}

function buildUpdatedVersionButtonText(rawText, newVersion) {
  return String(rawText).replace(
    /(const\s+DEFAULT_FALLBACK_VERSION\s*=\s*['"])[^'"]*(['"];?)/,
    '$1' + newVersion + '$2'
  );
}

function fetchGitHubBlobText(owner, repo, sha, headers) {
  if (!sha) return '';
  const url =
    'https://api.github.com/repos/' +
    encodeURIComponent(owner) +
    '/' +
    encodeURIComponent(repo) +
    '/git/blobs/' +
    encodeURIComponent(sha);
  const res = UrlFetchApp.fetch(url, { method: 'get', headers: headers, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return '';
  const json = JSON.parse(res.getContentText());
  if (!json || !json.content) return '';
  const cleanB64 = String(json.content).replace(/\s/g, '');
  const bytes = Utilities.base64Decode(cleanB64);
  return Utilities.newBlob(bytes).getDataAsString('UTF-8');
}

function pushAllVersionFilesToGitHub(config, newVersion) {
  const token = String(config.GITHUB_TOKEN || '').trim();
  const owner = String(config.GITHUB_OWNER || '').trim();
  const repo = String(config.GITHUB_REPO || '').trim();
  const branch = String(config.GITHUB_BRANCH || '').trim();
  const configuredManifestPath = String(config.GITHUB_FILE_PATH || 'manifest.json').trim().replace(/^\/+/, '');
  const nowStamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH.mm.ss') + ' WIB';

  const baseRepoUrl = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo);
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'WaliPintar-AppsScript'
  };

  // 1. Cek branch target (pastikan branch live PWA benar-benar ada)
  const encodedBranchPath = 'heads/' + branch.split('/').map(encodeURIComponent).join('/');
  const refGetUrl = baseRepoUrl + '/git/ref/' + encodedBranchPath;
  const refPatchUrl = baseRepoUrl + '/git/refs/' + encodedBranchPath;
  const refRes = UrlFetchApp.fetch(refGetUrl, { method: 'get', headers: headers, muteHttpExceptions: true });
  if (refRes.getResponseCode() !== 200) {
    throw new Error(
      'Branch "' + branch + '" tidak ditemukan di ' + owner + '/' + repo +
      ' (HTTP ' + refRes.getResponseCode() + '). Periksa GITHUB_BRANCH di Script Properties.'
    );
  }
  const headCommitSha = JSON.parse(refRes.getContentText()).object.sha;

  // 2. Ambil base commit & tree lengkap repo
  const commitRes = UrlFetchApp.fetch(baseRepoUrl + '/git/commits/' + encodeURIComponent(headCommitSha), {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
  if (commitRes.getResponseCode() !== 200) {
    throw new Error('Gagal membaca commit HEAD branch "' + branch + '" (HTTP ' + commitRes.getResponseCode() + ').');
  }
  const baseTreeSha = JSON.parse(commitRes.getContentText()).tree.sha;

  const treeRes = UrlFetchApp.fetch(baseRepoUrl + '/git/trees/' + encodeURIComponent(baseTreeSha) + '?recursive=1', {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
  const repoFileMap = {};
  if (treeRes.getResponseCode() === 200) {
    const treeItems = JSON.parse(treeRes.getContentText()).tree || [];
    for (let i = 0; i < treeItems.length; i++) {
      if (treeItems[i].type === 'blob' && treeItems[i].path) {
        repoFileMap[treeItems[i].path] = treeItems[i].sha;
      }
    }
  }

  // 3. Kumpulkan seluruh file yang WAJIB ikut ter-push dalam 1 commit
  const targetTasks = [];
  const addedPaths = {};
  function addTask(path, kind) {
    const clean = String(path || '').replace(/^\/+/, '');
    if (!clean || addedPaths[clean]) return;
    addedPaths[clean] = true;
    targetTasks.push({ path: clean, kind: kind, existingSha: repoFileMap[clean] || null });
  }

  // Manifest utama dari Script Property + manifest lain yang ada di repo
  addTask(configuredManifestPath, 'manifest');
  ['manifest.json', 'public/manifest.json', 'public/manifest.webmanifest', 'license-system/manifest.json'].forEach(function(p) {
    if (repoFileMap[p]) addTask(p, 'manifest');
  });

  // Service Worker (semua path SW yang ada di repo, atau fallback di folder yang sama dengan manifest utama)
  let foundSwCount = 0;
  ['service-worker.js', 'public/service-worker.js', 'sw.js', 'license-system/sw.js'].forEach(function(p) {
    if (repoFileMap[p]) {
      addTask(p, 'sw');
      foundSwCount++;
    }
  });
  if (foundSwCount === 0) {
    const folderPrefix = configuredManifestPath.indexOf('/') !== -1
      ? configuredManifestPath.slice(0, configuredManifestPath.lastIndexOf('/') + 1)
      : '';
    addTask(folderPrefix + 'service-worker.js', 'sw');
  }

  // Fallback versi tombol di UI React (jika ada di repo)
  if (repoFileMap['src/components/VersionButton.tsx']) {
    addTask('src/components/VersionButton.tsx', 'version_button');
  }

  // 4. Siapkan konten & buat Git Blob per file + catat log per file
  const treeEntries = [];
  const fileLogs = [];
  let failedCount = 0;

  for (let i = 0; i < targetTasks.length; i++) {
    const task = targetTasks[i];
    try {
      const currentText = task.existingSha ? fetchGitHubBlobText(owner, repo, task.existingSha, headers) : '';
      let nextText = currentText;

      if (task.kind === 'manifest') {
        nextText = buildUpdatedManifestJsonText(currentText, newVersion);
      } else if (task.kind === 'sw') {
        nextText = buildUpdatedServiceWorkerText(currentText, newVersion, nowStamp);
      } else if (task.kind === 'version_button') {
        nextText = buildUpdatedVersionButtonText(currentText, newVersion);
      }

      const blobRes = UrlFetchApp.fetch(baseRepoUrl + '/git/blobs', {
        method: 'post',
        contentType: 'application/json',
        headers: headers,
        payload: JSON.stringify({
          content: nextText,
          encoding: 'utf-8'
        }),
        muteHttpExceptions: true
      });
      const blobCode = blobRes.getResponseCode();
      if (blobCode !== 200 && blobCode !== 201) {
        failedCount++;
        fileLogs.push('❌ ' + task.path + ' (HTTP ' + blobCode + ')');
        continue;
      }

      const blobSha = JSON.parse(blobRes.getContentText()).sha;
      treeEntries.push({
        path: task.path,
        mode: '100644',
        type: 'blob',
        sha: blobSha
      });
      fileLogs.push('✅ ' + task.path);
    } catch (fileErr) {
      failedCount++;
      fileLogs.push('❌ ' + task.path + ' (' + fileErr.message + ')');
    }
  }

  if (treeEntries.length === 0 || failedCount > 0) {
    throw new Error(
      'Sebagian/seluruh file gagal disiapkan untuk push ke branch "' + branch + '":\n' +
      fileLogs.join('\n')
    );
  }

  // 5. Buat 1 Git Tree, 1 Git Commit, lalu update branch ref (1 commit atomik semua file!)
  const newTreeRes = UrlFetchApp.fetch(baseRepoUrl + '/git/trees', {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries
    }),
    muteHttpExceptions: true
  });
  if (newTreeRes.getResponseCode() !== 200 && newTreeRes.getResponseCode() !== 201) {
    throw new Error('Gagal membuat Git Tree (HTTP ' + newTreeRes.getResponseCode() + '):\n' + fileLogs.join('\n'));
  }
  const newTreeSha = JSON.parse(newTreeRes.getContentText()).sha;

  const newCommitRes = UrlFetchApp.fetch(baseRepoUrl + '/git/commits', {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify({
      message: 'Update ke ' + newVersion + ' via tombol broadcast',
      tree: newTreeSha,
      parents: [headCommitSha]
    }),
    muteHttpExceptions: true
  });
  if (newCommitRes.getResponseCode() !== 200 && newCommitRes.getResponseCode() !== 201) {
    throw new Error('Gagal membuat Git Commit (HTTP ' + newCommitRes.getResponseCode() + ').');
  }
  const newCommitSha = JSON.parse(newCommitRes.getContentText()).sha;

  const updateRefRes = UrlFetchApp.fetch(refPatchUrl, {
    method: 'patch',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify({
      sha: newCommitSha,
      force: false
    }),
    muteHttpExceptions: true
  });
  const updateCode = updateRefRes.getResponseCode();
  if (updateCode !== 200) {
    let ghMsg = '';
    try {
      const errJson = JSON.parse(updateRefRes.getContentText() || '{}');
      if (errJson && errJson.message) ghMsg = ' - ' + errJson.message;
    } catch (e) {}
    throw new Error('Gagal update branch "' + branch + '" (HTTP ' + updateCode + ghMsg + ').');
  }

  return {
    timestamp: nowStamp,
    branch: branch,
    commitSha: newCommitSha,
    fileLogs: fileLogs
  };
}

function pushManifestVersionToGitHub(config, newVersion) {
  return pushAllVersionFilesToGitHub(config, newVersion).timestamp;
}

/**
 * Dijalankan langsung saat tombol "broadcast & push git version" di dialog diklik.
 * Hanya melakukan 2 langkah langsung:
 * 1) Push multi-file (manifest + service-worker.js + versi UI) ke GitHub dalam 1 commit atomik
 * 2) Simpan & kunci baris di `Logversi WPApp` (Status: "PUSH BERHASIL - BREVO PENDING") + pasang Time Trigger jeda Brevo.
 */
function processBroadcastAndPushGit(formData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const propCheck = validateSixRequiredProperties();
    if (!propCheck.ok) {
      throw new Error(propCheck.message);
    }
    const config = propCheck.config;

    const yangDiubah = String((formData && formData.yangDiubah) || '').trim();
    if (!yangDiubah) {
      throw new Error('Isian Yang Diubah tidak boleh kosong.');
    }

    const rawJeda = formData && formData.jedaMenit !== undefined && formData.jedaMenit !== ''
      ? Number(formData.jedaMenit)
      : 60;
    if (isNaN(rawJeda) || rawJeda < 60) {
      throw new Error('Minimal 60 menit');
    }
    if (rawJeda > 360) {
      throw new Error('Maksimal 360 menit');
    }
    const jedaMenit = Math.round(rawJeda);

    const ss = getTargetSpreadsheet();
    initAllSheets(ss);
    const logSheet = ensureLogversiSheet(ss);

    const nextEntry = getNextUnlockedVersionEntry(logSheet);
    if (!nextEntry) {
      throw new Error('Tidak ada versi kosong di Logversi WPApp. Jalankan generate50() terlebih dahulu.');
    }

    const clickTime = new Date();
    const lockedDateStr = formatTanggalIndo(clickTime);
    const clickTimeFull = Utilities.formatDate(clickTime, 'Asia/Jakarta', 'dd/MM/yyyy HH.mm.ss');
    const clickHHmm = Utilities.formatDate(clickTime, 'Asia/Jakarta', 'HH.mm');

    const schedTime = new Date(clickTime.getTime() + jedaMenit * 60000);
    const schedHHmm = Utilities.formatDate(schedTime, 'Asia/Jakarta', 'HH.mm');

    // 1. Push GitHub multi-file dalam 1 commit ke branch live
    const pushResult = pushAllVersionFilesToGitHub(config, nextEntry.versi);
    const pushTimeStr = pushResult.timestamp + ' [' + pushResult.branch + ']';

    // 2. Simpan ke Sheet Logversi WPApp dan KUNCI baris tersebut
    const scheduleSummary =
      'Klik: ' + clickHHmm +
      ', Jeda: ' + jedaMenit + ' menit' +
      ', Brevo Dijadwalkan: ' + schedHHmm;

    logSheet.getRange(nextEntry.rowNumber, 3, 1, 9).setValues([[
      lockedDateStr,
      yangDiubah,
      'PUSH BERHASIL - BREVO PENDING',
      jedaMenit,
      clickTimeFull,
      pushTimeStr,
      scheduleSummary,
      '(Pending - dijadwalkan ' + schedHHmm + ' WIB)',
      'TERKUNCI'
    ]]);
    logSheet.getRange(nextEntry.rowNumber, 1, 1, 11).setBackground('#fefce8');
    protectLogversiRow(logSheet, nextEntry.rowNumber);
    SpreadsheetApp.flush();

    // 3. Jadwalkan Time Trigger otomatis untuk Brevo tepat setelah jeda habis (TIDAK kirim sekarang!)
    ScriptApp.newTrigger('executePendingBrevoBroadcast')
      .timeBased()
      .after(jedaMenit * 60 * 1000)
      .create();

    return {
      success: true,
      versi: nextEntry.versi,
      no: nextEntry.no,
      tanggal: lockedDateStr,
      jedaMenit: jedaMenit,
      scheduledAt: schedHHmm,
      branch: pushResult.branch,
      commitSha: pushResult.commitSha,
      fileLogs: pushResult.fileLogs,
      message:
        'Push GitHub ke ' + nextEntry.versi + ' (branch: ' + pushResult.branch + ') berhasil & Sheet terkunci!\n' +
        'File ter-push:\n' + pushResult.fileLogs.join('\n') + '\n' +
        'Brevo dijadwalkan otomatis jam ' + schedHHmm + ' WIB (' + jedaMenit + ' menit lagi).'
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Trigger otomatis yang berjalan setelah jeda (60-360 menit) habis untuk mengirim Brevo 1 kali saja.
 */
function executePendingBrevoBroadcast() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return;
  }

  try {
    const propCheck = validateSixRequiredProperties();
    if (!propCheck.ok) {
      Logger.log('Trigger Brevo ditunda: ' + propCheck.message);
      return;
    }

    const ss = getTargetSpreadsheet();
    initAllSheets(ss);
    const logSheet = ensureLogversiSheet(ss);
    const lastRow = logSheet.getLastRow();
    if (lastRow < 2) return;

    const rows = logSheet.getRange(2, 1, lastRow - 1, 11).getDisplayValues();
    const nowMs = Date.now();
    let stillHasFuturePending = false;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const no = String(rows[i][0] || '').trim();
      const rawVersi = String(rows[i][1] || '').trim();
      const noInt = parseInt(no, 10);
      const versi = (rawVersi && !rawVersi.startsWith('#')) ? rawVersi : (!isNaN(noInt) ? formatVersionFromNo(noInt) : rawVersi);
      const tanggal = String(rows[i][2] || '').trim();
      const yangDiubah = String(rows[i][3] || '').trim();
      const status = String(rows[i][4] || '').trim();
      const jedaMenit = parseInt(String(rows[i][5] || '60').trim(), 10) || 60;
      const waktuKlikStr = String(rows[i][6] || '').replace(' WIB', '').trim();

      if (status !== 'PUSH BERHASIL - BREVO PENDING' || !tanggal) continue;

      let scheduledMs = 0;
      try {
        const parsedClick = Utilities.parseDate(waktuKlikStr, 'Asia/Jakarta', 'dd/MM/yyyy HH.mm.ss');
        scheduledMs = parsedClick.getTime() + jedaMenit * 60000;
      } catch (parseErr) {
        scheduledMs = 0;
      }

      // Jangan pernah kirim Brevo sebelum jeda habis
      if (scheduledMs > 0 && nowMs < scheduledMs - 60000) {
        stillHasFuturePending = true;
        continue;
      }

      const recipients = collectBroadcastRecipients(ss, 'SEMUA', '');
      if (recipients.length === 0) {
        logSheet.getRange(rowNum, 5).setValue('GAGAL KIRIM BREVO: Tidak ada penerima aktif');
        continue;
      }

      let successCount = 0;
      let failCount = 0;
      let firstError = '';

      for (let r = 0; r < recipients.length; r++) {
        const item = recipients[r];
        const res = sendBrevoBroadcastUpdateEmail(item.email, item.name, item.license, {
          no: no,
          versi: versi,
          tanggal: tanggal,
          jenisPerbaikan: yangDiubah,
          status: 'Free / Gratis untuk Pembeli Resmi'
        });

        if (res.success) {
          successCount++;
        } else {
          failCount++;
          if (!firstError) firstError = String(res.error || 'Gagal kirim Brevo');
        }
        Utilities.sleep(50);
      }

      if (failCount === 0 && successCount > 0) {
        const sentTimeStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH.mm.ss') + ' WIB';
        logSheet.getRange(rowNum, 5).setValue('TERKIRIM');
        logSheet.getRange(rowNum, 10).setValue(sentTimeStr);
        logSheet.getRange(rowNum, 1, 1, 11).setBackground('#ecfdf5');
      } else {
        logSheet.getRange(rowNum, 5).setValue('GAGAL KIRIM BREVO (' + failCount + ' gagal): ' + firstError.slice(0, 120));
        logSheet.getRange(rowNum, 1, 1, 11).setBackground('#fef2f2');
        try {
          recordErrorLog(ss, {
            incidentKey: 'BREVO_BROADCAST_' + versi,
            source: 'BREVO_BROADCAST',
            message: 'Gagal kirim Brevo ' + versi + ': ' + firstError,
            detail: 'Terkirim: ' + successCount + ', Gagal: ' + failCount
          });
        } catch (e) {}
      }
      SpreadsheetApp.flush();
    }

    // Bersihkan trigger lama agar tidak kirim ulang / menumpuk
    if (!stillHasFuturePending) {
      const triggers = ScriptApp.getProjectTriggers();
      for (let t = 0; t < triggers.length; t++) {
        if (triggers[t].getHandlerFunction() === 'executePendingBrevoBroadcast') {
          ScriptApp.deleteTrigger(triggers[t]);
        }
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function collectBroadcastRecipients(ss, targetSource, rangeInput) {
  const tabsToScan = targetSource === 'SEMUA'
    ? [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS]
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
  const apiKey = String(PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY') || '').trim();
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY belum diisi di Script Properties' };
  }

  const subject = 'WALI PINTAR UPDATE ' + updateData.versi + ' - ' + updateData.jenisPerbaikan;
  const htmlContent = generateUpdateBroadcastHtmlEmail(customerName, licenseKey, updateData);
  const recipientName = customerName && customerName.trim() && customerName.trim() !== '-' ? customerName.trim() : 'Ayah & Bunda Hebat';

  const payload = {
    sender: { name: getBrevoSenderName(), email: getBrevoSenderEmail() },
    to: [{ email: toEmail, name: recipientName }],
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
    const fixedExisting = findFixedLicenseForEmail(ss, email);
    if (fixedExisting) {
      ui.alert(
        '📌 Email Sudah Memiliki Lisensi Paten',
        'Email "' + email + '" sudah terdaftar permanen di sheet "' + fixedExisting.tabName + '" (Baris ' + fixedExisting.rowIndex + ').\n\n' +
        'Kode Lisensi Paten: ' + fixedExisting.licenseKey + '\n' +
        'Status: ' + (fixedExisting.status || 'ACTIVE') + '\n\n' +
        'Sistem menjaga 1 email tetap 1 lisensi fix agar tidak berubah saat sheet di-refresh.',
        ui.ButtonSet.OK
      );
      return;
    }

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
      brevoRes.success ? stampEmailSentDate('Manual Admin | Email Brevo: TERKIRIM') : 'Manual Admin | Email Brevo: GAGAL (' + brevoRes.error + ')'
    );
    SpreadsheetApp.flush();

    if (brevoRes.success) {
      resolveErrorLog(ss, ['BREVO_API_GLOBAL', 'BREVO_TX|' + email + '|' + orderId]);
    } else {
      recordErrorLog(ss, {
        incidentKey: 'BREVO_TX|' + email + '|' + orderId,
        source: 'BREVO_EMAIL',
        orderId: orderId,
        email: email,
        message: 'Gagal kirim email Brevo (Manual): ' + brevoRes.error,
        detail: 'Lisensi: ' + licenseKey
      });
    }

    if (isLynk) generateLynkReport(true);
    else generateScalevReport(true);
    generateDashboard(true);
    syncOrderSnapshot(ss);

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

  const tabs = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS];
  for (let t = 0; t < tabs.length; t++) {
    const sh = ss.getSheetByName(tabs[t]);
    if (!sh || sh.getLastRow() <= 1) continue;

    const data = sh.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const email = String(data[i][2] || '').trim().toLowerCase();
      const key = String(data[i][3] || '').trim().toUpperCase();
      const orderId = String(data[i][1] || '').trim();
      const custName = String(data[i][7] || '').trim();
      const noteCol = tabs[t] === TAB_LYNK_ORDERS ? 11 : 9;
      const noteVal = String(data[i][noteCol - 1] || '').trim();

      if (email === query.toLowerCase() || key === query.toUpperCase()) {
        const elig = evaluateEmailResendEligibility(data[i][0], noteVal);
        if (!elig.allowed) {
          ui.alert(
            '📋 Salin Kode Lisensi (< 3 Bulan Belum Bisa Kirim Ulang)',
            'Kode Lisensi: ' + key + '\n' +
            'Email: ' + email + '\n\n' +
            'Email terakhir terkirim pada: ' + elig.lastEmailDate + '.\n' +
            'Kirim ulang via Brevo dibatasi tiap 3 bulan (90 hari) agar kuota tetap aman.\n' +
            'Pengiriman ulang tersedia lagi pada: ' + elig.nextEligibleDate + ' (' + elig.remainingDays + ' hari lagi).\n\n' +
            'Silakan copy-paste kode lisensi di atas langsung untuk pembeli.',
            ui.ButtonSet.OK
          );
          return;
        }

        const res = sendEmailBrevo(email, key, custName, orderId, elig.isResend);
        sh.getRange(i + 1, noteCol).setValue(
          res.success ? stampEmailSentDate('TERKIRIM ULANG (Brevo)') : 'GAGAL KIRIM ULANG (' + res.error + ')'
        );
        if (res.success) {
          resolveErrorLog(ss, ['BREVO_API_GLOBAL', 'BREVO_TX|' + email + '|' + orderId]);
        } else {
          recordErrorLog(ss, {
            incidentKey: 'BREVO_TX|' + email + '|' + orderId,
            source: 'BREVO_EMAIL',
            orderId: orderId,
            email: email,
            message: 'Gagal kirim ulang email Brevo (Manual Admin): ' + res.error,
            detail: 'Lisensi: ' + key
          });
        }
        generateDashboard(true);
        ui.alert(res.success ? '✅ Email Terkirim Ulang ke ' + email : '❌ Gagal Kirim: ' + res.error);
        return;
      }
    }
  }

  ui.alert('Data email / kode lisensi "' + query + '" tidak ditemukan di Scalev_Orders maupun Lynk_Orders.');
}

function ensureBlockedLicensesSheet(ss) {
  const targetSs = ss || getTargetSpreadsheet();
  return ensureSheetHeaders(targetSs, TAB_BLOCKED_LICENSES, [
    'Waktu Diblokir',
    'License Key',
    'Email',
    'Order ID',
    'Sumber Sheet',
    'Nama Pelanggan',
    'Keterangan'
  ], '#991b1b');
}

function archiveBlockedLicenseRow(ss, entry) {
  const targetSs = ss || getTargetSpreadsheet();
  const cleanLicense = String((entry && entry.licenseKey) || '').trim().toUpperCase();
  const cleanEmail = String((entry && entry.email) || '').trim().toLowerCase();
  const cleanOrderId = String((entry && entry.orderId) || '').trim();
  const sourceSheet = String((entry && entry.sourceSheet) || '').trim();
  const customerName = String((entry && entry.customerName) || '').trim();
  const reason = String((entry && entry.reason) || 'Dihapus dari daftar lisensi').trim();

  if (!cleanLicense && !cleanEmail) return false;

  const blockedSheet = ensureBlockedLicensesSheet(targetSs);
  const lastRow = blockedSheet.getLastRow();
  if (lastRow > 1) {
    const existingRows = blockedSheet.getRange(2, 2, lastRow - 1, 2).getValues();
    for (let i = 0; i < existingRows.length; i++) {
      const exLic = String(existingRows[i][0] || '').trim().toUpperCase();
      const exEmail = String(existingRows[i][1] || '').trim().toLowerCase();
      if (exLic === cleanLicense && exEmail === cleanEmail) {
        return false;
      }
    }
  }

  blockedSheet.appendRow([
    new Date(),
    cleanLicense || '-',
    cleanEmail || '-',
    cleanOrderId || '-',
    sourceSheet || '-',
    customerName || '-',
    reason
  ]);
  const newRow = blockedSheet.getLastRow();
  blockedSheet.getRange(newRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  SpreadsheetApp.flush();
  return true;
}

function findBlockedLicenseEntry(ss, licenseKey, email, orderId) {
  const targetSs = ss || getTargetSpreadsheet();
  const blockedSheet = targetSs.getSheetByName(TAB_BLOCKED_LICENSES);
  if (!blockedSheet || blockedSheet.getLastRow() <= 1) return null;

  const cleanLic = String(licenseKey || '').trim().toUpperCase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOrder = String(orderId || '').trim();
  if (!cleanLic && !cleanEmail && !cleanOrder) return null;

  const data = blockedSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowLic = String(data[i][1] || '').trim().toUpperCase();
    const rowEmail = String(data[i][2] || '').trim().toLowerCase();
    const rowOrder = String(data[i][3] || '').trim();

    const licMatch = cleanLic && rowLic && rowLic !== '-' && rowLic === cleanLic;
    const emailMatch = cleanEmail && rowEmail && rowEmail !== '-' && rowEmail === cleanEmail;
    const orderMatch = cleanOrder && rowOrder && rowOrder !== '-' && rowOrder === cleanOrder;

    if (licMatch || emailMatch || orderMatch) {
      return {
        rowIndex: i + 1,
        blockedAt: data[i][0],
        licenseKey: rowLic,
        email: rowEmail,
        orderId: rowOrder,
        sourceSheet: String(data[i][4] || '').trim(),
        reason: String(data[i][6] || '').trim()
      };
    }
  }
  return null;
}

function ensureOrderSnapshotSheet(ss) {
  const targetSs = ss || getTargetSpreadsheet();
  let snapSheet = targetSs.getSheetByName(TAB_ORDERS_SNAPSHOT);
  if (!snapSheet) {
    snapSheet = targetSs.insertSheet(TAB_ORDERS_SNAPSHOT);
  }
  if (snapSheet.getLastRow() === 0) {
    snapSheet.appendRow(['Sumber Sheet', 'Order ID', 'Email', 'License Key', 'Nama Pelanggan']);
  }
  try {
    if (!snapSheet.isSheetHidden()) {
      snapSheet.hideSheet();
    }
  } catch (e) {}
  return snapSheet;
}

function appendOrderSnapshotRow(ss, tabName, orderId, email, licenseKey, customerName) {
  try {
    const targetSs = ss || getTargetSpreadsheet();
    const snapSheet = ensureOrderSnapshotSheet(targetSs);
    snapSheet.appendRow([
      tabName,
      String(orderId || '').trim(),
      String(email || '').trim().toLowerCase(),
      String(licenseKey || '').trim().toUpperCase(),
      String(customerName || '').trim()
    ]);
  } catch (err) {
    Logger.log('Warning appendOrderSnapshotRow: ' + err.toString());
  }
}

function syncOrderSnapshot(ss) {
  try {
    const targetSs = ss || getTargetSpreadsheet();
    const snapSheet = ensureOrderSnapshotSheet(targetSs);
    const snapshotRows = [];

    [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].forEach(function(tabName) {
      const sh = targetSs.getSheetByName(tabName);
      if (!sh || sh.getLastRow() <= 1) return;
      const data = sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(8, sh.getLastColumn())).getValues();
      for (let i = 0; i < data.length; i++) {
        const orderId = String(data[i][1] || '').trim();
        const email = String(data[i][2] || '').trim().toLowerCase();
        const lic = String(data[i][3] || '').trim().toUpperCase();
        const custName = String(data[i][7] || '').trim();
        if (lic || email) {
          snapshotRows.push([tabName, orderId, email, lic, custName]);
        }
      }
    });

    const lastSnapRow = snapSheet.getLastRow();
    if (lastSnapRow > 1) {
      snapSheet.getRange(2, 1, lastSnapRow - 1, 5).clearContent();
    }
    if (snapshotRows.length > 0) {
      snapSheet.getRange(2, 1, snapshotRows.length, 5).setValues(snapshotRows);
    }
  } catch (err) {
    Logger.log('Warning syncOrderSnapshot: ' + err.toString());
  }
}

function reconcileDeletedOrderRows(ss, reasonLabel) {
  const targetSs = ss || getTargetSpreadsheet();
  const snapSheet = targetSs.getSheetByName(TAB_ORDERS_SNAPSHOT);
  if (!snapSheet || snapSheet.getLastRow() <= 1) {
    syncOrderSnapshot(targetSs);
    return 0;
  }

  const activeLicenses = new Set();
  const activeEmails = new Set();
  [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].forEach(function(tabName) {
    const sh = targetSs.getSheetByName(tabName);
    if (!sh || sh.getLastRow() <= 1) return;
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
    for (let i = 0; i < data.length; i++) {
      const email = String(data[i][2] || '').trim().toLowerCase();
      const lic = String(data[i][3] || '').trim().toUpperCase();
      if (lic) activeLicenses.add(lic);
      if (email) activeEmails.add(email);
    }
  });

  const snapRows = snapSheet.getRange(2, 1, snapSheet.getLastRow() - 1, 5).getValues();
  let archivedCount = 0;

  for (let i = 0; i < snapRows.length; i++) {
    const sourceTab = String(snapRows[i][0] || '').trim();
    const orderId = String(snapRows[i][1] || '').trim();
    const email = String(snapRows[i][2] || '').trim().toLowerCase();
    const lic = String(snapRows[i][3] || '').trim().toUpperCase();
    const custName = String(snapRows[i][4] || '').trim();

    if (!lic && !email) continue;

    const licStillExists = lic && activeLicenses.has(lic);
    const emailStillExists = email && activeEmails.has(email);

    if (!licStillExists && (!email || !emailStillExists)) {
      const added = archiveBlockedLicenseRow(targetSs, {
        licenseKey: lic,
        email: email,
        orderId: orderId,
        sourceSheet: sourceTab,
        customerName: custName,
        reason: reasonLabel || ('Dihapus manual dari ' + (sourceTab || 'Sheet'))
      });
      if (added) archivedCount++;
    }
  }

  syncOrderSnapshot(targetSs);
  return archivedCount;
}

function onBlockedRowChange(e) {
  try {
    const changeType = e && e.changeType ? String(e.changeType).toUpperCase() : '';
    if (changeType === 'REMOVE_ROW' || changeType === 'EDIT' || changeType === 'OTHER') {
      const ss = (e && e.source) ? e.source : getTargetSpreadsheet();
      reconcileDeletedOrderRows(ss, 'Dihapus manual dari Google Sheet (' + changeType + ')');
    }
  } catch (err) {
    Logger.log('Warning onBlockedRowChange: ' + err.toString());
  }
}

function setupBlockedLicenseMonitorTrigger(silent) {
  const ss = getTargetSpreadsheet();
  ensureBlockedLicensesSheet(ss);
  syncOrderSnapshot(ss);

  const existing = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onBlockedRowChange') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  ScriptApp.newTrigger('onBlockedRowChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  if (!silent) {
    SpreadsheetApp.getUi().alert(
      '🚫 Auto-Deteksi Lisensi terblokir Aktif!',
      'Setiap kali Anda menghapus baris lisensi (baik lewat menu Admin maupun klik kanan Delete Row di Scalev_Orders / Lynk_Orders), kode lisensi & email sebaris otomatis masuk ke tab "' + TAB_BLOCKED_LICENSES + '".',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function menuSetupBlockedLicenseMonitorTrigger() {
  setupBlockedLicenseMonitorTrigger(false);
}

function deleteMatchingLicenseRows(ss, target) {
  const cleanTarget = String(target || '').trim();
  let deletedCount = 0;

  [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].forEach(function(tabName) {
    const sh = ss.getSheetByName(tabName);
    if (!sh || sh.getLastRow() <= 1) return;

    const data = sh.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const orderId = String(data[i][1] || '').trim();
      const email = String(data[i][2] || '').trim().toLowerCase();
      const license = String(data[i][3] || '').trim().toUpperCase();
      const custName = String(data[i][7] || '').trim();

      if (
        license === cleanTarget.toUpperCase() ||
        email === cleanTarget.toLowerCase() ||
        orderId === cleanTarget
      ) {
        archiveBlockedLicenseRow(ss, {
          licenseKey: license,
          email: email,
          orderId: orderId,
          sourceSheet: tabName,
          customerName: custName,
          reason: 'Dihapus via Pencarian / API (' + cleanTarget + ')'
        });
        sh.deleteRow(i + 1);
        deletedCount++;
      }
    }
  });

  if (deletedCount > 0) {
    syncOrderSnapshot(ss);
  }
  return deletedCount;
}

function menuDeleteLicenseSearch() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    '🗑️ Hapus & Blokir Lisensi (Scalev & Lynk)',
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
    ui.alert('✅ Berhasil Dihapus & Diblokir', deletedCount + ' baris data yang cocok dengan "' + target + '" telah dihapus dan dicatat ke tab "' + TAB_BLOCKED_LICENSES + '".', ui.ButtonSet.OK);
  } else {
    ui.alert('Tidak ditemukan data dengan kriteria: ' + target);
  }
}

function menuDeleteSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();

  if ([TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].indexOf(sheetName) === -1) {
    ui.alert('Pindahkan kursor Anda terlebih dahulu ke tab "' + TAB_SCALEV_ORDERS + '" atau "' + TAB_LYNK_ORDERS + '" pada baris yang ingin dihapus.');
    return;
  }

  const row = activeSheet.getActiveRange().getRow();
  if (row <= 1) {
    ui.alert('Anda memilih baris Header. Silakan klik pada baris data lisensi (Baris 2 ke bawah).');
    return;
  }

  const rowData = activeSheet.getRange(row, 1, 1, Math.min(8, activeSheet.getLastColumn())).getValues()[0];
  const confirm = ui.alert(
    '⚠️ Konfirmasi Hapus & Blokir Baris #' + row + ' (' + sheetName + ')',
    'Yakin ingin menghapus dan memblokir?\nOrder ID: ' + rowData[1] + '\nEmail: ' + rowData[2] + '\nLisensi: ' + rowData[3] + '\n\nLisensi & Email akan dipindahkan ke tab "' + TAB_BLOCKED_LICENSES + '".',
    ui.ButtonSet.YES_NO
  );

  if (confirm === ui.Button.YES) {
    archiveBlockedLicenseRow(ss, {
      licenseKey: rowData[3],
      email: rowData[2],
      orderId: rowData[1],
      sourceSheet: sheetName,
      customerName: rowData[7],
      reason: 'Dihapus manual baris terpilih (' + sheetName + ')'
    });
    activeSheet.deleteRow(row);
    syncOrderSnapshot(ss);
    generateScalevReport(true);
    generateLynkReport(true);
    generateDashboard(true);
    ui.alert('🗑️ Baris berhasil dihapus dan dimasukkan ke "' + TAB_BLOCKED_LICENSES + '".');
  }
}

function menuDeleteAllOrders() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const sheetName = activeSheet.getName();

  const isOrderSheet = ([TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].indexOf(sheetName) !== -1);
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
    'Semua lisensi & email akan dipindahkan ke tab "' + TAB_BLOCKED_LICENSES + '" dan header akan dipertahankan.\nTindakan ini tidak dapat dibatalkan!',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    ui.alert('Penghapusan dibatalkan. Data tetap aman.');
    return;
  }

  const rows = targetSheet.getRange(2, 1, count, Math.min(8, targetSheet.getLastColumn())).getValues();
  for (let r = 0; r < rows.length; r++) {
    archiveBlockedLicenseRow(ss, {
      licenseKey: rows[r][3],
      email: rows[r][2],
      orderId: rows[r][1],
      sourceSheet: targetSheetName,
      customerName: rows[r][7],
      reason: 'Reset Total (' + targetSheetName + ')'
    });
  }

  targetSheet.deleteRows(2, count);
  syncOrderSnapshot(ss);
  generateScalevReport(true);
  generateLynkReport(true);
  generateDashboard(true);
  ui.alert('✅ Reset Berhasil!', 'Seluruh ' + count + ' data di tab "' + targetSheetName + '" telah dihapus dan dicatat di "' + TAB_BLOCKED_LICENSES + '".', ui.ButtonSet.OK);
}

// ============================================================================
// ✉️ 4. BREVO REST API v3 EMAIL DELIVERY & KONEKSI
// ============================================================================
function sendBrevoHtmlDirect(toEmail, toName, subject, htmlContent) {
  const apiKey = getScriptProp('BREVO_API_KEY', BREVO_API_KEY);
  if (!apiKey) {
    return { success: false, httpCode: 0, messageId: null, error: 'BREVO_API_KEY belum diisi di Properti Skrip GAS.' };
  }

  const senderEmail = getBrevoSenderEmail();
  if (!senderEmail || !senderEmail.includes('@')) {
    return { success: false, httpCode: 0, messageId: null, error: 'BREVO_SENDER_EMAIL belum diisi valid di Properti Skrip GAS.' };
  }

  const payload = {
    sender: { name: getBrevoSenderName(), email: senderEmail },
    to: [{ email: toEmail, name: toName || toEmail }],
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
      return { success: true, httpCode: code, messageId: json.messageId || 'OK', error: null };
    }
    return { success: false, httpCode: code, messageId: null, error: 'HTTP ' + code + ' - ' + text };
  } catch (err) {
    Logger.log('Error sendBrevoHtmlDirect: ' + err.toString());
    return { success: false, httpCode: 0, messageId: null, error: err.toString() };
  }
}

function sendEmailBrevo(toEmail, licenseKey, customerName, orderId, isResend) {
  const cleanName = (customerName && String(customerName).trim() && String(customerName).trim() !== '-')
    ? String(customerName).trim()
    : 'Ayah & Bunda Hebat';

  const subject = (isResend ? '[Kirim Ulang] ' : '🎉 ') + 'Lisensi Resmi Game Edukasi ' + BRAND_NAME + ': ' + licenseKey;
  const htmlContent = generateLicenseHtmlEmail(licenseKey, orderId || '-', cleanName);
  const res = sendBrevoHtmlDirect(toEmail, cleanName, subject, htmlContent);

  if (res.success) {
    resolveErrorLog(null, [
      'BREVO_API_GLOBAL',
      'BREVO_TX|' + String(toEmail || '').trim().toLowerCase() + '|' + String(orderId || '').trim()
    ]);
  } else if (res.httpCode === 0 || res.httpCode === 401 || res.httpCode === 402 || res.httpCode === 403 || res.httpCode >= 500) {
    recordErrorLog(null, {
      incidentKey: 'BREVO_API_GLOBAL',
      source: 'BREVO_EMAIL',
      orderId: String(orderId || ''),
      email: String(toEmail || ''),
      message: 'Brevo API Error: ' + res.error,
      detail: 'Subjek: ' + subject
    });
  }

  return res;
}

function parseOrderOrEmailDate(val) {
  if (!val) return null;
  try {
    if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
      return val;
    }
    const str = String(val).trim();
    if (!str) return null;

    const idMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[\s,]+(\d{2})[:.](\d{2})(?:[:.](\d{2}))?)?/);
    if (idMatch) {
      const isoStr = idMatch[3] + '-' + idMatch[2] + '-' + idMatch[1] + 'T' +
        (idMatch[4] || '00') + ':' + (idMatch[5] || '00') + ':' + (idMatch[6] || '00') + '+07:00';
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) return d;
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (e) {}
  return null;
}

function stampEmailSentDate(noteText) {
  const cleanNote = String(noteText || '').replace(/\s*\|\s*LastEmail:\d{4}-\d{2}-\d{2}/gi, '').trim();
  const todayIso = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  return cleanNote ? cleanNote + ' | LastEmail:' + todayIso : 'Email Brevo: TERKIRIM | LastEmail:' + todayIso;
}

function evaluateEmailResendEligibility(paymentTime, catatanStr) {
  const note = String(catatanStr || '');
  const upperNote = note.toUpperCase();
  const hasSentBefore = upperNote.includes('TERKIRIM');

  if (!hasSentBefore) {
    return {
      allowed: true,
      isResend: false,
      cooldownActive: false,
      daysSince: 0,
      remainingDays: 0,
      lastEmailDate: '',
      nextEligibleDate: ''
    };
  }

  let lastSentDate = null;
  const tagMatch = note.match(/LastEmail:(\d{4}-\d{2}-\d{2})/i);
  if (tagMatch) {
    const parsedTag = new Date(tagMatch[1] + 'T00:00:00+07:00');
    if (!isNaN(parsedTag.getTime())) {
      lastSentDate = parsedTag;
    }
  }

  if (!lastSentDate) {
    lastSentDate = parseOrderOrEmailDate(paymentTime) || new Date();
  }

  const diffMs = Math.max(0, Date.now() - lastSentDate.getTime());
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const eligibleDate = new Date(lastSentDate.getTime() + EMAIL_RESEND_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const lastEmailDate = Utilities.formatDate(lastSentDate, 'Asia/Jakarta', 'dd/MM/yyyy');
  const nextEligibleDate = Utilities.formatDate(eligibleDate, 'Asia/Jakarta', 'dd/MM/yyyy');

  if (daysSince >= EMAIL_RESEND_COOLDOWN_DAYS) {
    return {
      allowed: true,
      isResend: true,
      cooldownActive: false,
      daysSince: daysSince,
      remainingDays: 0,
      lastEmailDate: lastEmailDate,
      nextEligibleDate: nextEligibleDate
    };
  }

  return {
    allowed: false,
    isResend: false,
    cooldownActive: true,
    daysSince: daysSince,
    remainingDays: Math.max(1, EMAIL_RESEND_COOLDOWN_DAYS - daysSince),
    lastEmailDate: lastEmailDate,
    nextEligibleDate: nextEligibleDate
  };
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
      resolveErrorLog(null, ['BREVO_API_GLOBAL']);
      ui.alert(
        '✅ Koneksi Brevo API Sukses!',
        'Akun Brevo: ' + (info.email || 'OK') + '\nPerusahaan: ' + (info.companyName || BRAND_NAME),
        ui.ButtonSet.OK
      );
    } else {
      recordErrorLog(null, {
        incidentKey: 'BREVO_API_GLOBAL',
        source: 'BREVO_EMAIL',
        message: 'Uji Koneksi Brevo Gagal (HTTP ' + code + ')',
        detail: res.getContentText().slice(0, 180)
      });
      ui.alert('❌ Gagal Terhubung ke Brevo', 'HTTP ' + code + ': ' + res.getContentText(), ui.ButtonSet.OK);
    }
  } catch (err) {
    recordErrorLog(null, {
      incidentKey: 'BREVO_API_GLOBAL',
      source: 'BREVO_EMAIL',
      message: 'Error Uji Brevo: ' + err.toString()
    });
    ui.alert('❌ Error Uji Brevo', err.toString(), ui.ButtonSet.OK);
  }
}

// ============================================================================
// 🛡️ MODUL SCALEV API v3: VERIFIKASI REAL-TIME & SINKRONISASI ORDER
// ============================================================================
function extractScalevOrderList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.results)) return json.results;
  if (Array.isArray(json.orders)) return json.orders;
  if (json.data) {
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.data.results)) return json.data.results;
    if (Array.isArray(json.data.orders)) return json.data.orders;
    if (Array.isArray(json.data.items)) return json.data.items;
  }
  return [];
}

function isScalevOrderPaidAndValid(order) {
  if (!order || typeof order !== 'object') return false;
  const orderStatus = String(order.status || '').trim().toUpperCase();
  const payStatus = String(order.payment_status || '').trim().toUpperCase();

  const invalidStatuses = ['CANCELED', 'CANCELLED', 'REFUNDED', 'VOID', 'FAILED', 'EXPIRED', 'DRAFT', 'RTS'];
  if (invalidStatuses.indexOf(orderStatus) !== -1) return false;
  if (invalidStatuses.indexOf(payStatus) !== -1) return false;
  if (payStatus === 'UNPAID' || payStatus === 'PENDING') return false;

  if (orderStatus === 'COMPLETED') return true;
  if (payStatus === 'PAID' || payStatus === 'SETTLED' || payStatus === 'COMPLETED' || payStatus === 'SUCCESS') return true;
  if (!payStatus && (orderStatus === 'PAID' || orderStatus === 'SETTLED')) {
    return true;
  }
  return false;
}

function verifyScalevPayment(orderIdOrEmail) {
  if (!SCALEV_API_KEY) {
    return {
      configured: false,
      verified: false,
      notOrdered: true,
      message: 'SCALEV_API_KEY belum dipasang di Script Properties.'
    };
  }

  try {
    const cleanTarget = String(orderIdOrEmail || '').trim();
    if (!cleanTarget) {
      return { configured: true, verified: false, message: 'Parameter target kosong.' };
    }

    const cleanLower = cleanTarget.toLowerCase();
    const cacheKey = 'sclv_v3_' + Utilities.base64EncodeWebSafe(cleanLower).slice(0, 60);
    let cacheObj = null;
    try {
      cacheObj = CacheService.getScriptCache();
      const cachedRaw = cacheObj.get(cacheKey);
      if (cachedRaw) {
        const parsedCache = JSON.parse(cachedRaw);
        if (parsedCache && parsedCache.verified) {
          return parsedCache;
        }
      }
    } catch (e) {}

    const options = {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + SCALEV_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    let orderObj = null;
    let statusCode = 0;

    if (cleanTarget.includes('@')) {
      const emailLower = cleanTarget.toLowerCase();
      let response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=15&search=' + encodeURIComponent(emailLower), options);
      statusCode = response.getResponseCode();
      let listJson = null;
      try { listJson = JSON.parse(response.getContentText()); } catch (e) {}
      let orderList = extractScalevOrderList(listJson);

      if (orderList.length === 0) {
        response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=20', options);
        statusCode = response.getResponseCode();
        try { listJson = JSON.parse(response.getContentText()); } catch (e) {}
        orderList = extractScalevOrderList(listJson);
      }

      if (orderList.length > 0) {
        const matched = orderList.filter(function(item) {
          const cust = item.customer || {};
          const em = String(cust.email || item.customer_email || item.email || '').trim().toLowerCase();
          return em === emailLower;
        });

        if (matched.length > 0) {
          const paidOrder = matched.find(function(item) {
            return isScalevOrderPaidAndValid(item);
          });
          orderObj = paidOrder || matched[0];
        }
      }
    } else {
      let response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders/' + encodeURIComponent(cleanTarget), options);
      statusCode = response.getResponseCode();
      let rawJson = null;
      try { rawJson = JSON.parse(response.getContentText()); } catch (e) {}

      if (rawJson && rawJson.data && !Array.isArray(rawJson.data) && (rawJson.data.id || rawJson.data.order_id || rawJson.data.order_number)) {
        orderObj = rawJson.data;
      } else if (rawJson && (rawJson.order_id || rawJson.order_number || (rawJson.id && !rawJson.errors))) {
        orderObj = rawJson;
      }

      if (statusCode === 404 || !orderObj || (rawJson && rawJson.errors)) {
        response = UrlFetchApp.fetch('https://api.scalev.com/v3/orders?limit=20&search=' + encodeURIComponent(cleanTarget), options);
        statusCode = response.getResponseCode();
        let searchJson = null;
        try { searchJson = JSON.parse(response.getContentText()); } catch (e) {}
        const searchList = extractScalevOrderList(searchJson).filter(function(item) {
          const candidates = [
            String(item.order_id || '').trim(),
            String(item.order_number || '').trim(),
            String(item.code || '').trim(),
            String(item.id || '').trim()
          ];
          return candidates.indexOf(cleanTarget) !== -1;
        });
        if (searchList.length > 0) {
          const paidItem = searchList.find(function(item) {
            return isScalevOrderPaidAndValid(item);
          });
          orderObj = paidItem || searchList[0];
        }
      }
    }

    if (statusCode >= 200 && statusCode < 300) {
      resolveErrorLog(null, ['SCALEV_API_GLOBAL']);
    } else if (statusCode === 401 || statusCode === 403 || statusCode >= 500) {
      recordErrorLog(null, {
        incidentKey: 'SCALEV_API_GLOBAL',
        source: 'SCALEV_ORDER',
        orderId: cleanTarget.includes('@') ? '' : cleanTarget,
        email: cleanTarget.includes('@') ? cleanTarget.toLowerCase() : '',
        message: 'Scalev API Error HTTP ' + statusCode,
        detail: 'Target: ' + cleanTarget
      });
    }

    if (orderObj && (orderObj.id || orderObj.order_id || orderObj.order_number || orderObj.code)) {
      const isPaid = isScalevOrderPaidAndValid(orderObj);
      const paymentStatus = String(orderObj.payment_status || orderObj.status || '').toLowerCase();

      const customer = orderObj.customer || {};
      const customerEmail = customer.email || orderObj.customer_email || orderObj.email || '';
      const customerName = customer.name || orderObj.customer_name || orderObj.name || '';
      const officialOrderId = String(orderObj.order_id || orderObj.order_number || orderObj.code || orderObj.id || cleanTarget).trim();
      const grossRevenue = extractGrossRevenue(orderObj);
      const paymentTime = extractPaymentTime(orderObj);

      const resultPayload = {
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
          : 'Pesanan (' + (customerEmail || cleanTarget) + ') berstatus ' + (orderObj.status || paymentStatus || 'unpaid') + '.'
      };
      if (isPaid && cacheObj) {
        try { cacheObj.put(cacheKey, JSON.stringify(resultPayload), 300); } catch (e) {}
      }
      return resultPayload;
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
    recordErrorLog(null, {
      incidentKey: 'SCALEV_API_GLOBAL',
      source: 'SCALEV_ORDER',
      orderId: cleanTarget.includes('@') ? '' : cleanTarget,
      email: cleanTarget.includes('@') ? cleanTarget.toLowerCase() : '',
      message: 'Gagal menghubungi Scalev API: ' + err.toString()
    });
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
  const target = (json.data && !Array.isArray(json.data) && json.data.gross_revenue !== undefined) ? json.data : json;
  const candidates = [
    target.gross_revenue, target.total_amount, target.grand_total, target.total,
    target.total_price, target.amount, target.order_value, target.net_revenue
  ];
  if (target.pricing) {
    candidates.push(target.pricing.gross_revenue, target.pricing.grand_total, target.pricing.total, target.pricing.subtotal);
  }
  if (target.payment) {
    candidates.push(target.payment.gross_amount, target.payment.amount);
  }

  for (let i = 0; i < candidates.length; i++) {
    const num = parseRevenueNumber(candidates[i]);
    if (num > 0) return num;
  }

  const items = target.order_items || target.items || target.line_items;
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
    const headers = {
      'Authorization': 'Bearer ' + SCALEV_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Ambil seluruh halaman order dari Scalev API v3 (maks 20 halaman)
    const allOrders = [];
    const seenOrderIds = {};
    let nextUrl = 'https://api.scalev.com/v3/orders?limit=100';
    let pageCount = 0;

    while (nextUrl && pageCount < 20) {
      pageCount++;
      const response = UrlFetchApp.fetch(nextUrl, {
        method: 'get',
        headers: headers,
        muteHttpExceptions: true
      });

      const statusCode = response.getResponseCode();
      const content = response.getContentText();
      if (statusCode < 200 || statusCode >= 300) {
        if (pageCount === 1) {
          return { success: false, message: 'HTTP ' + statusCode + ': ' + content };
        }
        break;
      }

      const json = JSON.parse(content);
      const pageList = extractScalevOrderList(json);
      if (!pageList || pageList.length === 0) break;

      let addedThisPage = 0;
      for (let p = 0; p < pageList.length; p++) {
        const ord = pageList[p];
        const oid = String(ord.order_id || ord.order_number || ord.code || ord.id || '').trim();
        if (!oid || seenOrderIds[oid]) continue;
        seenOrderIds[oid] = true;
        allOrders.push(ord);
        addedThisPage++;
      }

      // Tentukan URL halaman berikutnya bila Scalev memakai cursor/next
      const dataWrap = (json && json.data && !Array.isArray(json.data)) ? json.data : json;
      if (dataWrap && dataWrap.next && typeof dataWrap.next === 'string') {
        nextUrl = dataWrap.next;
      } else if (dataWrap && dataWrap.has_next && dataWrap.last_id) {
        nextUrl = 'https://api.scalev.com/v3/orders?limit=100&last_id=' + encodeURIComponent(String(dataWrap.last_id));
      } else if (pageList.length >= 100 && addedThisPage > 0) {
        nextUrl = 'https://api.scalev.com/v3/orders?limit=100&page=' + (pageCount + 1);
      } else {
        nextUrl = '';
      }
    }

    if (allOrders.length === 0) {
      return {
        success: true,
        totalFetched: 0,
        completedCount: 0,
        completedGrossRevenue: 0,
        paidCount: 0,
        totalGrossRevenuePaid: 0,
        newLicensesCreated: 0,
        updatedCount: 0,
        message: 'Tidak ada pesanan ditemukan di Scalev.'
      };
    }

    const existingData = scalevSheet.getDataRange().getValues();
    const orderRowMap = {};
    const syntheticEmailRows = {};
    const fixedEmailLicenseMap = {};

    // Kumpulkan peta paten email -> lisensi dari BOTH sheets (Scalev_Orders & Lynk_Orders)
    // Prioritaskan baris ACTIVE paling awal agar kode lisensi tiap email selalu tetap selamanya.
    [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS].forEach(function(tabName) {
      const sh = ss.getSheetByName(tabName);
      if (!sh || sh.getLastRow() <= 1) return;
      const rows = sh.getDataRange().getValues();
      for (let r = 1; r < rows.length; r++) {
        const em = String(rows[r][2] || '').trim().toLowerCase();
        const lic = String(rows[r][3] || '').trim().toUpperCase();
        const st = String(rows[r][4] || '').trim().toUpperCase();
        if (!em || !lic || !lic.startsWith('WALI-')) continue;
        if (!fixedEmailLicenseMap[em] || (fixedEmailLicenseMap[em].status !== 'ACTIVE' && st === 'ACTIVE')) {
          fixedEmailLicenseMap[em] = { licenseKey: lic, status: st };
        }
      }
    });

    for (let i = 1; i < existingData.length; i++) {
      const oid = String(existingData[i][1] || '').trim();
      const em = String(existingData[i][2] || '').trim().toLowerCase();
      const lic = String(existingData[i][3] || '').trim().toUpperCase();
      if (oid) {
        orderRowMap[oid] = { row: i + 1, licenseKey: lic };
      }
      // Hanya izinkan fallback kecocokan email untuk baris ID sementara (SCLV-...) agar 2 order dari 1 email tidak saling menimpa!
      if (em && (!oid || oid.startsWith('SCLV-'))) {
        if (!syntheticEmailRows[em]) syntheticEmailRows[em] = [];
        syntheticEmailRows[em].push({ row: i + 1, licenseKey: lic });
      }
    }

    let newLicensesCreated = 0;
    let updatedCount = 0;
    let paidCount = 0;
    let completedCount = 0;
    let totalGrossRevenuePaid = 0;
    let completedGrossRevenue = 0;

    for (let k = 0; k < allOrders.length; k++) {
      const order = allOrders[k];
      const officialOrderId = String(order.order_id || order.order_number || order.code || order.id || '').trim();
      if (!officialOrderId) continue;

      const rawOrderStatus = String(order.status || '').trim().toUpperCase();
      const rawPayStatus = String(order.payment_status || order.status || '').trim().toUpperCase();
      const isPaid = isScalevOrderPaidAndValid(order);
      const isCompleted = (rawOrderStatus === 'COMPLETED') && isPaid;
      const normalizedPayStatus = isPaid ? 'PAID' : (rawPayStatus || rawOrderStatus || 'UNPAID');
      const grossRevenue = extractGrossRevenue(order);

      const customer = order.customer || {};
      const customerEmail = String(customer.email || order.customer_email || order.email || '').trim().toLowerCase();
      const customerName = String(customer.name || order.customer_name || order.name || '').trim();

      if (isCompleted) {
        completedCount++;
        completedGrossRevenue += grossRevenue;
      }
      if (isPaid) {
        paidCount++;
        totalGrossRevenuePaid += grossRevenue;
      }

      let matchedMeta = orderRowMap[officialOrderId] || null;
      if (!matchedMeta && isPaid && customerEmail && syntheticEmailRows[customerEmail] && syntheticEmailRows[customerEmail].length > 0) {
        matchedMeta = syntheticEmailRows[customerEmail].shift();
      }

      if (matchedMeta) {
        const existingRow = matchedMeta.row;
        const orderPaidTime = extractPaymentTime(order);
        if (orderPaidTime) {
          scalevSheet.getRange(existingRow, 1).setValue(orderPaidTime).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        }
        scalevSheet.getRange(existingRow, 2).setValue(officialOrderId);
        if (customerEmail) scalevSheet.getRange(existingRow, 3).setValue(customerEmail);

        if (isPaid) {
          if (!matchedMeta.licenseKey || !matchedMeta.licenseKey.toUpperCase().startsWith('WALI-')) {
            const pinned = customerEmail && fixedEmailLicenseMap[customerEmail] ? fixedEmailLicenseMap[customerEmail].licenseKey : '';
            const finalLic = pinned || generateUniqueLicenseKey(ss);
            scalevSheet.getRange(existingRow, 4).setValue(finalLic);
            matchedMeta.licenseKey = finalLic;
            if (!pinned) newLicensesCreated++;
            if (customerEmail) fixedEmailLicenseMap[customerEmail] = { licenseKey: finalLic, status: 'ACTIVE' };
          }
          scalevSheet.getRange(existingRow, 5).setValue('ACTIVE');
        } else {
          // Order belum lunas / dibatalkan / refund: nonaktifkan agar tidak dihitung di Total Paid, namun tetap pertahankan kolom lisensi paten jika sudah ada
          scalevSheet.getRange(existingRow, 5).setValue('INACTIVE');
        }

        scalevSheet.getRange(existingRow, 6).setValue(normalizedPayStatus);
        scalevSheet.getRange(existingRow, 7).setValue(grossRevenue).setNumberFormat('"Rp"#,##0');
        if (customerName) scalevSheet.getRange(existingRow, 8).setValue(customerName);
        orderRowMap[officialOrderId] = matchedMeta;
        updatedCount++;
      } else if (isPaid && customerEmail) {
        // Selalu pakai kode lisensi paten milik email ini jika sudah tercatat di sheet
        const pinned = fixedEmailLicenseMap[customerEmail] ? fixedEmailLicenseMap[customerEmail].licenseKey : '';
        const licenseKey = pinned || generateUniqueLicenseKey(ss);
        if (!pinned) newLicensesCreated++;
        fixedEmailLicenseMap[customerEmail] = { licenseKey: licenseKey, status: 'ACTIVE' };

        const orderPaidTime = extractPaymentTime(order);
        scalevSheet.appendRow([
          orderPaidTime,
          officialOrderId,
          customerEmail,
          licenseKey,
          'ACTIVE',
          'PAID',
          grossRevenue,
          customerName || '-',
          'Sinkronisasi Otomatis Scalev API'
        ]);
        const lastRow = scalevSheet.getLastRow();
        scalevSheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
        scalevSheet.getRange(lastRow, 7).setNumberFormat('"Rp"#,##0');
        SpreadsheetApp.flush();

        orderRowMap[officialOrderId] = { row: lastRow, licenseKey: licenseKey };
      }
    }

    SpreadsheetApp.flush();
    generateScalevReport(true);
    generateLynkReport(true);
    generateDashboard(true);
    resolveErrorLog(ss, ['SCALEV_API_GLOBAL', 'SCALEV_SYNC_ERROR']);

    return {
      success: true,
      totalFetched: allOrders.length,
      completedCount: completedCount,
      completedGrossRevenue: completedGrossRevenue,
      paidCount: paidCount,
      totalGrossRevenuePaid: totalGrossRevenuePaid,
      newLicensesCreated: newLicensesCreated,
      updatedCount: updatedCount
    };
  } catch (err) {
    Logger.log('Error syncOrdersFromScalev: ' + err.toString());
    recordErrorLog(ss, {
      incidentKey: 'SCALEV_SYNC_ERROR',
      source: 'SCALEV_SYNC',
      message: 'Gagal sinkronisasi Scalev API: ' + err.toString()
    });
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
      '• Order Completed (Scalev): ' + response.completedCount + ' (Rp ' + formatNumberId(response.completedGrossRevenue) + ')\n' +
      '• Order Lunas / Paid Valid: ' + response.paidCount + ' (Rp ' + formatNumberId(response.totalGrossRevenuePaid) + ')\n' +
      '• Lisensi Baru Diterbitkan: ' + response.newLicensesCreated + '\n' +
      '• Data Diperbarui: ' + response.updatedCount + '\n\n' +
      'Data tercatat di "' + TAB_SCALEV_ORDERS + '" & laporan diperbarui di "' + TAB_REPORT_SCALEV + '" + "' + TAB_DASHBOARD + '".',
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
      resolveErrorLog(null, ['SCALEV_API_GLOBAL', 'SCALEV_SYNC_ERROR']);
      ui.alert('🛡️ Koneksi Scalev API Aktif!', 'HTTP ' + code + ' (Terhubung). Verifikasi Anti-Bypass siap digunakan.', ui.ButtonSet.OK);
    } else {
      recordErrorLog(null, {
        incidentKey: 'SCALEV_API_GLOBAL',
        source: 'SCALEV_ORDER',
        message: 'Uji Koneksi Scalev API Gagal (HTTP ' + code + ')',
        detail: response.getContentText().slice(0, 180)
      });
      ui.alert('❌ Gagal Terhubung ke Scalev API', 'HTTP ' + code + ': ' + response.getContentText(), ui.ButtonSet.OK);
    }
  } catch (err) {
    recordErrorLog(null, {
      incidentKey: 'SCALEV_API_GLOBAL',
      source: 'SCALEV_ORDER',
      message: 'Error Uji Scalev API: ' + err.toString()
    });
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
          const postRes = UrlFetchApp.fetch(proxyUrl + '?sync_test=1', {
            method: 'post',
            contentType: 'application/json',
            headers: { 'X-Lynk-Signature': validHmac },
            payload: sampleRaw,
            muteHttpExceptions: true
          });
          const postCode = postRes.getResponseCode();
          const postBody = postRes.getContentText();
          postPingStatus = postCode === 200
            ? '✅ Sukses HTTP 200 ("' + postBody.substring(0, 30) + '") — Anti-302 + End-to-End GAS Aktif!'
            : '❌ HTTP ' + postCode + ': ' + postBody.substring(0, 120);
          if (postCode === 200) {
            resolveErrorLog(ss, ['LYNK_SIGNATURE_INVALID', 'LYNK_JSON_INVALID', 'LYNK_DOPOST_ERROR', 'WORKER_LYNK_BRIDGE', 'WORKER_LYNK|GLOBAL']);
          } else {
            recordErrorLog(ss, {
              incidentKey: 'WORKER_LYNK_BRIDGE',
              source: 'WORKER_LYNK_BRIDGE',
              message: 'Uji Bridge Lynk -> GAS Gagal (HTTP ' + postCode + ')',
              detail: postBody.substring(0, 160)
            });
          }
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
    (postPingStatus ? '\n6. End-to-End Sync POST Test (Worker -> GAS):\n   ' + postPingStatus : '') +
    '\n\n📌 Pastikan URL Webhook di dashboard Lynk.id diisi:\n' + proxyUrl +
    '\n(Worker langsung balas 200 OK < 50ms ke Lynk anti-timeout 5s, lalu teruskan ke GAS di background).',
    ui.ButtonSet.OK
  );
}

// ============================================================================
// 🛠️ HELPER UMUM: IDEMPOTENCY, ANTI-DUPLIKAT LINTAS SHEET, PARSER & FORMATTER
// ============================================================================
function getOrderSheetColumnIndices(headerRow, sheetName) {
  const isLynk = String(sheetName || '').trim() === TAB_LYNK_ORDERS;
  const cols = {
    time: 0,
    orderId: 1,
    email: 2,
    license: 3,
    status: 4,
    paymentStatus: 5,
    revenue: 6,
    name: 7,
    catatan: isLynk ? 10 : 8
  };

  if (!headerRow || !headerRow.length) return cols;

  for (let c = 0; c < headerRow.length; c++) {
    const h = String(headerRow[c] || '').trim().toLowerCase();
    if (!h) continue;
    if (h.includes('waktu') || h.includes('tanggal')) cols.time = c;
    else if (h.includes('order id') || h === 'order_id' || h === 'refid') cols.orderId = c;
    else if (h === 'email' || h.includes('email pembeli')) cols.email = c;
    else if (h === 'license key' || h === 'lisensi' || h.includes('license')) cols.license = c;
    else if (h === 'status lisensi' || h === 'status') cols.status = c;
    else if (h === 'payment status' || h.includes('pembayaran')) cols.paymentStatus = c;
    else if (h.includes('revenue') || h.includes('omzet') || h.includes('harga')) cols.revenue = c;
    else if (h.includes('nama pelanggan') || h === 'nama pembeli' || h === 'nama') cols.name = c;
    else if (h === 'catatan' || h.includes('notes')) cols.catatan = c;
  }
  return cols;
}

/**
 * Mencari lisensi paten milik sebuah email di seluruh tab order (`Scalev_Orders` & `Lynk_Orders`).
 * Selalu memprioritaskan baris `ACTIVE` paling awal agar kode lisensi tiap email tetap fix selamanya.
 */
function findFixedLicenseForEmail(ss, email) {
  const targetEmail = String(email || '').trim().toLowerCase();
  if (!ss || !targetEmail) return null;

  let fallbackMatch = null;
  const tabs = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS];

  for (let t = 0; t < tabs.length; t++) {
    const sh = ss.getSheetByName(tabs[t]);
    if (!sh || sh.getLastRow() <= 1) continue;

    const data = sh.getDataRange().getValues();
    const cols = getOrderSheetColumnIndices(data[0], tabs[t]);
    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][cols.email] || '').trim().toLowerCase();
      const rowLicense = String(data[i][cols.license] || '').trim().toUpperCase();
      const rowStatus = String(data[i][cols.status] || '').trim().toUpperCase();

      if (rowEmail === targetEmail && rowLicense && rowLicense.startsWith('WALI-')) {
        const matchObj = {
          tabName: tabs[t],
          rowIndex: i + 1,
          noteCol: cols.catatan + 1,
          paymentTime: data[i][cols.time],
          orderId: String(data[i][cols.orderId] || '').trim(),
          email: rowEmail,
          licenseKey: rowLicense,
          status: rowStatus,
          customerName: String(data[i][cols.name] || '').trim(),
          catatan: String(data[i][cols.catatan] || '').trim()
        };
        if (rowStatus === 'ACTIVE') {
          return matchObj;
        }
        if (!fallbackMatch) {
          fallbackMatch = matchObj;
        }
      }
    }
  }

  return fallbackMatch;
}

function findExistingOrder(sheet, orderId, email) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const data = sheet.getDataRange().getValues();
  const cols = getOrderSheetColumnIndices(data[0], sheet.getName());
  const targetOrder = String(orderId || '').trim();
  const targetEmail = String(email || '').trim().toLowerCase();

  let activeEmailMatch = null;
  let anyOrderMatch = null;
  let anyEmailMatch = null;

  for (let i = 1; i < data.length; i++) {
    const rowOrder = String(data[i][cols.orderId] || '').trim();
    const rowEmail = String(data[i][cols.email] || '').trim().toLowerCase();
    const rowLicense = String(data[i][cols.license] || '').trim().toUpperCase();
    const rowStatus = String(data[i][cols.status] || '').trim().toUpperCase();
    const rowPaymentStatus = String(data[i][cols.paymentStatus] || '').trim().toUpperCase();
    const rowName = String(data[i][cols.name] || '').trim();
    const rowCatatan = String(data[i][cols.catatan] || '').trim();

    if (!rowLicense) continue;

    const orderMatched = Boolean(targetOrder && rowOrder === targetOrder);
    const emailMatched = Boolean(targetEmail && rowEmail === targetEmail);
    if (!orderMatched && !emailMatched) continue;

    const matchObj = {
      rowIndex: i + 1,
      noteCol: cols.catatan + 1,
      paymentTime: data[i][cols.time],
      orderId: rowOrder,
      email: rowEmail,
      licenseKey: rowLicense,
      status: rowStatus,
      paymentStatus: rowPaymentStatus,
      customerName: rowName,
      catatan: rowCatatan
    };

    const isClaimable = rowStatus === 'ACTIVE' && isPaidPaymentStatus(rowPaymentStatus);
    if (orderMatched && isClaimable) {
      return matchObj;
    }
    if (emailMatched && isClaimable && !activeEmailMatch) {
      activeEmailMatch = matchObj;
    }
    if (orderMatched && !anyOrderMatch) {
      anyOrderMatch = matchObj;
    }
    if (emailMatched && !anyEmailMatch) {
      anyEmailMatch = matchObj;
    }
  }

  return activeEmailMatch || anyOrderMatch || anyEmailMatch;
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
 * Mengumpulkan seluruh kode lisensi yang sudah ada di SEMUA tab order
 * (`Scalev_Orders`, `Lynk_Orders`, dll.) agar tidak pernah bentrok.
 */
function collectAllExistingLicenseKeys(ss) {
  const existingSet = new Set();
  const priorityTabs = [TAB_SCALEV_ORDERS, TAB_LYNK_ORDERS];
  const allSheets = ss.getSheets();

  const sheetsToScan = [];
  priorityTabs.forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (sh) sheetsToScan.push(sh);
  });
  allSheets.forEach(function(sh) {
    const nm = sh.getName();
    if (
      priorityTabs.indexOf(nm) === -1 &&
      nm !== TAB_REPORT_SCALEV &&
      nm !== TAB_REPORT_LYNK &&
      nm !== TAB_DASHBOARD &&
      nm !== TAB_ORDERS_SNAPSHOT &&
      nm !== 'Licenses'
    ) {
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
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (val === null || val === undefined || val === '') return 0;
  let str = String(val).trim();
  if (!str) return 0;

  str = str.replace(/rp|idr|\s+/gi, '');

  // Format API desimal titik (misal "10000.00" atau "993.5")
  if (/^-?\d+\.\d{1,2}$/.test(str)) {
    const n = parseFloat(str);
    return isNaN(n) ? 0 : Math.round(n);
  }
  // Format US ribuan koma + desimal titik (misal "10,000.00")
  if (/^-?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(str)) {
    const n = parseFloat(str.replace(/,/g, ''));
    return isNaN(n) ? 0 : Math.round(n);
  }
  // Format Indonesia ribuan titik + opsional desimal koma (misal "10.000" atau "10.000,00")
  if (/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(str)) {
    const n = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : Math.round(n);
  }
  // Fallback desimal koma saja (misal "10000,00")
  if (/^-?\d+,\d{1,2}$/.test(str)) {
    const n = parseFloat(str.replace(',', '.'));
    return isNaN(n) ? 0 : Math.round(n);
  }

  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
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
  const noText = updateData.no !== undefined && updateData.no !== '' ? String(updateData.no) : '-';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #f8fafc; padding: 24px; border-radius: 24px; color: #1e293b; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" width="80" height="80" alt="${BRAND_NAME}" style="display: block; margin: 0 auto 12px auto; width: 80px; height: 80px; border-radius: 20px; border: 3px solid #bbf7d0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.18); object-fit: cover;" />
        <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 800; padding: 5px 14px; border-radius: 999px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px;">
          ✨ UPDATE TERBARU &bull; FREE / GRATIS UNTUK PEMBELI RESMI
        </span>
        <h1 style="color: #065f46; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">🌱 ${BRAND_NAME}</h1>
      </div>

      <div style="background-color: #ffffff; padding: 26px 22px; border-radius: 20px; border: 2px solid #e2e8f0; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">${greeting}</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.65; margin-bottom: 18px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px;">
          <strong>WALI PINTAR UPDATE ${updateData.versi}</strong> - Perbaikan Ke-${noText}: ${updateData.jenisPerbaikan} - Tanggal: ${updateData.tanggal} - Gak perlu uninstall. Gak perlu login ulang. Cukup klik tombol di email, PWA kamu langsung jadi versi terbaru otomatis.
        </p>

        <!-- TABEL DETAIL PEMBARUAN -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 18px 0; border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
          <thead>
            <tr style="background-color: #065f46; color: #ffffff;">
              <th align="left" style="padding: 11px 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #047857; width: 38%;">Keterangan</th>
              <th align="left" style="padding: 11px 14px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #047857;">Detail Pembaruan</th>
            </tr>
          </thead>
          <tbody style="font-size: 13px; color: #334155;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">🚀 Versi</td>
              <td style="padding: 10px 14px; font-weight: 800; color: #047857; border-bottom: 1px solid #e2e8f0;">${updateData.versi}</td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">📅 Tanggal</td>
              <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${updateData.tanggal}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top;">🛠️ Yang Diubah</td>
              <td style="padding: 10px 14px; line-height: 1.5; border-bottom: 1px solid #e2e8f0;">${updateData.jenisPerbaikan}</td>
            </tr>
            <tr style="background-color: #ecfdf5;">
              <td style="padding: 10px 14px; font-weight: 700; color: #065f46; border-bottom: 1px solid #a7f3d0;">🎁 Status Update</td>
              <td style="padding: 10px 14px; font-weight: 900; color: #059669; border-bottom: 1px solid #a7f3d0;">Free / Gratis untuk Pembeli Resmi</td>
            </tr>
            ${licenseKey ? `
            <tr style="background-color: #ffffff;">
              <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">🔑 Kode Lisensi</td>
              <td style="padding: 10px 14px; font-family: monospace; font-weight: 900; color: #064e3b; letter-spacing: 1px;">${licenseKey}</td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- TOMBOL UTAMA -->
        <div style="text-align: center; margin: 22px 0 16px 0;">
          <a href="${playUrl}" target="_blank" style="display: block; background-color: #10b981; color: #ffffff; padding: 16px 24px; border-radius: 14px; font-size: 16px; font-weight: 900; text-decoration: none; text-align: center; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);">
            Perbarui Game Sekarang (Gratis)
          </a>
          <span style="font-size: 11.5px; color: #64748b; margin-top: 8px; display: block; font-weight: 600;">
            Klik tombol di atas untuk membuka PWA resmi Wali Pintar dan otomatis menikmati versi terbaru.
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

// ============================================================================
// 🚨 5. MODUL ERROR LOG ("MASIH ERROR" + AUTO-RESOLVE + DIGEST 18:01 WIB)
// ============================================================================
function hasActiveErrorsFlag() {
  try {
    return PropertiesService.getScriptProperties().getProperty('HAS_ACTIVE_ERRORS') === 'true';
  } catch (e) {
    return true;
  }
}

function setActiveErrorsFlag(isActive) {
  try {
    PropertiesService.getScriptProperties().setProperty('HAS_ACTIVE_ERRORS', isActive ? 'true' : 'false');
  } catch (e) {}
}

function ensureErrorLogSheet(ss) {
  const targetSs = ss || getTargetSpreadsheet();
  return ensureSheetHeaders(targetSs, TAB_ERROR_LOG, [
    'Jam Mulai Error',
    'Terakhir Terjadi',
    'Progress',
    'Sumber',
    'Order / Ref ID',
    'Email Terkait',
    'Kejadian',
    'Nama / Pesan Error',
    'Detail',
    'Incident Key'
  ], '#991b1b');
}

function escapeHtmlBasic(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recordErrorLog(ss, info) {
  try {
    const targetSs = ss || getTargetSpreadsheet();
    const errSheet = ensureErrorLogSheet(targetSs);
    const now = new Date();
    const incidentKey = String(info && info.incidentKey ? info.incidentKey : ((info && info.source) || 'SYSTEM') + '|' + (info && info.message ? String(info.message).slice(0, 60) : 'ERR')).trim();
    const source = String((info && info.source) || 'SYSTEM').trim();
    const orderId = String((info && info.orderId) || '-').trim() || '-';
    const email = String((info && info.email) || '-').trim().toLowerCase() || '-';
    const message = String((info && info.message) || 'Unknown Error').trim().slice(0, 300);
    const detail = String((info && info.detail) || '-').trim().slice(0, 350) || '-';

    const lastRow = errSheet.getLastRow();
    let matchedRow = -1;
    let prevCount = 0;

    if (lastRow > 1) {
      const data = errSheet.getRange(2, 1, lastRow - 1, 10).getValues();
      for (let i = 0; i < data.length; i++) {
        const rowKey = String(data[i][9] || '').trim();
        if (rowKey && rowKey === incidentKey) {
          matchedRow = i + 2;
          prevCount = Number(data[i][6] || 1) || 1;
          break;
        }
      }
    }

    if (matchedRow > 1) {
      errSheet.getRange(matchedRow, 2).setValue(now).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      errSheet.getRange(matchedRow, 3)
        .setValue('MASIH ERROR')
        .setBackground('#fee2e2')
        .setFontColor('#991b1b')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
      errSheet.getRange(matchedRow, 4).setValue(source);
      if (orderId !== '-') errSheet.getRange(matchedRow, 5).setValue(orderId);
      if (email !== '-') errSheet.getRange(matchedRow, 6).setValue(email);
      errSheet.getRange(matchedRow, 7).setValue(prevCount + 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
      errSheet.getRange(matchedRow, 8).setValue(message);
      errSheet.getRange(matchedRow, 9).setValue(detail);
    } else {
      errSheet.appendRow([
        now,
        now,
        'MASIH ERROR',
        source,
        orderId,
        email,
        1,
        message,
        detail,
        incidentKey
      ]);
      const newRow = errSheet.getLastRow();
      errSheet.getRange(newRow, 1, 1, 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      errSheet.getRange(newRow, 3)
        .setBackground('#fee2e2')
        .setFontColor('#991b1b')
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
      errSheet.getRange(newRow, 7).setNumberFormat('#,##0').setHorizontalAlignment('center');
    }

    setActiveErrorsFlag(true);
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log('Warning recordErrorLog: ' + err.toString());
  }
}

function resolveErrorLog(ss, keysOrMatchers) {
  if (!hasActiveErrorsFlag()) return 0;

  try {
    const targetSs = ss || getTargetSpreadsheet();
    const errSheet = targetSs.getSheetByName(TAB_ERROR_LOG);
    if (!errSheet || errSheet.getLastRow() <= 1) {
      setActiveErrorsFlag(false);
      return 0;
    }

    const targets = (Array.isArray(keysOrMatchers) ? keysOrMatchers : [keysOrMatchers])
      .map(function(k) { return String(k || '').trim(); })
      .filter(Boolean);

    const lastRow = errSheet.getLastRow();
    const data = errSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const ttlCutoffMs = Date.now() - ERROR_LOG_TTL_HOURS * 60 * 60 * 1000;
    let deletedCount = 0;

    for (let i = data.length - 1; i >= 0; i--) {
      const rowNum = i + 2;
      const rowKey = String(data[i][9] || '').trim();
      const lastSeenDate = parseOrderOrEmailDate(data[i][1] || data[i][0]);
      const isMatched = targets.some(function(t) {
        return rowKey === t || (t.endsWith('*') && rowKey.startsWith(t.slice(0, -1)));
      });
      const isStaleNonRecurring = Boolean(lastSeenDate && lastSeenDate.getTime() < ttlCutoffMs);

      if (isMatched || isStaleNonRecurring) {
        errSheet.deleteRow(rowNum);
        deletedCount++;
      }
    }

    const remaining = Math.max(0, errSheet.getLastRow() - 1);
    setActiveErrorsFlag(remaining > 0);
    if (deletedCount > 0) {
      SpreadsheetApp.flush();
    }
    return deletedCount;
  } catch (err) {
    Logger.log('Warning resolveErrorLog: ' + err.toString());
    return 0;
  }
}

function pruneStaleErrorLogs(ss, maxAgeHours) {
  if (!hasActiveErrorsFlag()) return 0;
  try {
    const targetSs = ss || getTargetSpreadsheet();
    const errSheet = targetSs.getSheetByName(TAB_ERROR_LOG);
    if (!errSheet || errSheet.getLastRow() <= 1) {
      setActiveErrorsFlag(false);
      return 0;
    }

    const hours = typeof maxAgeHours === 'number' && maxAgeHours > 0 ? maxAgeHours : ERROR_LOG_TTL_HOURS;
    const cutoffMs = Date.now() - hours * 60 * 60 * 1000;
    const lastRow = errSheet.getLastRow();
    const data = errSheet.getRange(2, 1, lastRow - 1, 10).getValues();
    let removed = 0;

    for (let i = data.length - 1; i >= 0; i--) {
      const lastSeen = parseOrderOrEmailDate(data[i][1] || data[i][0]);
      if (lastSeen && lastSeen.getTime() < cutoffMs) {
        errSheet.deleteRow(i + 2);
        removed++;
      }
    }

    setActiveErrorsFlag(errSheet.getLastRow() > 1);
    if (removed > 0) SpreadsheetApp.flush();
    return removed;
  } catch (err) {
    Logger.log('Warning pruneStaleErrorLogs: ' + err.toString());
    return 0;
  }
}

function handleApiLogError(payload) {
  try {
    const ss = getTargetSpreadsheet();
    recordErrorLog(ss, {
      incidentKey: String(payload.incidentKey || payload.source || 'WORKER_ERROR'),
      source: String(payload.source || 'WORKER_LYNK_BRIDGE'),
      orderId: String(payload.orderId || ''),
      email: String(payload.email || ''),
      message: String(payload.message || 'Error dari Cloudflare Worker Bridge'),
      detail: String(payload.detail || '')
    });
    return createJsonResponse({ status: 'success', success: true, logged: true });
  } catch (err) {
    return createJsonResponse({ status: 'error', success: false, message: err.toString() });
  }
}

function getActiveErrorLogRows(ss) {
  const targetSs = ss || getTargetSpreadsheet();
  const errSheet = targetSs.getSheetByName(TAB_ERROR_LOG);
  if (!errSheet || errSheet.getLastRow() <= 1) {
    setActiveErrorsFlag(false);
    return [];
  }

  const lastRow = errSheet.getLastRow();
  const data = errSheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const activeRows = [];

  for (let i = 0; i < data.length; i++) {
    const progress = String(data[i][2] || 'MASIH ERROR').trim().toUpperCase();
    if (!progress || progress === 'MASIH ERROR') {
      const startDate = parseOrderOrEmailDate(data[i][0]) || new Date();
      const startTimeDisplay = Utilities.formatDate(startDate, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss') + ' WIB';
      activeRows.push({
        startTime: startTimeDisplay,
        progress: 'MASIH ERROR',
        source: String(data[i][3] || 'SYSTEM').trim(),
        count: Number(data[i][6] || 1) || 1,
        message: String(data[i][7] || 'Unknown Error').trim()
      });
    }
  }

  setActiveErrorsFlag(activeRows.length > 0);
  return activeRows;
}

function generateErrorDigestHtmlEmail(activeRows, checkedAtDisplay, sheetUrl) {
  const rowsHtml = activeRows.map(function(row, idx) {
    const bg = idx % 2 === 0 ? '#ffffff' : '#fff7f7';
    return `
      <tr style="background-color: ${bg};">
        <td style="padding: 10px 12px; font-size: 12px; color: #64748b; border-bottom: 1px solid #fecaca; text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; background-color: #fef2f2;">
          <div style="font-size: 13.5px; font-weight: 800; color: #991b1b; line-height: 1.4;">${escapeHtmlBasic(row.message)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Sumber: <strong>${escapeHtmlBasic(row.source)}</strong> &bull; Kejadian: <strong>${row.count}x</strong></div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; text-align: center; white-space: nowrap;">
          <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-family: monospace; font-size: 12px; font-weight: 800; padding: 5px 8px; border-radius: 6px; border: 1px solid #fca5a5;">
            ${escapeHtmlBasic(row.startTime)}
          </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #fecaca; text-align: center; white-space: nowrap;">
          <span style="display: inline-block; background-color: #991b1b; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.4px;">
            MASIH ERROR
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const sheetBtnHtml = sheetUrl
    ? `<div style="text-align: center; margin-top: 18px;">
         <a href="${sheetUrl}" target="_blank" style="display: inline-block; background-color: #991b1b; color: #ffffff; padding: 11px 20px; border-radius: 10px; font-size: 13px; font-weight: 800; text-decoration: none;">
           📊 Buka Tab Error_Log di Google Sheet
         </a>
       </div>`
    : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 18px; border: 1px solid #e2e8f0; color: #0f172a;">
      <div style="background-color: #991b1b; color: #ffffff; padding: 16px 20px; border-radius: 12px; margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">🚨 Monitoring Otomatis 18 Jam (Sejak 00:01 WIB)</div>
        <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900;">${activeRows.length} Error Aktif Masih Terjadi di ${BRAND_NAME}</h2>
        <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">Dicek pada: <strong>${escapeHtmlBasic(checkedAtDisplay)} WIB</strong></div>
      </div>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1.5px solid #fca5a5; border-radius: 12px; overflow: hidden;">
        <thead>
          <tr style="background-color: #7f1d1d; color: #ffffff;">
            <th align="center" style="padding: 10px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; width: 38px;">No</th>
            <th align="left" style="padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Nama / Pesan Error</th>
            <th align="center" style="padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Jam Mulai Error</th>
            <th align="center" style="padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      ${sheetBtnHtml}

      <p style="font-size: 11.5px; color: #64748b; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
        Jika seluruh masalah di atas sudah terselesaikan/tidak berulang, baris di tab <strong>Error_Log</strong> otomatis terhapus.<br>
        &copy; ${BRAND_NAME} Error Monitor
      </p>
    </div>
  `;
}

function cronCheckActiveErrorsAndNotify(forceSend) {
  const isManualForce = forceSend === true;
  try {
    const ss = getTargetSpreadsheet();
    ensureErrorLogSheet(ss);

    // Bersihkan dulu error satu-kali yang sudah lewat > 24 jam tanpa pengulangan
    pruneStaleErrorLogs(ss, ERROR_LOG_TTL_HOURS);

    const activeRows = getActiveErrorLogRows(ss);
    if (activeRows.length === 0) {
      Logger.log('✅ Error_Log bersih pada evaluasi 18:01 WIB. Tidak ada email notifikasi dikirim.');
      return { sent: false, activeCount: 0, reason: 'clean' };
    }

    const now = new Date();
    const todayKey = getJakartaDateKey(now);
    const props = PropertiesService.getScriptProperties();

    // Saat trigger otomatis (bukan manual forceSend === true), cegah kirim ganda di tanggal WIB yang sama
    // serta pastikan pengecekan sudah masuk jam >= 18 WIB (18 jam sejak 00:01 WIB)
    if (!isManualForce) {
      const hourWib = Number(Utilities.formatDate(now, 'Asia/Jakarta', 'H'));
      if (hourWib < 18) {
        Logger.log('Menunggu pukul 18:01 WIB (18 jam sejak 00:01 WIB).');
        return { sent: false, activeCount: activeRows.length, reason: 'before_1800_wib' };
      }
      const lastDigestDate = String(props.getProperty('LAST_ERROR_DIGEST_DATE') || '');
      if (lastDigestDate === todayKey) {
        Logger.log('Digest Error_Log hari ini (' + todayKey + ') sudah terkirim.');
        return { sent: false, activeCount: activeRows.length, reason: 'already_sent_today' };
      }
    }

    const devEmail = getDeveloperEmail();
    if (!devEmail) {
      Logger.log('⚠️ DEVELOPER_EMAIL belum diisi di Properti Skrip GAS (Project Settings > Script Properties). Digest tidak dikirim.');
      return { sent: false, activeCount: activeRows.length, error: 'DEVELOPER_EMAIL belum diisi di Properti Skrip GAS.' };
    }

    const checkedAtDisplay = Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    let sheetUrl = '';
    try { sheetUrl = ss.getUrl(); } catch (e) {}

    const subject = '🚨 [' + BRAND_NAME + '] ' + activeRows.length + ' Error Aktif Masih Terjadi (' + Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM HH:mm') + ' WIB)';
    const htmlBody = generateErrorDigestHtmlEmail(activeRows, checkedAtDisplay, sheetUrl);
    const res = sendBrevoHtmlDirect(devEmail, 'Developer ' + BRAND_NAME, subject, htmlBody);

    if (res.success) {
      if (!isManualForce) {
        props.setProperty('LAST_ERROR_DIGEST_DATE', todayKey);
      }
      Logger.log('🚨 Digest Error_Log (' + activeRows.length + ' error aktif) terkirim ke ' + devEmail);
      return { sent: true, activeCount: activeRows.length, email: devEmail };
    }

    Logger.log('⚠️ Gagal kirim digest Error_Log via Brevo: ' + res.error);
    return { sent: false, activeCount: activeRows.length, error: res.error };
  } catch (err) {
    Logger.log('Error cronCheckActiveErrorsAndNotify: ' + err.toString());
    return { sent: false, error: err.toString() };
  }
}

function setupErrorMonitorTrigger(silent) {
  const existing = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'cronCheckActiveErrorsAndNotify') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }

  // Jalankan harian pukul 18:05–18:35 WIB (tepat setelah 18 jam sejak pukul 00:01 WIB)
  ScriptApp.newTrigger('cronCheckActiveErrorsAndNotify')
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .nearMinute(20)
    .inTimezone('Asia/Jakarta')
    .create();

  if (!silent) {
    const devEmail = getDeveloperEmail();
    SpreadsheetApp.getUi().alert(
      '⏰ Task Otomatis Error_Log Aktif!',
      'Sistem akan otomatis memeriksa tab "Error_Log" setiap hari sekitar pukul 18:05–18:35 WIB (18 jam sejak 00:01 WIB).\n\n' +
      (devEmail
        ? 'Jika masih ada error "MASIH ERROR", daftar tabel rapi akan dikirim via Brevo ke: ' + devEmail + '.'
        : '⚠️ Catatan: Properti `DEVELOPER_EMAIL` belum diisi! Silakan isi `DEVELOPER_EMAIL` di Extensions > Apps Script > Project Settings (⚙️) > Properti Skrip.') +
      '\nJika Error_Log bersih, tidak ada email yang dikirim.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function menuSetupErrorMonitorTrigger() {
  setupErrorMonitorTrigger(false);
}

function menuRunErrorDigestManual() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  ensureErrorLogSheet(ss);
  const devEmail = getDeveloperEmail();
  if (!devEmail) {
    ui.alert(
      '⚠️ DEVELOPER_EMAIL Belum Diisi',
      'Silakan tambahkan properti `DEVELOPER_EMAIL` (isi dengan Gmail Anda) di:\n' +
      'Extensions > Apps Script > Project Settings (⚙️) > Properti Skrip.\n\n' +
      'Dengan begitu Anda tidak perlu edit kode manual.',
      ui.ButtonSet.OK
    );
    return;
  }

  const activeRows = getActiveErrorLogRows(ss);
  if (activeRows.length === 0) {
    ui.alert('✅ Tidak Ada Error Aktif', 'Tab "Error_Log" bersih (0 baris MASIH ERROR). Tidak ada email yang perlu dikirim ke ' + devEmail + '.', ui.ButtonSet.OK);
    return;
  }

  const res = cronCheckActiveErrorsAndNotify(true);
  if (res.sent) {
    ui.alert('🚨 Digest Error Terkirim!', activeRows.length + ' error aktif telah dikirim ke ' + res.email + ' dalam format tabel HTML via Brevo.', ui.ButtonSet.OK);
  } else {
    ui.alert('❌ Gagal Mengirim Digest Error', 'Penyebab: ' + (res.error || res.reason || 'Tidak diketahui'), ui.ButtonSet.OK);
  }
}

function menuClearErrorLog() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  const errSheet = ensureErrorLogSheet(ss);
  const lastRow = errSheet.getLastRow();
  if (lastRow <= 1) {
    setActiveErrorsFlag(false);
    ui.alert('ℹ️ Info', 'Tab "Error_Log" sudah kosong.', ui.ButtonSet.OK);
    return;
  }
  errSheet.deleteRows(2, lastRow - 1);
  setActiveErrorsFlag(false);
  ui.alert('✅ Error_Log Dibersihkan', (lastRow - 1) + ' baris error telah dihapus manual.', ui.ButtonSet.OK);
}

function maskSecretValue(val) {
  const s = String(val || '').trim();
  if (!s) return '❌ Belum diisi';
  if (s.length <= 8) return '✅ Terpasang (****)';
  return '✅ Terpasang (' + s.slice(0, 4) + '****' + s.slice(-4) + ')';
}

function menuCheckScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const ghOwner = String(props.getProperty('GITHUB_OWNER') || '').trim();
  const ghRepo = String(props.getProperty('GITHUB_REPO') || '').trim();
  const ghBranch = String(props.getProperty('GITHUB_BRANCH') || '').trim();
  const ghPath = String(props.getProperty('GITHUB_FILE_PATH') || '').trim();

  const summary =
    '📋 STATUS 6 PROPERTI SKRIP WAJIB (Project Settings ⚙️ > Script Properties)\n\n' +
    '1. GITHUB_TOKEN: ' + maskSecretValue(props.getProperty('GITHUB_TOKEN')) + '\n' +
    '2. GITHUB_OWNER: ' + (ghOwner ? '✅ ' + ghOwner : '❌ Belum diisi') + '\n' +
    '3. GITHUB_REPO: ' + (ghRepo ? '✅ ' + ghRepo : '❌ Belum diisi') + '\n' +
    '4. GITHUB_BRANCH: ' + (ghBranch ? '✅ ' + ghBranch : '❌ Belum diisi') + '\n' +
    '5. GITHUB_FILE_PATH: ' + (ghPath ? '✅ ' + ghPath : '❌ Belum diisi') + '\n' +
    '6. BREVO_API_KEY: ' + maskSecretValue(props.getProperty('BREVO_API_KEY')) + '\n\n' +
    '💡 Token & API Key tidak pernah ditulis di kode atau log. Cukup ubah di Script Properties bila diganti.';

  SpreadsheetApp.getUi().alert('⚙️ Status Properti Skrip GAS', summary, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuSimulateErrorLogAndNotify() {
  const ui = SpreadsheetApp.getUi();
  const ss = getTargetSpreadsheet();
  ensureErrorLogSheet(ss);

  const devEmail = getDeveloperEmail();
  const brevoKey = getScriptProp('BREVO_API_KEY', BREVO_API_KEY);

  if (!devEmail) {
    ui.alert(
      '⚠️ DEVELOPER_EMAIL Belum Diisi',
      'Tambahkan properti `DEVELOPER_EMAIL` (isi Gmail Anda) di:\n' +
      'Extensions > Apps Script > Project Settings (⚙️) > Properti Skrip.',
      ui.ButtonSet.OK
    );
    return;
  }

  if (!brevoKey) {
    ui.alert(
      '⚠️ BREVO_API_KEY Belum Diisi',
      'Tambahkan properti `BREVO_API_KEY` di Project Settings (⚙️) > Properti Skrip agar test email dapat dikirim.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 1. Masukkan 2 baris simulasi MASIH ERROR ke tab Error_Log
  recordErrorLog(ss, {
    incidentKey: 'SIMULASI_LYNK_TEST',
    source: 'LYNK_WEBHOOK',
    orderId: 'TEST-SIM-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HHmmss'),
    email: 'simulasi.pembeli@example.com',
    message: '[SIMULASI TEST] Contoh Error Webhook Lynk.id (Timeout / Upstream GAS)',
    detail: 'Simulasi manual dari menu admin untuk verifikasi tabel email Error_Log.'
  });

  recordErrorLog(ss, {
    incidentKey: 'SIMULASI_BREVO_TEST',
    source: 'BREVO_EMAIL',
    orderId: 'TEST-EMAIL-01',
    email: 'simulasi.brevo@example.com',
    message: '[SIMULASI TEST] Contoh Error Gagal Kirim Email Lisensi Brevo',
    detail: 'Simulasi manual untuk menguji highlight Pesan Error & Jam Mulai Error.'
  });

  // 2. Jalankan kirim digest tabel HTML ke Gmail developer via Brevo sekarang
  const res = cronCheckActiveErrorsAndNotify(true);

  if (!res.sent) {
    ui.alert(
      '❌ Simulasi Tercatat di Error_Log, Tapi Gagal Kirim Email',
      'Baris simulasi sudah masuk ke tab "Error_Log", namun pengiriman ke ' + devEmail + ' gagal:\n' +
      (res.error || res.reason || 'Error tidak diketahui') + '\n\n' +
      'Cek kembali BREVO_API_KEY & BREVO_SENDER_EMAIL di Properti Skrip GAS.',
      ui.ButtonSet.OK
    );
    return;
  }

  // 3. Tawarkan langsung uji Auto-Hapus (simulasi error sembuh)
  const choice = ui.alert(
    '✅ Test Simulasi Berhasil Terkirim!',
    '• 2 contoh error [SIMULASI TEST] (status: MASIH ERROR) telah dicatat di tab "Error_Log".\n' +
    '• Tabel HTML error aktif berhasil dikirim via Brevo ke: ' + res.email + '\n' +
    '  (Pengirim: ' + getBrevoSenderName() + ' <' + getBrevoSenderEmail() + '>)\n\n' +
    'Silakan cek kotak masuk / folder spam Gmail Anda sekarang.\n\n' +
    'Klik YES untuk sekalian menguji fitur AUTO-HAPUS (simulasi error sembuh sekarang),\n' +
    'atau klik NO jika ingin membiarkan 2 baris simulasi tersebut tampil dulu di tab "Error_Log".',
    ui.ButtonSet.YES_NO
  );

  if (choice === ui.Button.YES) {
    const resolved = resolveErrorLog(ss, ['SIMULASI_LYNK_TEST', 'SIMULASI_BREVO_TEST']);
    ui.alert(
      '✅ Auto-Hapus Berhasil Diuji!',
      resolved + ' baris simulasi telah otomatis terhapus dari tab "Error_Log" karena error dianggap sudah terselesaikan.',
      ui.ButtonSet.OK
    );
  }
}

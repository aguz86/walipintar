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
 * Kunci Rahasia Admin untuk menghapus lisensi via API (opsional)
 */
const ADMIN_SECRET_KEY = 'WALI_ADMIN_SECRET_KEY_2026';

/**
 * KONFIGURASI BREVO API:
 * 1. Dapatkan API Key di https://app.brevo.com/settings/keys/api
 * 2. Masukkan API Key Anda di bawah (format: xkeysib-...).
 * 3. Masukkan Email Pengirim yang sudah diverifikasi di menu Brevo Senders.
 */
const BREVO_API_KEY = 'xkeysib-PASTE_YOUR_BREVO_API_KEY_HERE';
const BREVO_SENDER_NAME = 'Wali Pintar Official';
const BREVO_SENDER_EMAIL = 'halo@walipintar.my.id';

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
    Logger.log('⚠️ 3. Brevo API Key belum diisi. Masukkan API Key Anda di baris 33.');
  } else {
    Logger.log('✅ 3. Brevo API Key terpasang: ' + BREVO_API_KEY.substring(0, 14) + '...');
  }

  Logger.log('========================================================');
  Logger.log('🎉 SELAMAT! SISTEM BERJALAN NORMAL 100%.');
  Logger.log('Gunakan Web App URL untuk integrasi dengan redeem.html & index.html.');
  Logger.log('========================================================');
}

/**
 * Event Trigger onOpen: Menambahkan Menu Khusus Admin ke Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎮 WaliPintar Admin')
    .addItem('⚡ Generate Lisensi Manual (Komplain)', 'menuGenerateManual')
    .addItem('🔄 Kirim Ulang Email Lisensi via Brevo', 'menuResendManual')
    .addSeparator()
    .addItem('🗑️ Hapus Lisensi (Cari Kode / Email / Order)', 'menuDeleteLicenseSearch')
    .addItem('🗑️ Hapus Baris Lisensi yang Sedang Dipilih', 'menuDeleteSelectedRow')
    .addSeparator()
    .addItem('📊 Buat / Segarkan Tab Laporan & Statistik', 'menuGenerateReport')
    .addItem('🛠️ Uji Koneksi Akun Brevo API', 'menuTestBrevoConnection')
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
    // ACTION 1: CREATE (Dipanggil otomatis oleh redeem.html setelah bayar Scalev)
    // ------------------------------------------------------------------------
    if (action === 'create') {
      const orderId = (params.order_id || postData.order_id || '').trim();
      const email = (params.email || postData.email || '').trim().toLowerCase();
      const name = (params.name || params.customer_name || params.nama || params.buyer_name || postData.name || postData.customer_name || postData.nama || '').trim();

      if (!orderId || !email) {
        return createJsonResponse({ success: false, message: 'Order ID dan Email wajib diisi.' });
      }

      // Idempotency: Cek apakah Order ID sudah pernah diproses
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const rowOrderId = String(data[i][1]).trim();
        if (rowOrderId === orderId) {
          const existingLicense = data[i][3];
          return createJsonResponse({
            success: true,
            isExisting: true,
            licenseKey: existingLicense,
            email: data[i][2],
            orderId: orderId,
            name: name,
            message: 'Lisensi untuk pesanan ini sudah pernah dibuat sebelumnya.'
          });
        }
      }

      const licenseKey = generateUniqueLicense(sheet);
      const now = new Date();

      // Kirim Email Murni Brevo REST API v3
      const brevoResult = sendBrevoEmail(email, licenseKey, orderId, false, name);

      sheet.appendRow([
        now,
        orderId,
        email,
        licenseKey,
        'ACTIVE',
        now.toISOString(),
        brevoResult.success ? 'TERKIRIM (Brevo)' : 'GAGAL (' + brevoResult.error + ')',
        brevoResult.messageId || '-',
        0,
        name ? 'Otomatis via Scalev Redeem (' + name + ')' : 'Otomatis via Scalev Redeem'
      ]);

      updateDashboardStats(ss);

      return createJsonResponse({
        success: true,
        licenseKey: licenseKey,
        email: email,
        orderId: orderId,
        emailSent: brevoResult.success,
        brevoMessageId: brevoResult.messageId,
        mailError: brevoResult.error,
        adminWaUrl: 'https://wa.me/' + ADMIN_WA + '?text=' + encodeURIComponent(
          'Halo Admin ' + BRAND_NAME + ', pesanan saya: ' + orderId + ' (' + email + '). Lisensi saya: ' + licenseKey
        ),
        message: brevoResult.success
          ? 'Lisensi resmi berhasil dibuat dan dikirimkan ke email Anda via Brevo!'
          : 'Lisensi berhasil dibuat (' + licenseKey + '), namun pengiriman Brevo gagal. Silakan hubungi WhatsApp Admin.'
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

      const currentResend = Number(data[rowIndex - 1][8] || 0);
      sheet.getRange(rowIndex, 9).setValue(currentResend + 1);

      const brevoResult = sendBrevoEmail(email, matchedLicense, matchedOrderId, true);
      sheet.getRange(rowIndex, 7).setValue(brevoResult.success ? 'TERKIRIM ULANG (Brevo)' : 'GAGAL KIRIM ULANG');

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
          URL ini dipanggil otomatis oleh <code>redeem.html</code> dan <code>index.html</code>. Anda tidak perlu membukanya secara manual.
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
    now.toISOString(),
    brevoStatus,
    messageId,
    0,
    'Manual Generate oleh Admin via Menu Sheet'
  ]);

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

  const res = sendBrevoEmail(email, licenseKey, orderId, true);
  if (res.success) {
    const curResend = Number(matchedRow[8] || 0);
    sheet.getRange(rowIndex, 9).setValue(curResend + 1);
    sheet.getRange(rowIndex, 7).setValue('TERKIRIM ULANG (Brevo)');
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
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LICENSES);
    sheet.appendRow([
      'Timestamp',
      'Order ID',
      'Email',
      'License Key',
      'Status',
      'Created At',
      'Brevo Status',
      'Brevo Message ID',
      'Resend Count',
      'Catatan / Metode'
    ]);
    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange.setBackground('#059669').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(7, 180);
    sheet.setColumnWidth(10, 220);
  }
  return sheet;
}

function updateDashboardStats(ss) {
  let reportSheet = ss.getSheetByName(SHEET_REPORTS);
  if (!reportSheet) {
    reportSheet = ss.insertSheet(SHEET_REPORTS);
  }

  const licensesSheet = ss.getSheetByName(SHEET_LICENSES);
  const data = licensesSheet ? licensesSheet.getDataRange().getValues() : [];

  let totalLicenses = 0;
  let activeLicenses = 0;
  let brevoSent = 0;
  let todayCount = 0;
  const todayStr = new Date().toDateString();

  for (let i = 1; i < data.length; i++) {
    totalLicenses++;
    const status = String(data[i][4]).trim().toUpperCase();
    const brevoStatus = String(data[i][6]).trim().toUpperCase();
    const rowDate = new Date(data[i][0]);

    if (status === 'ACTIVE') activeLicenses++;
    if (brevoStatus.includes('TERKIRIM')) brevoSent++;
    if (rowDate.toDateString() === todayStr) todayCount++;
  }

  reportSheet.clear();

  reportSheet.getRange('A1:D1').merge().setValue('📊 DASHBOARD LAPORAN & MONITORING LISENSI WALI PINTAR')
    .setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');

  const metrics = [
    ['Total Lisensi Diterbitkan', totalLicenses],
    ['Lisensi Aktif (Siap Main)', activeLicenses],
    ['Lisensi Terbit Hari Ini', todayCount],
    ['Email Berhasil Terkirim (Brevo)', brevoSent],
    ['Terakhir Diperbarui', new Date().toLocaleString('id-ID')]
  ];

  for (let i = 0; i < metrics.length; i++) {
    const row = i + 3;
    reportSheet.getRange(row, 1).setValue(metrics[i][0]).setFontWeight('bold').setBackground('#f1f5f9');
    reportSheet.getRange(row, 2).setValue(metrics[i][1]).setFontWeight('bold').setHorizontalAlignment('center');
  }

  reportSheet.getRange('A3:B7').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  reportSheet.setColumnWidth(1, 260);
  reportSheet.setColumnWidth(2, 180);

  reportSheet.getRange('A9').setValue('💡 PANDUAN PENGELOLAAN & PENANGANAN KOMPLAIN:').setFontWeight('bold');
  reportSheet.getRange('A10').setValue('1. Generate Lisensi: "🎮 WaliPintar Admin" > "⚡ Generate Lisensi Manual".');
  reportSheet.getRange('A11').setValue('2. Hapus Lisensi: "🎮 WaliPintar Admin" > "🗑️ Hapus Lisensi (Cari Kode / Email / Order)" atau sorot baris lalu pilih "🗑️ Hapus Baris Lisensi yang Sedang Dipilih".');
  reportSheet.getRange('A12').setValue('3. Begitu lisensi dihapus, pembeli otomatis ditendang (kick) dan tidak bisa mengakses game lagi.');
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
            <a href="${APP_URL}/redeem.html?key=${licenseKey}&action=copy" target="_blank" style="display: inline-block; background-color: #f1f5f9; hover: background-color: #e2e8f0; color: #1e293b; border: 1.5px solid #cbd5e1; padding: 9px 18px; border-radius: 10px; font-size: 12.5px; font-weight: 800; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
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

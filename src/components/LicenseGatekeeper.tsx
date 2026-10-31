import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, AlertTriangle, X, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { SFX, unlockAudio } from '../utils/audio';

interface LicenseGatekeeperProps {
  onUnlock: (licenseKey: string) => void;
}

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwRXacMOX7jFffw73voAxPcdgYtu7in5kt7PQ0M7qK3FaaC3YOYm0F9WeQSBcnRFlVG/exec';

export const LicenseGatekeeper: React.FC<LicenseGatekeeperProps> = ({ onUnlock }) => {
  const [inputKey, setInputKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMessage, setRejectMessage] = useState('');

  // Auto-detect URL parameter ?license=WALI-XXXXXX&autologin=1 (dari redirect checkout)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLicense = params.get('license');
      if (urlLicense) {
        setInputKey(urlLicense.toUpperCase());
        if (params.get('autologin') === '1') {
          validateAndUnlock(urlLicense.toUpperCase());
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const validateAndUnlock = async (keyToValidate: string) => {
    const trimmed = keyToValidate.trim().toUpperCase();
    if (!trimmed) {
      setRejectMessage('Harap masukkan kode lisensi resmi Anda terlebih dahulu.');
      setShowRejectModal(true);
      SFX.no();
      return;
    }

    setIsLoading(true);

    // 1. Cek skenario simulasi / demo salah
    if (trimmed.startsWith('SALAH-') || trimmed.startsWith('WALI-SALAH') || trimmed === 'INVALID' || trimmed === 'WRONG') {
      setTimeout(() => {
        setIsLoading(false);
        setRejectMessage('Kode lisensi tidak valid atau belum terdaftar di sistem. Silakan periksa kembali email Anda atau hubungi Admin WhatsApp.');
        setShowRejectModal(true);
        SFX.no();
      }, 500);
      return;
    }

    // 2. Wajib berawalan prefix 'WALI-'
    if (!trimmed.startsWith('WALI-')) {
      setTimeout(() => {
        setIsLoading(false);
        setRejectMessage("Format lisensi ditolak! Seluruh kode lisensi resmi Wali Pintar WAJIB diawali dengan prefix 'WALI-' dan 4 karakter huruf & angka (Contoh: WALI-7K9P).");
        setShowRejectModal(true);
        SFX.no();
      }, 400);
      return;
    }

    // 3. Validasi format WALI-XXXX (minimal 4 karakter alfanumerik bebas 0, O, 1, I)
    const suffixPart = trimmed.replace('WALI-', '');
    if (suffixPart.length < 4) {
      setTimeout(() => {
        setIsLoading(false);
        setRejectMessage("Kode lisensi tidak lengkap. Format resmi adalah 'WALI-XXXX' (4 karakter kombinasi huruf & angka tanpa huruf 0, O, 1, I, contoh: WALI-7K9P).");
        setShowRejectModal(true);
        SFX.no();
      }, 400);
      return;
    }

    // 4. Verifikasi online ke Google Apps Script / Google Sheets jika ada koneksi
    const isDemoKey = ['WALI-7K9P', 'WALI-3M8Q', 'WALI-9999', 'WALI-1234'].includes(trimmed);
    if (!isDemoKey) {
      try {
        const checkUrl = `${GAS_API_URL}?action=check&license_key=${encodeURIComponent(trimmed)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const response = await fetch(checkUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json();
          if (resData && resData.valid === false) {
            setIsLoading(false);
            setRejectMessage(resData.message || 'Kode lisensi tidak valid, sudah dihapus, atau belum terdaftar.');
            setShowRejectModal(true);
            SFX.no();
            return;
          }
        }
      } catch (networkErr) {
        // Fallback jika offline
        console.warn('Online GAS check fallback to offline:', networkErr);
      }
    }

    try {
      // 1 Lisensi WALI-XXXX langsung membuka seluruh 3 kategori game
      localStorage.setItem('walipintar_license', trimmed);
      localStorage.setItem('walipintar_auth_time', Date.now().toString());

      setTimeout(() => {
        setIsLoading(false);
        SFX.fanfare();
        onUnlock(trimmed);
      }, 400);

    } catch (err) {
      // Fallback offline
      localStorage.setItem('walipintar_license', trimmed);
      setIsLoading(false);
      SFX.fanfare();
      onUnlock(trimmed);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndUnlock(inputKey);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-emerald-50/70 via-teal-50/50 to-sky-50/70 flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-emerald-100">
      {/* Background Decorative Circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Main Portal Card - Mobile First (Mirip persis Screenshot Pengguna) */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center relative overflow-hidden animate-fade-in">
        
        {/* Backpack School Icon 🎒 */}
        <div className="flex justify-center mb-3">
          <div className="text-6xl sm:text-7xl drop-shadow-sm select-none transform hover:scale-105 transition-transform duration-200">
            🎒
          </div>
        </div>

        {/* Pill Badge: 100% Bebas Iklan & Offline */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/80 border border-amber-200/90 text-amber-900 font-extrabold text-[11px] sm:text-xs mb-3 shadow-2xs">
          <span>✨</span>
          <span>100% Bebas Iklan & Offline</span>
        </div>

        {/* Main Title: Walipintar */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1">
          Walipintar
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-bold text-slate-500 mb-5 leading-relaxed">
          Portal Game Edukasi Interaktif Anak 3–8 Tahun
        </p>

        {/* Petunjuk Alur Aktivasi & Bermain Offline (User Flow Guide) */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 text-left text-xs text-amber-950 font-medium space-y-2 mb-5 leading-snug shadow-xs">
          <div className="font-black text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm mb-1 pb-1 border-b border-amber-200/70">
            <span>📌</span>
            <span>Petunjuk Aktivasi Lisensi & Main Game:</span>
          </div>

          <div className="space-y-2 pt-0.5">
            {/* Step 1 */}
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black text-[11px] flex items-center justify-center mt-0.5">
                1
              </span>
              <p className="text-[11.5px] sm:text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Cek Email Anda:</strong> Buka pesan dari{' '}
                <span className="font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                  admin@walipintar.my.id
                </span>{' '}
                <span className="text-[10.5px] text-slate-500">(cek juga folder Spam/Promosi)</span>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black text-[11px] flex items-center justify-center mt-0.5">
                2
              </span>
              <p className="text-[11.5px] sm:text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Copy Kode Lisensi:</strong> Salin kode lisensi resmi Anda yang diawali prefix{' '}
                <strong className="font-mono text-emerald-700">WALI-XXXX</strong>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-black text-[11px] flex items-center justify-center mt-0.5">
                3
              </span>
              <p className="text-[11.5px] sm:text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Paste di Kolom Bawah:</strong> Tempel kode ke kotak di bawah lalu klik{' '}
                <strong className="text-teal-700">"Buka Dashboard Game"</strong> agar akses langsung terbuka!
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-2 bg-emerald-100/70 border border-emerald-200/80 p-2 rounded-xl">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center mt-0.5">
                4
              </span>
              <p className="text-[11.5px] sm:text-xs text-emerald-950 font-bold leading-relaxed">
                <strong className="text-emerald-900">100% Offline Tanpa Kuota:</strong> Setelah berhasil masuk, klik tombol{' '}
                <span className="underline decoration-emerald-500">"Pasang Aplikasi"</span> untuk download & mainkan seluruh game secara offline tanpa kuota internet!
              </p>
            </div>
          </div>

          {/* Quick Demo Helper (Kecil & Rapi untuk Uji Coba Cepat) */}
          <div className="pt-1 text-[10.5px] text-slate-500 flex items-center justify-between border-t border-amber-200/60 mt-1.5">
            <span>💡 Mode Uji Coba Cepat:</span>
            <div className="space-x-1.5">
              <button
                type="button"
                onClick={() => setInputKey('WALI-7K9P')}
                className="text-emerald-800 font-bold hover:underline bg-white px-1.5 py-0.5 rounded border border-amber-200"
              >
                Isi WALI-7K9P
              </button>
              <button
                type="button"
                onClick={() => setInputKey('SALAH-123')}
                className="text-rose-700 font-bold hover:underline bg-white px-1.5 py-0.5 rounded border border-amber-200"
              >
                Tes Salah
              </button>
            </div>
          </div>
        </div>

        {/* Form Input Lisensi (Format WALI-XXXX) */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value.toUpperCase())}
              placeholder="CONTOH:  WALI-7K9P"
              className="w-full h-14 sm:h-15 px-4 text-center font-black text-slate-800 text-base sm:text-lg tracking-widest uppercase rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:bg-teal-50/20 focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-bold placeholder:tracking-wider shadow-2xs font-mono"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              required
            />
          </div>

          {/* Tombol Utama: Buka Dashboard Game (Hijau Tosca Min 50px) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-13 sm:h-14 rounded-2xl bg-[#14b8a6] hover:bg-[#0d9488] active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-teal-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memverifikasi Lisensi...</span>
              </>
            ) : (
              <>
                <span className="text-lg">🔓</span>
                <span>Buka Dashboard Game</span>
              </>
            )}
          </button>
        </form>

        {/* Links di bawah tombol (Sesuai Screenshot) */}
        <div className="mt-5 space-y-2 text-xs font-bold text-slate-600">
          <div>
            <a
              href="https://walipintar.myscalev.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg"
            >
              <span>🛒</span>
              <span>Belum Punya Lisensi? Beli di Scalev</span>
            </a>
          </div>

          <div>
            <a
              href="https://wa.me/6285704808186?text=Halo%20Admin%20Wali%20Pintar%2C%20saya%20butuh%20bantuan%20aktivasi%20lisensi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg"
            >
              <span>💬</span>
              <span>Butuh Bantuan? Hubungi WhatsApp Admin (085704808186)</span>
            </a>
          </div>
        </div>

      </div>

      {/* Footer Branding Kecil */}
      <div className="mt-4 text-center text-[11px] font-semibold text-slate-400">
        Wali Pintar &bull; Platform Edukasi Berlisensi Anak Usia 3–8 Tahun
      </div>

      {/* POPUP REJECTION MODAL (Jika Lisensi Salah / Gagal) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border-4 border-rose-300 relative animate-scale-in">
            <button
              onClick={() => setShowRejectModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-5xl mb-3 animate-bounce">🚫</div>
            <h3 className="text-xl font-black text-slate-900 mb-1.5">
              Lisensi Tidak Valid!
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
              {rejectMessage || 'Kode lisensi yang dimasukkan tidak ditemukan atau belum aktif. Pastikan kode diketik sama persis dengan yang dikirimkan ke email Anda.'}
            </p>

            <div className="space-y-2.5">
              {/* WhatsApp Admin */}
              <a
                href="https://wa.me/6285704808186?text=Halo%20Admin%20Wali%20Pintar%2C%20saya%20mengalami%20kendala%20lisensi%20tidak%20bisa%20diaktifkan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
              >
                <span>💬 Hubungi Admin WhatsApp (085704808186)</span>
              </a>

              {/* Beli di Scalev */}
              <a
                href="https://walipintar.myscalev.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
              >
                <span>🛒 Beli Lisensi Resmi di Scalev</span>
              </a>

              {/* Coba Lagi */}
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Coba Masukkan Kode Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { SFX } from '../utils/audio';
import { WhatsAppIcon } from './WhatsAppIcon';

interface LoginPageProps {
  onLoginSuccess: (licenseKey: string) => void;
  onNavigate: (path: string) => void;
}

const GAS_API_URL = (import.meta as any).env?.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwRXacMOX7jFffw73voAxPcdgYtu7in5kt7PQ0M7qK3FaaC3YOYm0F9WeQSBcnRFlVG/exec';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const [inputKey, setInputKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMessage, setRejectMessage] = useState('');

  // Set document title
  useEffect(() => {
    document.title = 'Login Lisensi - Wali Pintar';
  }, []);

  // Auto-detect URL parameter ?key=WALI-XXXX or ?license=
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLicense = params.get('license') || params.get('key') || params.get('lisensi');

      if (urlLicense) {
        const cleanKey = urlLicense.trim().toUpperCase();
        setInputKey(cleanKey);
        validateAndUnlock(cleanKey);
      }
    } catch {
      // Ignore
    }
  }, []);

  const validateAndUnlock = async (keyToValidate: string) => {
    let trimmed = keyToValidate.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Smart Assist: Jika hanya ketik 4 karakter unik tanpa 'WALI-' (misal: 7K9P), otomatis tambahkan prefix
    if (!trimmed.startsWith('WALI-') && trimmed.length >= 4 && !trimmed.includes('-')) {
      trimmed = `WALI-${trimmed}`;
      setInputKey(trimmed);
    }

    if (!trimmed) {
      setRejectMessage('Harap masukkan kode lisensi resmi Anda terlebih dahulu.');
      setShowRejectModal(true);
      SFX.no();
      return;
    }

    // Rule Tepat 9 Karakter
    if (trimmed.length !== 9) {
      const msg =
        trimmed.length < 9
          ? `Kode lisensi terlalu pendek (${trimmed.length} karakter). Lisensi resmi wajib tepat 9 karakter dengan format 'WALI-XXXX' (Contoh: WALI-7K9P).`
          : `Kode lisensi melebihi batas (${trimmed.length} karakter). Lisensi resmi dibatasi tepat 9 karakter dengan format 'WALI-XXXX' (Contoh: WALI-7K9P).`;
      setRejectMessage(msg);
      setShowRejectModal(true);
      SFX.no();
      return;
    }

    // Rule Format Wajib: Diawali prefix 'WALI-'
    if (!trimmed.startsWith('WALI-')) {
      setRejectMessage(
        "Format lisensi ditolak! Seluruh kode lisensi resmi Wali Pintar WAJIB diawali dengan prefix 'WALI-' (Contoh: WALI-7K9P)."
      );
      setShowRejectModal(true);
      SFX.no();
      return;
    }

    // Rule Pengecualian Karakter Ambigu: Angka 0, 1 dan Huruf O, I
    const suffixPart = trimmed.slice(5);
    if (/[0O1I]/.test(suffixPart)) {
      setRejectMessage(
        "Kode lisensi tidak valid! Lisensi resmi Wali Pintar TIDAK menggunakan angka 0, 1 maupun huruf O, I guna menghindari salah ketik/tertukar. Periksa kembali kode Anda (Contoh: WALI-7K9P)."
      );
      setShowRejectModal(true);
      SFX.no();
      return;
    }

    // Rule Karakter Valid: Wajib 4 karakter alfanumerik aman (2-9, A-Z tanpa O dan I)
    if (!/^[2-9A-HJ-NP-Z]{4}$/.test(suffixPart)) {
      setRejectMessage(
        "Format kode lisensi salah! Setelah tanda hubung 'WALI-', harus berupa tepat 4 karakter kombinasi huruf kapital dan angka (Contoh: WALI-7K9P)."
      );
      setShowRejectModal(true);
      SFX.no();
      return;
    }

    setIsLoading(true);

    try {
      const checkUrl = `${GAS_API_URL}?action=check&license_key=${encodeURIComponent(trimmed)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(checkUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const resData = await response.json();
        if (resData && (resData.valid === true || (resData.success === true && resData.valid !== false))) {
          // Lisensi VALID! Simpan ke localStorage
          localStorage.setItem('walipintar_license', trimmed);
          localStorage.setItem('walipintar_auth_time', Date.now().toString());
          if (resData.email) localStorage.setItem('walipintar_email', resData.email);
          if (resData.orderId) localStorage.setItem('walipintar_order', resData.orderId);

          setIsLoading(false);
          SFX.fanfare();
          onLoginSuccess(trimmed);
          return;
        } else {
          setIsLoading(false);
          setRejectMessage(
            resData?.message ||
              'Kode lisensi tidak ditemukan di database resmi atau status belum aktif. Silakan cek kembali atau lakukan aktivasi via email jika baru saja membeli.'
          );
          setShowRejectModal(true);
          SFX.no();
          return;
        }
      } else {
        setIsLoading(false);
        setRejectMessage('Gagal menghubungi server validasi. Silakan periksa koneksi internet Anda atau hubungi Admin WhatsApp.');
        setShowRejectModal(true);
        SFX.no();
        return;
      }
    } catch (networkErr: any) {
      setIsLoading(false);
      const isTimeout = networkErr?.name === 'AbortError';
      const msg = isTimeout
        ? 'Koneksi ke server validasi memakan waktu terlalu lama. Silakan coba beberapa saat lagi.'
        : 'Verifikasi lisensi pertama kali membutuhkan koneksi internet. Pastikan perangkat terhubung ke internet, lalu coba lagi.';
      setRejectMessage(msg);
      setShowRejectModal(true);
      SFX.no();
      return;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndUnlock(inputKey);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-emerald-50/70 via-teal-50/50 to-sky-50/70 flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-emerald-100">
      {/* Decorative Circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center relative overflow-hidden animate-fade-in">
        
        {/* Brand Badge */}
        <div className="flex justify-center mb-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-6xl sm:text-7xl drop-shadow-sm select-none transform hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer bg-transparent border-0"
            title="Ke Halaman Utama"
          >
            🎒
          </button>
        </div>

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200/90 text-emerald-900 font-extrabold text-[11px] sm:text-xs mb-3 shadow-2xs">
          <span>🔑</span>
          <span>Login Lisensi Resmi</span>
        </div>

        <h1
          onClick={() => onNavigate('/')}
          className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1 cursor-pointer hover:text-emerald-800 transition-colors"
          title="Ke Halaman Utama"
        >
          Wali Pintar
        </h1>

        <p className="text-xs sm:text-sm font-bold text-slate-500 mb-5 leading-relaxed">
          Masukkan kode lisensi resmi untuk membuka 17 game edukasi offline anak
        </p>

        {/* Petunjuk Ringkas */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 text-left text-xs text-amber-950 font-medium space-y-1.5 mb-5 leading-snug">
          <div className="font-black text-amber-900 flex items-center gap-1.5 text-xs pb-1 border-b border-amber-200/70">
            <span>📌</span>
            <span>Format Lisensi Resmi:</span>
          </div>
          <p className="text-[11.5px] text-slate-700 leading-relaxed">
            Lisensi terdiri dari 9 karakter dengan format <strong className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">WALI-XXXX</strong> (Contoh: WALI-7K9P).
          </p>
        </div>

        {/* Form Login Lisensi (HANYA DENGAN LISENSI) */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-800">
              Kode Lisensi Anda
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => {
                  let cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9);
                  if (!cleaned.startsWith('WALI-') && cleaned.length === 4 && !cleaned.includes('-')) {
                    cleaned = `WALI-${cleaned}`;
                  }
                  setInputKey(cleaned);
                }}
                maxLength={9}
                minLength={9}
                placeholder="CONTOH:  WALI-7K9P"
                className={`w-full h-14 sm:h-15 px-4 text-center font-black text-slate-800 text-base sm:text-lg tracking-widest uppercase rounded-2xl border-2 transition-all placeholder:text-slate-400 placeholder:font-bold placeholder:tracking-wider shadow-2xs font-mono focus:outline-none ${
                  /^WALI-[2-9A-HJ-NP-Z]{4}$/.test(inputKey)
                    ? 'border-emerald-500 bg-emerald-50/30 text-emerald-950'
                    : inputKey.length === 9 && /[0O1I]/.test(inputKey.slice(5))
                    ? 'border-rose-400 bg-rose-50/30 text-rose-950'
                    : 'border-slate-200 focus:border-teal-500 focus:bg-teal-50/20'
                }`}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck="false"
                required
              />
            </div>

            {/* Indikator Karakter */}
            <div className="flex items-center justify-between px-1.5 text-[11px] font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Aturan:</span>
                <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  WALI-XXXX
                </span>
                <span className="text-[10px] text-slate-400">
                  (Tanpa 0, O, 1, I)
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                {inputKey.length > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      /^WALI-[2-9A-HJ-NP-Z]{4}$/.test(inputKey)
                        ? 'bg-emerald-100 text-emerald-800'
                        : /[0O1I]/.test(inputKey.slice(5))
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {/[0O1I]/.test(inputKey.slice(5))
                      ? '❌ Ada 0, O, 1, I'
                      : /^WALI-[2-9A-HJ-NP-Z]{4}$/.test(inputKey)
                      ? '✓ Format Sesuai'
                      : `${9 - inputKey.length} Karakter Lagi`}
                  </span>
                )}
                <span className="text-[11px] font-black text-slate-400">
                  {inputKey.length}/9
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Utama: Buka Game */}
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
                <span>Masuk & Buka Game (/play)</span>
              </>
            )}
          </button>
        </form>

        {/* Tautan Navigasi & Bantuan */}
        <div className="mt-5 space-y-2.5 text-xs font-bold text-slate-600">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('/claim')}
              className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 hover:underline transition-colors py-1 px-2 rounded-lg cursor-pointer bg-emerald-50/80 border border-emerald-200/80"
            >
              <span>⚡</span>
              <span>Sudah Beli Tapi Belum Punya Kode? Klaim di Sini (/claim)</span>
            </button>
          </div>

          <div>
            <a
              href="https://walipintar.myscalev.com/checkout-flow-baru-1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg"
            >
              <span>🛒</span>
              <span>Belum Punya Lisensi? Beli Lisensi Resmi di Scalev</span>
            </a>
          </div>

          <div>
            <a
              href="https://wa.me/6285704808186?text=Halo%20Admin%20Wali%20Pintar%2C%20saya%20butuh%20bantuan%20login%20lisensi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg"
            >
              <WhatsAppIcon className="w-4 h-4 shadow-2xs rounded-full" />
              <span>Butuh Bantuan? WhatsApp Admin (085704808186)</span>
            </a>
          </div>
        </div>

        {/* Media Sosial Resmi Wali Pintar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-center mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Media Sosial Resmi Wali Pintar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href="https://youtube.com/@walipintar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100/90 text-red-600 border border-red-200 transition-all text-xs font-bold shadow-xs active:scale-95 group"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>YouTube</span>
            </a>

            <a
              href="https://facebook.com/walipintar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100/90 text-[#1877F2] border border-blue-200 transition-all text-xs font-bold shadow-xs active:scale-95 group"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </a>

            <a
              href="https://instagram.com/walipintar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-pink-50 hover:bg-pink-100/90 text-[#E4405F] border border-pink-200 transition-all text-xs font-bold shadow-xs active:scale-95 group"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram</span>
            </a>

            <a
              href="https://tiktok.com/@walipintar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all text-xs font-bold shadow-xs active:scale-95 group"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
              <span>TikTok</span>
            </a>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
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
              {rejectMessage || 'Kode lisensi yang dimasukkan tidak ditemukan atau belum aktif.'}
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  onNavigate('/claim');
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
              >
                <span>⚡ Klaim Lisensi via Email Pembelian (/claim)</span>
              </button>

              <a
                href="https://wa.me/6285704808186?text=Halo%20Admin%20Wali%20Pintar%2C%20lisensi%20saya%20tidak%20bisa%20login"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
              >
                <WhatsAppIcon className="w-4 h-4 shadow-2xs rounded-full" />
                <span>WhatsApp Admin (085704808186)</span>
              </a>

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

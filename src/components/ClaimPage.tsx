import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Copy, Check } from 'lucide-react';
import { SFX } from '../utils/audio';
import { WhatsAppIcon } from './WhatsAppIcon';
import { CloseButton3D } from './CloseButton3D';

interface ClaimPageProps {
  onUnlockSuccess: (licenseKey: string) => void;
  onNavigate: (path: string) => void;
}

const GAS_API_URL = (import.meta as any).env?.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwRXacMOX7jFffw73voAxPcdgYtu7in5kt7PQ0M7qK3FaaC3YOYm0F9WeQSBcnRFlVG/exec';
const ADMIN_WA_NUMBER = '6285704808186';

export const ClaimPage: React.FC<ClaimPageProps> = ({ onUnlockSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paidModalData, setPaidModalData] = useState<{
    email: string;
    license: string;
    orderId?: string;
    emailSent?: boolean;
    emailSentNow?: boolean;
    wasBrevoPending?: boolean;
    cooldownActive?: boolean;
    copyOnlyPopup?: boolean;
    lastEmailDate?: string;
    nextEligibleDate?: string;
    remainingDays?: number;
  } | null>(null);
  const [unpaidModalData, setUnpaidModalData] = useState<{ email: string; message?: string; isNotOrdered?: boolean; isBlocked?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const [copyOnlyKey, setCopyOnlyKey] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const actionParam = (params.get('action') || '').trim().toLowerCase();
      const rawKey = (params.get('key') || params.get('license') || params.get('lisensi') || '').trim().toUpperCase();
      if (actionParam === 'copy' && rawKey.startsWith('WALI-')) {
        return rawKey;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    const cleanText = text.trim().toUpperCase();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanText);
        return true;
      }
    } catch {
      // Fall through to execCommand
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = cleanText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.fontSize = '16px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, cleanText.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  // Set document title
  useEffect(() => {
    document.title = copyOnlyKey ? 'Salin Kode Lisensi - Wali Pintar' : 'Klaim Lisensi Pembelian - Wali Pintar';
  }, [copyOnlyKey]);

  // Check URL parameters for email & optional order metadata from Thank You Page redirect
  useEffect(() => {
    if (copyOnlyKey) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email') || params.get('customer_email') || params.get('buyer_email') || params.get('mail');
      const savedEmail = localStorage.getItem('walipintar_email');

      if (urlEmail && urlEmail.includes('@')) {
        setEmail(urlEmail.trim());
        triggerVerification(urlEmail.trim());
      } else {
        if (savedEmail && savedEmail.includes('@')) {
          setEmail(savedEmail.trim());
        }
        // Bangunkan container GAS secara diam-diam saat halaman dibuka agar saat tombol diklik langsung cepat
        fetch(`${GAS_API_URL}?action=ping&t=${Date.now()}`, { cache: 'no-store' }).catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, [copyOnlyKey]);

  const triggerVerification = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Silakan masukkan format email yang valid saat Anda checkout.');
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const query = new URLSearchParams({
        action: 'create',
        email: cleanEmail,
      });
      const orderIdParam = urlParams.get('order_id') || urlParams.get('orderId') || urlParams.get('refId') || '';
      const namaParam = urlParams.get('nama') || urlParams.get('name') || urlParams.get('customer_name') || '';
      const produkParam = urlParams.get('produk') || urlParams.get('product') || urlParams.get('product_name') || '';
      if (orderIdParam && !orderIdParam.startsWith('{')) query.set('order_id', orderIdParam.trim());
      if (namaParam && !namaParam.startsWith('{')) query.set('nama', namaParam.trim());
      if (produkParam && !produkParam.startsWith('{')) query.set('produk', produkParam.trim());

      const apiUrl = `${GAS_API_URL}?${query.toString()}`;
      const res = await fetch(apiUrl, { signal: controller.signal, cache: 'no-store' });
      window.clearTimeout(timeoutId);
      const data = await res.json();
      setIsLoading(false);

      const foundKey = data?.licenseKey || data?.license;
      if (data && data.success && foundKey) {
        // LUNAS
        localStorage.setItem('walipintar_license', foundKey);
        localStorage.setItem('walipintar_email', cleanEmail);
        if (data.orderId) localStorage.setItem('walipintar_order', data.orderId);
        localStorage.setItem('walipintar_auth_time', Date.now().toString());

        const isCooldown = Boolean(data.cooldownActive || data.copyOnlyPopup || (!data.emailSentNow && data.emailSent === false));
        SFX.fanfare();
        clearRedirectTimers();
        setCopied(false);
        setUnpaidModalData(null);
        setPaidModalData({
          email: cleanEmail,
          license: foundKey,
          orderId: data.orderId,
          emailSent: data.emailSent !== false,
          emailSentNow: !!data.emailSentNow,
          wasBrevoPending: !!data.wasBrevoPending,
          cooldownActive: isCooldown,
          copyOnlyPopup: isCooldown,
          lastEmailDate: data.lastEmailDate,
          nextEligibleDate: data.nextEligibleDate,
          remainingDays: typeof data.remainingDays === 'number' ? data.remainingDays : undefined,
        });
      } else {
        // BELUM LUNAS ATAU BELUM PERNAH ORDER
        SFX.no();
        setPaidModalData(null);
        const rawMsg = String(data?.message || '');
        const isBlocked = Boolean(data?.blocked || rawMsg.toLowerCase().includes('terblokir'));
        const isNotOrdered =
          !isBlocked &&
          Boolean(
            data?.notOrdered ||
              rawMsg.toLowerCase().includes('belum pernah order') ||
              rawMsg.toLowerCase().includes('tidak ditemukan') ||
              rawMsg.toLowerCase().includes('not found') ||
              rawMsg.toLowerCase().includes('ayo beli')
          );

        setUnpaidModalData({
          email: cleanEmail,
          message: isBlocked
            ? 'Lisensi mu terblokir'
            : isNotOrdered
              ? 'email kamu belum pernah order, ayo beli dulu'
              : rawMsg,
          isNotOrdered,
          isBlocked,
        });
      }
    } catch (err) {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
      SFX.no();
      setPaidModalData(null);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      setUnpaidModalData({
        email: cleanEmail,
        message: isTimeout
          ? 'Waktu koneksi ke server habis. Silakan klik Periksa Ulang Pembayaran untuk mencoba kembali.'
          : 'Koneksi jaringan bermasalah saat menghubungi server. Pastikan internet Anda aktif lalu coba lagi.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerVerification(email);
  };

  const clearRedirectTimers = () => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRedirectCountdown(null);
  };

  useEffect(() => {
    return () => clearRedirectTimers();
  }, []);

  const handleCopyCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const ok = await copyTextToClipboard(cleanCode);
    if (ok) {
      SFX.ding();
      setCopied(true);
      try {
        localStorage.setItem('walipintar_license', cleanCode);
        localStorage.setItem('walipintar_auth_time', Date.now().toString());
      } catch {
        // Ignore storage error
      }
      clearRedirectTimers();
      setRedirectCountdown(2);
      countdownIntervalRef.current = window.setInterval(() => {
        setRedirectCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : prev));
      }, 1000);
      redirectTimerRef.current = window.setTimeout(() => {
        clearRedirectTimers();
        onUnlockSuccess(cleanCode);
      }, 2000);
    }
  };

  const handlePlayNow = (license: string) => {
    clearRedirectTimers();
    onUnlockSuccess(license);
  };

  // MODE KHUSUS SALIN LISENSI (?action=copy&key=WALI-XXXX): benar-benar hanya untuk menyalin kode lisensi
  if (copyOnlyKey) {
    return (
      <div className="min-h-screen min-h-dvh bg-gradient-to-b from-emerald-50/70 via-teal-50/50 to-sky-50/70 flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-emerald-100">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center relative overflow-hidden animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
            {copied ? <Check className="w-8 h-8 stroke-[2.75]" /> : <Copy className="w-8 h-8" />}
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1.5">
            Salin Kode Lisensi
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-5 leading-relaxed">
            Klik tombol di bawah ini untuk menyalin kode lisensi resmi Anda ke clipboard.
          </p>

          <div
            onClick={() => handleCopyCode(copyOnlyKey)}
            className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl p-4 mb-4 cursor-pointer hover:bg-emerald-100/60 transition-colors"
            title="Klik untuk menyalin kode lisensi"
          >
            <div className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1.5">
              Kode Lisensi Resmi Anda
            </div>
            <div className="font-mono text-3xl font-black text-emerald-950 tracking-widest bg-white py-2.5 px-4 rounded-xl border border-emerald-200 inline-block select-all">
              {copyOnlyKey}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyCode(copyOnlyKey)}
            className={`w-full h-14 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98] ${
              copied
                ? 'bg-emerald-700 text-white shadow-emerald-500/25'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 stroke-[2.75]" />
                <span>
                  {redirectCountdown !== null
                    ? `Tersalin! Masuk Game (${redirectCountdown}d)...`
                    : 'Kode Lisensi Tersalin!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Salin Kode Lisensi</span>
              </>
            )}
          </button>

          {copied && (
            <p className="mt-3 text-xs font-bold text-emerald-700">
              {redirectCountdown !== null ? (
                <>
                  Kode <span className="font-mono underline">{copyOnlyKey}</span> tersalin! Membuka game otomatis dalam{' '}
                  <span className="font-black text-emerald-900">{redirectCountdown} detik</span>...
                </>
              ) : (
                <>
                  Kode <span className="font-mono underline">{copyOnlyKey}</span> sudah tersalin ke clipboard.
                </>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-b from-emerald-50/70 via-teal-50/50 to-sky-50/70 flex flex-col items-center justify-center p-4 sm:p-6 antialiased selection:bg-emerald-100">
      {/* Decorative Circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center relative overflow-hidden animate-fade-in">
        
        {/* Brand Icon */}
        <div className="flex justify-center mb-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-6xl sm:text-7xl drop-shadow-sm select-none transform hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer bg-transparent border-0"
            title="Ke Halaman Utama"
          >
            🎮
          </button>
        </div>

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200/90 text-emerald-900 font-extrabold text-[11px] sm:text-xs mb-3 shadow-2xs">
          <span>⚡</span>
          <span>Klaim Lisensi Otomatis</span>
        </div>

        <h1
          onClick={() => onNavigate('/')}
          className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1 cursor-pointer hover:text-emerald-800 transition-colors"
          title="Ke Halaman Utama"
        >
          Klaim Lisensi Game
        </h1>

        <p className="text-xs sm:text-sm font-bold text-slate-500 mb-5 leading-relaxed">
          Verifikasi instan untuk membuka 17 game edukasi offline anak tanpa perlu input ulang data
        </p>

        {/* FORM HANYA INPUT EMAIL PEMBELIAN */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800">
              Email Pembelian
            </label>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11.5px] font-bold text-emerald-800">
              <span>💡</span>
              <span>email saat checkout</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none opacity-60">
                ✉️
              </span>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full h-14 sm:h-15 pl-12 pr-12 font-bold text-slate-800 text-base sm:text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:bg-emerald-50/20 shadow-2xs focus:outline-none transition-all"
                autoCapitalize="none"
                autoComplete="email"
                spellCheck="false"
                required
              />
              {email && !isLoading && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    try { localStorage.removeItem('walipintar_email'); } catch {}
                    emailInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 active:scale-90 transition-all cursor-pointer"
                  aria-label="Hapus email"
                  title="Hapus email"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-13 sm:h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memverifikasi Pembayaran...</span>
              </>
            ) : (
              <>
                <span className="text-lg">⚡</span>
                <span>Verifikasi Pembayaran & Klaim Lisensi</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-slate-400">
          <span>🔒</span>
          <span>Aman & Otomatis: Lisensi langsung terpasang di perangkat Anda</span>
        </div>

        {/* Tautan Navigasi */}
        <div className="mt-5 space-y-2.5 text-xs font-bold text-slate-600 pt-4 border-t border-slate-100 text-center">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="inline-block max-w-full text-center text-teal-700 hover:text-teal-800 hover:underline transition-colors py-1.5 px-3 rounded-lg cursor-pointer bg-teal-50/80 border border-teal-200/80 leading-snug"
            >
              <span className="inline mr-1">🔑</span>
              <span>Sudah Punya Kode Lisensi? Login di Sini (/login)</span>
            </button>
          </div>

          <div>
            <a
              href="https://walipintar.myscalev.com/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block max-w-full text-center text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg leading-snug"
            >
              <span className="inline mr-1">🛒</span>
              <span>Belum Punya Lisensi? Beli Lisensi Sekarang</span>
            </a>
          </div>

          <div>
            <a
              href={`https://wa.me/${ADMIN_WA_NUMBER}?text=Halo%20Admin%20Wali%20Pintar%2C%20saya%20butuh%20bantuan%20klaim%20lisensi`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block max-w-full text-center text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg leading-snug"
            >
              <WhatsAppIcon className="w-4 h-4 shadow-2xs rounded-full inline-block align-text-bottom mr-1.5" />
              <span>Butuh Bantuan? WhatsApp Admin (0857-0480-8186)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Red YouTube Guide Box tepat di bawah box */}
      <div className="w-full max-w-md mt-3.5 flex justify-center">
        <a
          href="https://www.youtube.com/@walipintar/playlists"
          target="_blank"
          rel="noopener noreferrer"
          className="w-auto min-w-[230px] sm:min-w-[250px] px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-sm sm:text-base shadow-md border-2 border-red-500 transition-all flex items-center justify-center gap-2.5 whitespace-nowrap"
        >
          <span className="w-7 h-5 bg-white rounded-md flex items-center justify-center shrink-0 shadow-2xs" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-600">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span>Panduan YouTube</span>
        </a>
      </div>

      {/* POPUP JIKA LUNAS: < 3 bulan -> Pop-up Copy-Paste; >= 3 bulan atau baru pertama -> Kirim Email Brevo + Main */}
      {paidModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border-4 border-emerald-400 relative animate-scale-in">
            <CloseButton3D
              onClick={() => {
                clearRedirectTimers();
                setPaidModalData(null);
              }}
              size="sm"
              ariaLabel="Tutup"
              className="absolute top-3.5 right-3.5 z-10"
            />

            {paidModalData.cooldownActive && !paidModalData.emailSentNow ? (
              <>
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  {copied ? <Check className="w-7 h-7 stroke-[2.75]" /> : <Copy className="w-7 h-7" />}
                </div>

                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5 leading-snug">
                  Salin Kode Lisensi Anda
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-3.5 break-words">
                  Lisensi atas email <strong className="text-slate-900 underline">{paidModalData.email}</strong> aktif! Silakan langsung <strong>Copy-Paste</strong> kode di bawah ini untuk masuk game.
                </p>

                <div
                  onClick={() => handleCopyCode(paidModalData.license)}
                  className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl p-3.5 mb-3 cursor-pointer hover:bg-emerald-100/60 transition-colors"
                  title="Klik untuk menyalin kode lisensi"
                >
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Kode Lisensi Resmi Anda:
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-950 tracking-widest bg-white py-2 px-3 rounded-xl border border-emerald-200 inline-block select-all">
                    {paidModalData.license}
                  </div>
                  {paidModalData.orderId && (
                    <div className="text-[11px] text-slate-500 font-semibold mt-1.5">
                      Order ID: {paidModalData.orderId}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(paidModalData.license)}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98 mb-2.5 ${
                    copied
                      ? 'bg-emerald-700 text-white shadow-emerald-500/25'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.75]" />
                      <span>
                        {redirectCountdown !== null
                          ? `Tersalin! Masuk Game dalam ${redirectCountdown} detik...`
                          : 'Kode Lisensi Tersalin!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>📋 Salin Kode Lisensi (Copy)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayNow(paidModalData.license)}
                  className="w-full py-3 px-4 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all mb-3"
                >
                  <span>🚀 Mulai Main Game Sekarang (/play)</span>
                </button>

                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 text-left text-[11px] text-amber-950 leading-relaxed">
                  <strong>⏳ Kirim Ulang Email Dijadwalkan Tiap 3 Bulan:</strong> Email sudah pernah dikirim{paidModalData.lastEmailDate ? ` pada ${paidModalData.lastEmailDate}` : ''}. Pengiriman ulang via email tersedia kembali{paidModalData.nextEligibleDate ? ` pada ${paidModalData.nextEligibleDate}` : ''}{paidModalData.remainingDays ? ` (${paidModalData.remainingDays} hari lagi)` : ''} agar layanan email tetap lancar.
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3 animate-bounce">🎉</div>
                <h3 className="text-lg sm:text-xl font-black text-emerald-950 mb-2 leading-snug break-words">
                  invoice email : <span className="text-emerald-700 underline">{paidModalData.email}</span> sudah lunas
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Alhamdulillah! Pembayaran resmi Anda telah terkonfirmasi lunas. Lisensi resmi si kecil siap digunakan.
                </p>

                <div
                  onClick={() => handleCopyCode(paidModalData.license)}
                  className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl p-3 mb-3 cursor-pointer hover:bg-emerald-100/60 transition-colors"
                  title="Klik untuk menyalin kode lisensi"
                >
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Kode Lisensi Resmi Anda:</div>
                  <div className="font-mono text-2xl font-black text-emerald-900 tracking-wider my-1 select-all">
                    {paidModalData.license}
                  </div>
                  {paidModalData.orderId && (
                    <div className="text-[11px] text-slate-500 font-semibold">
                      Order ID: {paidModalData.orderId}
                    </div>
                  )}
                  {redirectCountdown !== null && (
                    <div className="mt-2 text-[11px] font-black text-emerald-800 bg-emerald-200/80 px-2.5 py-1 rounded-lg inline-block animate-pulse">
                      ✅ Tersalin! Membuka game dalam {redirectCountdown} detik...
                    </div>
                  )}
                </div>

                {/* KOTAK PENGINGAT CEK EMAIL DARI admin@walipintar.my.id */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-left mb-3.5 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl flex-shrink-0 mt-0.5 animate-pulse">📧</span>
                    <div className="space-y-1">
                      <div className="text-xs font-black text-amber-950 flex items-center justify-between">
                        <span>Pengingat Cek Email Lisensi</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                          {paidModalData.emailSentNow ? 'Baru Terkirim' : 'Terkirim'}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-slate-700 leading-relaxed">
                        Lisensi resmi juga telah dikirimkan ke email <strong className="text-slate-900 underline">{paidModalData.email}</strong> dari pengirim resmi <span className="font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">admin@walipintar.my.id</span>.
                      </p>

                      <div className="text-[11px] font-semibold text-amber-900 bg-amber-100/70 p-1.5 rounded-lg border border-amber-200/80 flex items-start gap-1.5 mt-1">
                        <span className="shrink-0">⚠️</span>
                        <span>Pastikan periksa juga folder <strong>Spam</strong> atau <strong>Promosi</strong> jika tidak ada di Kotak Masuk.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TOMBOL MULAI MAIN GAME SEKARANG */}
                <button
                  type="button"
                  onClick={() => handlePlayNow(paidModalData.license)}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer transition-all active:scale-98 mb-2"
                >
                  <span>🚀 Mulai Main Game Sekarang (/play)</span>
                  <span>➔</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyCode(paidModalData.license)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {copied
                    ? redirectCountdown !== null
                      ? `✅ Tersalin! Masuk Game dalam ${redirectCountdown} detik...`
                      : '✅ Berhasil Disalin!'
                    : '📋 Salin Kode Lisensi'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* POPUP JIKA BELUM PERNAH ORDER ATAU BELUM LUNAS */}
      {unpaidModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border-4 relative animate-scale-in ${
              unpaidModalData.isNotOrdered ? 'border-amber-400' : 'border-amber-300'
            }`}
          >
            <CloseButton3D
              onClick={() => setUnpaidModalData(null)}
              size="sm"
              ariaLabel="Tutup"
              className="absolute top-3.5 right-3.5 z-10"
            />

            {unpaidModalData.isNotOrdered ? (
              /* SKENARIO: EMAIL BELUM PERNAH ORDER SCALEV */
              <>
                <div className="text-5xl mb-3 animate-bounce">🛒</div>
                <h3 className="text-xl sm:text-2xl font-black text-rose-950 mb-2 leading-snug break-words">
                  email kamu belum pernah order, ayo beli dulu
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-5">
                  Email <span className="font-bold text-slate-900 underline">{unpaidModalData.email}</span> belum terdaftar di riwayat pemesanan. Dapatkan akses penuh ke 17 game edukasi si kecil sekarang!
                </p>

                <div className="space-y-2.5">
                  <a
                    href={unpaidModalData.email ? `https://walipintar.myscalev.com/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia?email=${encodeURIComponent(unpaidModalData.email)}` : 'https://walipintar.myscalev.com/wali-pintar-17-game-edukasi-offline-mewarnai-560-ensiklopedia'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer transition-all active:scale-98"
                  >
                    <span>🛒 Beli Lisensi Sekarang</span>
                    <span>➔</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setUnpaidModalData(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Ganti Email Lain
                  </button>

                  <a
                    href={`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(
                      `Halo Admin Wali Pintar, saya mau tanya soal pemesanan game untuk email ${unpaidModalData.email}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block max-w-full text-center text-[11.5px] text-slate-500 hover:text-emerald-700 underline transition-colors pt-1 leading-snug"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 shadow-2xs rounded-full inline-block align-text-bottom mr-1.5" />
                    <span>Sudah bayar dengan email lain? Chat WhatsApp Admin</span>
                  </a>
                </div>
              </>
            ) : unpaidModalData.isBlocked ? (
              /* SKENARIO: LISENSI ATAU EMAIL TERBLOKIR */
              <>
                <div className="text-5xl mb-3 animate-bounce">🚫</div>
                <h3 className="text-xl sm:text-2xl font-black text-rose-950 mb-2 leading-snug break-words">
                  Lisensi mu terblokir
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Akses untuk email <span className="font-bold text-slate-900 underline">{unpaidModalData.email}</span> telah dihapus atau dinonaktifkan dari sistem. Silakan hubungi Admin WhatsApp jika membutuhkan bantuan.
                </p>

                <div className="space-y-2">
                  <a
                    href={`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(
                      `Halo Admin Wali Pintar, lisensi untuk email ${unpaidModalData.email} terblokir. Mohon bantuannya.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
                  >
                    <WhatsAppIcon className="w-4 h-4 shadow-2xs rounded-full" />
                    <span>Hubungi Admin WhatsApp (0857-0480-8186)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setUnpaidModalData(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Ganti Email Lain
                  </button>
                </div>
              </>
            ) : (
              /* SKENARIO: SUDAH CHECKOUT TAPI BELUM LUNAS */
              <>
                <div className="text-5xl mb-3 animate-bounce">⏳</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-950 mb-2 leading-snug break-words">
                  invoice email : <span className="text-amber-800 underline">{unpaidModalData.email}</span> masih belum terbayar
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {unpaidModalData.message ? unpaidModalData.message.replace(/^AKSES DITOLAK:\s*/i, '') : 'Sistem belum mendeteksi pembayaran lunas untuk email ini. Jika Anda baru saja transfer atau scan QRIS, silakan tunggu 1-2 menit lalu klik periksa kembali.'}
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUnpaidModalData(null);
                      triggerVerification(unpaidModalData.email);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
                  >
                    <span>🔄 Periksa Ulang Pembayaran</span>
                  </button>

                  <a
                    href={`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(
                      `Halo Admin Wali Pintar, saya sudah transfer untuk email ${unpaidModalData.email}, mohon bantuannya untuk verifikasi.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98"
                  >
                    <WhatsAppIcon className="w-4 h-4 shadow-2xs rounded-full" />
                    <span>WhatsApp Admin (0857-0480-8186)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setUnpaidModalData(null)}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Ganti Email Lain
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

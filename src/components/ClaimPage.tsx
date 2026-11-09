import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { SFX } from '../utils/audio';

interface ClaimPageProps {
  onUnlockSuccess: (licenseKey: string) => void;
  onNavigate: (path: string) => void;
}

const GAS_API_URL = (import.meta as any).env?.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwRXacMOX7jFffw73voAxPcdgYtu7in5kt7PQ0M7qK3FaaC3YOYm0F9WeQSBcnRFlVG/exec';
const ADMIN_WA_NUMBER = '6285704808186';

export const ClaimPage: React.FC<ClaimPageProps> = ({ onUnlockSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paidModalData, setPaidModalData] = useState<{
    email: string;
    license: string;
    orderId?: string;
    emailSent?: boolean;
    emailSentNow?: boolean;
    wasBrevoPending?: boolean;
  } | null>(null);
  const [unpaidModalData, setUnpaidModalData] = useState<{ email: string; message?: string; isNotOrdered?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'Klaim Lisensi Pembelian - Wali Pintar';
  }, []);

  // Check URL parameters for email
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email') || params.get('customer_email') || params.get('buyer_email') || params.get('mail');
      const savedEmail = localStorage.getItem('walipintar_email');

      if (urlEmail && urlEmail.includes('@')) {
        setEmail(urlEmail.trim());
        triggerVerification(urlEmail.trim());
      } else if (savedEmail && savedEmail.includes('@')) {
        setEmail(savedEmail.trim());
      }
    } catch {
      // Ignore
    }
  }, []);

  const triggerVerification = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Silakan masukkan format email yang valid saat Anda checkout.');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = `${GAS_API_URL}?action=create&email=${encodeURIComponent(cleanEmail)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      setIsLoading(false);

      const foundKey = data?.licenseKey || data?.license;
      if (data && data.success && foundKey) {
        // LUNAS
        localStorage.setItem('walipintar_license', foundKey);
        localStorage.setItem('walipintar_email', cleanEmail);
        if (data.orderId) localStorage.setItem('walipintar_order', data.orderId);
        localStorage.setItem('walipintar_auth_time', Date.now().toString());

        SFX.fanfare();
        setUnpaidModalData(null);
        setPaidModalData({
          email: cleanEmail,
          license: foundKey,
          orderId: data.orderId,
          emailSent: data.emailSent !== false,
          emailSentNow: !!data.emailSentNow,
          wasBrevoPending: !!data.wasBrevoPending,
        });
      } else {
        // BELUM LUNAS ATAU BELUM PERNAH ORDER
        SFX.no();
        setPaidModalData(null);
        const rawMsg = String(data?.message || '');
        const isNotOrdered = Boolean(
          data?.notOrdered ||
          rawMsg.toLowerCase().includes('belum pernah order') ||
          rawMsg.toLowerCase().includes('tidak ditemukan') ||
          rawMsg.toLowerCase().includes('not found') ||
          rawMsg.toLowerCase().includes('ayo beli')
        );

        setUnpaidModalData({
          email: cleanEmail,
          message: isNotOrdered ? 'email kamu belum pernah order, ayo beli dulu' : rawMsg,
          isNotOrdered,
        });
      }
    } catch (err) {
      setIsLoading(false);
      SFX.no();
      setPaidModalData(null);
      setUnpaidModalData({
        email: cleanEmail,
        message: 'Koneksi jaringan bermasalah saat menghubungi server. Pastikan internet Anda aktif lalu coba lagi.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerVerification(email);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Salin lisensi Anda:', code);
    }
  };

  const handlePlayNow = (license: string) => {
    onUnlockSuccess(license);
  };

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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full h-14 sm:h-15 pl-12 pr-4 font-bold text-slate-800 text-base sm:text-lg rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:bg-emerald-50/20 shadow-2xs focus:outline-none transition-all"
                autoCapitalize="none"
                autoComplete="email"
                spellCheck="false"
                required
              />
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
        <div className="mt-5 space-y-2.5 text-xs font-bold text-slate-600 pt-4 border-t border-slate-100">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-800 hover:underline transition-colors py-1 px-2 rounded-lg cursor-pointer bg-teal-50/80 border border-teal-200/80"
            >
              <span>🔑</span>
              <span>Sudah Punya Kode Lisensi? Login di Sini (/login)</span>
            </button>
          </div>

          <div>
            <a
              href="/beli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg"
            >
              <span>🛒</span>
              <span>Belum Membeli? Selesaikan Pembayaran di Sini</span>
            </a>
          </div>

          <div>
            <a
              href={`https://wa.me/${ADMIN_WA_NUMBER}?text=Halo%20Admin%20Wali%20Pintar%2C%20saya%20butuh%20bantuan%20klaim%20lisensi`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 hover:underline transition-colors py-1 px-2 rounded-lg"
            >
              <span>💬</span>
              <span>Butuh Bantuan? WhatsApp Admin (0857-0480-8186)</span>
            </a>
          </div>
        </div>
      </div>

      {/* POPUP JIKA LUNAS: "invoice email : (email) sudah lunas" + "mulai main game sekarang" */}
      {paidModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border-4 border-emerald-400 relative animate-scale-in">
            <div className="text-5xl mb-3 animate-bounce">🎉</div>
            <h3 className="text-lg sm:text-xl font-black text-emerald-950 mb-2 leading-snug break-words">
              invoice email : <span className="text-emerald-700 underline">{paidModalData.email}</span> sudah lunas
            </h3>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Alhamdulillah! Pembayaran resmi Anda telah terkonfirmasi lunas. Lisensi resmi si kecil siap digunakan.
            </p>

            <div className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl p-3 mb-3">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Kode Lisensi Resmi Anda:</div>
              <div className="font-mono text-2xl font-black text-emerald-900 tracking-wider my-1">
                {paidModalData.license}
              </div>
              {paidModalData.orderId && (
                <div className="text-[11px] text-slate-500 font-semibold">
                  Order ID: {paidModalData.orderId}
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
              {copied ? '✅ Berhasil Disalin!' : '📋 Salin Kode Lisensi'}
            </button>
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
            <button
              onClick={() => setUnpaidModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

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
                    href="/beli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer transition-all active:scale-98"
                  >
                    <span>🛒 Beli Lisensi Resmi Sekarang</span>
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
                    className="inline-flex items-center justify-center gap-1.5 text-[11.5px] text-slate-500 hover:text-emerald-700 underline transition-colors pt-1"
                  >
                    <span>Sudah bayar dengan email lain? Chat Admin</span>
                  </a>
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
                    <span>💬 WhatsApp Admin (0857-0480-8186)</span>
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

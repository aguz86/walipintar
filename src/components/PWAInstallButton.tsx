import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, ShieldCheck, WifiOff, Sparkles } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  lang?: 'id' | 'en';
  variant?: 'compact' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  lang = 'id',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  // Guide Modal (Works for iOS Safari, Android Chrome, and Desktop)
  const renderGuideModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl text-center relative border-4 border-indigo-200 max-h-[92vh] overflow-y-auto">
        <button
          onClick={() => setShowGuide(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-4xl mb-3">📱</div>
        <h3 className="text-xl font-black text-slate-900">
          {lang === 'id' ? 'Pasang Aplikasi di HP / Tablet' : 'Install App on Phone / Tablet'}
        </h3>

        <div className="mt-3 text-xs md:text-sm text-slate-600 leading-relaxed text-left bg-indigo-50/80 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
          {isIOS ? (
            <>
              <p className="font-bold text-indigo-900">
                {lang === 'id' ? 'Untuk iPhone & iPad (Safari):' : 'For iPhone & iPad (Safari):'}
              </p>
              <p>
                1. Ketuk tombol <strong>Bagikan (Share)</strong> 📤 di bilah bawah Safari.
              </p>
              <p>
                2. Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> ➕.
              </p>
              <p>
                3. Buka ikon <strong>Wali Pintar</strong> di layar HP untuk bermain offline tanpa kuota!
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-indigo-900">
                {lang === 'id' ? 'Untuk Android / Tablet (Chrome):' : 'For Android / Tablet (Chrome):'}
              </p>
              <p>
                1. Ketuk tombol menu titik tiga <strong>(⋮)</strong> di sudut kanan atas browser.
              </p>
              <p>
                2. Pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
              </p>
              <p>
                3. Aplikasi akan langsung terpasang seperti aplikasi bawaan dan bisa dimainkan tanpa internet!
              </p>
            </>
          )}
        </div>

        <button
          onClick={() => setShowGuide(false)}
          className="mt-5 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white hover:bg-indigo-700 shadow-md cursor-pointer transition-all active:scale-98"
        >
          {lang === 'id' ? 'Mengerti' : 'Got it'}
        </button>
      </div>
    </div>
  );

  // FOOTER VARIANT (Prominent, High-Converting Offline Banner)
  if (variant === 'footer') {
    return (
      <div className={`w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-3 border-emerald-200/90 rounded-3xl p-5 md:p-6 shadow-sm ${className}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-sm shrink-0">
              <WifiOff className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wide mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'id' ? 'Main Sepuasnya Tanpa Kuota' : 'Play Freely Without Data'}</span>
              </div>
              <h4 className="text-base md:text-lg font-black text-slate-900">
                {lang === 'id'
                  ? 'Download Aplikasi Offline untuk HP & Tablet'
                  : 'Download Offline App for Phone & Tablet'}
              </h4>
              <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-xl">
                {lang === 'id'
                  ? 'Pasang aplikasi Wali Pintar di layar utama ponsel atau tablet anak. Cepat dibuka, hemat kuota internet, dan aman digunakan saat bepergian!'
                  : 'Install Wali Pintar on your home screen. Fast to launch, zero internet needed, and 100% safe for travel!'}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row md:flex-col items-center gap-2">
            {isInstalled ? (
              <div className="w-full md:w-auto px-5 py-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === 'id' ? 'Aplikasi Sudah Terpasang (Mode Offline Aktif)' : 'App Installed (Offline Mode Active)'}</span>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{lang === 'id' ? 'Pasang Aplikasi di HP/Tab (Offline)' : 'Install Offline App on Device'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'id' ? 'Bebas Iklan' : 'Ad-Free'}
              </span>
              <span>•</span>
              <span>{lang === 'id' ? '100% Offline' : '100% Offline'}</span>
              <span>•</span>
              <span>{lang === 'id' ? 'Ukuran Ringan' : 'Lightweight'}</span>
            </div>
          </div>
        </div>

        {showGuide && renderGuideModal()}
      </div>
    );
  }

  // COMPACT HEADER VARIANT
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 active:translate-y-0.5 text-white shadow-xs transition-all whitespace-nowrap cursor-pointer ${className}`}
        aria-label={lang === 'id' ? 'Pasang Aplikasi Offline' : 'Install Offline App'}
        title={lang === 'id' ? 'Pasang di HP / Tablet untuk main offline' : 'Install for offline play'}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{lang === 'id' ? 'Pasang Offline' : 'Install App'}</span>
      </button>

      {showGuide && renderGuideModal()}
    </>
  );
};

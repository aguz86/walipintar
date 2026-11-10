import React, { useState } from 'react';
import { X, Volume2, Shield, Clock, Heart, Award, RefreshCw, KeyRound, LogOut, QrCode, Copy, ExternalLink, Share2, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SFX, playAnimalSound, speakText } from '../utils/audio';
import { WhatsAppIcon } from './WhatsAppIcon';

interface ParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'id' | 'en';
  dailyLimit: number;
  onSetDailyLimit: (minutes: number) => void;
  playedMinutes: number;
  onResetProgress: () => void;
  activeLicense?: string | null;
  onLogoutLicense?: () => void;
}

export const ParentModal: React.FC<ParentModalProps> = ({
  isOpen,
  onClose,
  lang,
  dailyLimit,
  onSetDailyLimit,
  playedMinutes,
  onResetProgress,
  activeLicense,
  onLogoutLicense,
}) => {
  // Math gate: random multiplication between 6 and 9
  const [num1] = useState(() => Math.floor(Math.random() * 4) + 6);
  const [num2] = useState(() => Math.floor(Math.random() * 4) + 6);
  const [answerInput, setAnswerInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [gateError, setGateError] = useState('');
  const [soundTestResult, setSoundTestResult] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const OFFICIAL_DOMAIN = 'https://walipintar.my.id';
  const LP_SCALEV_URL = 'https://walipintar.myscalev.com/checkout-flow-baru-1';
  // Anchor ke LP Scalev via domain resmi walipintar.my.id/beli
  const SHARE_URL = 'https://walipintar.my.id/beli';

  // POV Orang Tua (Ayah / Bunda) yang ramah & tulus sharing ke kerabat/tetangga (bukan hard selling)
  const shareTextWa =
    `Halo bunda-bunda dan kerabat tercinta! 👋😊\n\n` +
    `Mau sedikit cerita nih, akhir-akhir ini si kecil di rumah lagi senang dan anteng banget main game edukasi "Wali Pintar" 🌱.\n\n` +
    `Jujur yang bikin saya tenang banget sebagai orang tua:\n` +
    `✨ 100% Bebas Iklan – Aman banget, nggak khawatir si kecil kepencet iklan atau tontonan aneh.\n` +
    `✨ Bisa Dimainkan OFFLINE – Nggak butuh kuota internet sama sekali, jadi hemat kuota dan aman dimainkan di mana aja (pas di jalan atau lagi kumpul keluarga).\n` +
    `✨ Pas Banget Buat Usia 3–8 Tahun – Ada mewarnai kreatif, belajar huruf & angka, tebak hewan, suara binatang, sampai puzzle seru.\n\n` +
    `Anak-anak jadi senang karena rasanya kayak main biasa, padahal sebenarnya lagi mengasah motorik dan kosakata baru tanpa bikin kecanduan gadget berlebihan.\n\n` +
    `Kalau bunda atau kerabat lagi cari alternatif kegiatan positif buat si kecil di rumah, coba intip infonya di sini ya:\n` +
    `${SHARE_URL}\n\n` +
    `Semoga infonya bermanfaat buat buah hati kita bersama ya! 🥰🌱`;

  const shareTextFb =
    `Sharing info sesama orang tua yang punya anak usia 3–8 tahun! 👋😊\n\n` +
    `Akhir-akhir ini si kecil di rumah lagi suka banget main game edukasi "Wali Pintar" 🌱. Yang bikin saya suka dan tenang:\n` +
    `1. 100% Bebas Iklan (nggak khawatir ada konten dewasa/iklan aneh muncul)\n` +
    `2. Bisa dimainkan OFFLINE tanpa kuota internet\n` +
    `3. Isinya lengkap buat melatih motorik, mewarnai, huruf, angka, dan tebak suara binatang\n\n` +
    `Cocok banget jadi alternatif aktivitas screen-time yang mendidik dan aman buat anak.\n\n` +
    `Kalau mau intip atau lihat infonya, tautannya ada di sini ya: ${SHARE_URL}`;

  const handleShareWhatsApp = () => {
    SFX.ding();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWa)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = async () => {
    SFX.ding();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareTextFb);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      }
    } catch {
      // ignore
    }
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(shareTextFb)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareInstagramCopy = async () => {
    SFX.ding();
    const igText =
      `Rekomendasi game edukasi anak usia 3–8 tahun yang aman & positif dari sesama orang tua 🌱\n` +
      `100% Bebas Iklan & Siap Main Offline tanpa kuota internet: ${SHARE_URL}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(igText);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      } else {
        prompt('Salin pesan cerita rekomendasi orang tua untuk Instagram Story/DM:', igText);
      }
    } catch {
      prompt('Salin pesan cerita rekomendasi orang tua untuk Instagram Story/DM:', igText);
    }
  };

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answerInput, 10) === num1 * num2) {
      setUnlocked(true);
      setGateError('');
      SFX.ding();
    } else {
      setGateError(lang === 'id' ? 'Jawaban belum tepat, coba lagi ya.' : 'Incorrect answer, please try again.');
      SFX.no();
    }
  };

  const handleTestSound = () => {
    SFX.ding();
    setTimeout(() => {
      playAnimalSound('🐱', () => {
        speakText(
          lang === 'id'
            ? 'Halo Ayah dan Bunda! Suara dan animasi game berfungsi dengan baik.'
            : 'Hello Parents! Sound effects and audio are working perfectly.',
          lang
        );
      });
    }, 400);
    setSoundTestResult(lang === 'id' ? 'Audio Web Audio & Text-to-Speech aktif' : 'Audio & Speech active');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white p-4 sm:p-6 shadow-2xl relative border-4 border-amber-200 my-auto text-slate-800 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-6 h-6" />
        </button>

        {!unlocked ? (
          /* Math Gate Protection */
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">
              {lang === 'id' ? 'Area Khusus Orang Tua' : 'Parental Gate'}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {lang === 'id'
                ? 'Selesaikan soal berikut untuk membuka pengaturan pendampingan anak:'
                : 'Please solve this math question to unlock parent controls:'}
            </p>

            <form onSubmit={handleVerify} className="max-w-xs mx-auto space-y-4">
              <div className="text-3xl font-black text-indigo-700 tracking-wider bg-indigo-50 p-3 rounded-2xl border-2 border-indigo-100">
                {num1} × {num2} = ?
              </div>
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="?"
                className="w-28 h-14 text-center text-3xl font-black rounded-2xl border-2 border-slate-300 focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
              {gateError && <p className="text-xs text-rose-500 font-bold">{gateError}</p>}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-md cursor-pointer transition-all active:translate-y-0.5"
              >
                {lang === 'id' ? 'Buka Kunci' : 'Unlock'}
              </button>
            </form>
          </div>
        ) : (
          /* Parent Dashboard */
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-2xl">👨‍👩‍👧</span>
              <h3 className="text-xl font-black text-slate-900">
                {lang === 'id' ? 'Pengaturan Pendamping Anak' : 'Parental Controls'}
              </h3>
            </div>

            {/* License Management Card */}
            {activeLicense && (
              <div className="bg-emerald-50/80 p-3.5 sm:p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1.5 tracking-wider">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === 'id' ? 'Lisensi Aplikasi Aktif' : 'Active App License'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-xs sm:text-sm text-emerald-950 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                      {activeLicense}
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{lang === 'id' ? 'Akses Penuh • 100% Offline' : 'Full Access • 100% Offline'}</span>
                    </span>
                  </div>
                </div>

                {onLogoutLicense && (
                  <button
                    onClick={() => {
                      onClose();
                      onLogoutLicense();
                    }}
                    className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 font-bold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title={lang === 'id' ? 'Ganti atau keluar dari lisensi ini' : 'Change or switch license'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Ganti Lisensi' : 'Switch Key'}</span>
                  </button>
                )}
              </div>
            )}

            {/* SEKSI AJAK TETANGGA & KERABAT (TOMBOL SHARE & QR WEB WALIPINTAR) */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 rounded-2xl border-2 border-emerald-300 p-3.5 sm:p-4 shadow-xs text-left">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs text-xl shrink-0">
                    🤝
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-emerald-950 leading-tight">
                      Ajak tetangga dan kerabat kamu
                    </h4>
                    <p className="text-[11.5px] sm:text-xs font-bold text-emerald-800">
                      agar anak-anak sekitarmu bisa pintar bersama
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                  Rekomendasi
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Bagikan pengalaman positif Anda ke sesama orang tua atau keluarga. Pesan telah disusun hangat dari sudut pandang seorang ibu/ayah yang ingin anak-anak usia 3–8 tahun sekitar bermain game edukatif yang aman, bebas iklan, dan siap offline!
              </p>

              {/* Grid 4 Tombol Share: Share WA, Share FB, Share IG, QR Web Walipintar */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                {/* 1. Link Share WA */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Bagikan ke WhatsApp Tetangga & Kerabat"
                >
                  <WhatsAppIcon className="w-4 h-4 shadow-2xs rounded-full" />
                  <span>Share WA</span>
                </button>

                {/* 2. Link Share FB */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="py-2.5 px-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Bagikan ke Facebook"
                >
                  <span className="text-base">👥</span>
                  <span>Share FB</span>
                </button>

                {/* 3. Link Share IG / Salin Tautan */}
                <button
                  type="button"
                  onClick={handleShareInstagramCopy}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Salin Link Rekomendasi untuk Instagram Story / DM"
                >
                  <span className="text-base">📸</span>
                  <span>{linkCopied ? '✅ Tersalin!' : 'Share IG'}</span>
                </button>

                {/* 4. QR Web Walipintar */}
                <button
                  type="button"
                  onClick={() => {
                    SFX.ding();
                    setShowQrModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Tampilkan QR Code Web Walipintar untuk di-scan HP"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>QR Web</span>
                </button>
              </div>

              {/* Footer info: domain resmi walipintar.my.id & anchor ke LP Scalev */}
              <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <a
                  href={OFFICIAL_DOMAIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 hover:text-emerald-700 font-bold flex items-center gap-1 truncate"
                  title="Wajib buka domain resmi Walipintar.my.id"
                >
                  <span>🌐 Walipintar.my.id</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <a
                  href={LP_SCALEV_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 font-extrabold flex items-center gap-1 shrink-0 hover:underline"
                >
                  <span>Anchor LP Scalev</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Screen time tracking & limits */}
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-amber-800 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {lang === 'id' ? 'Waktu Main Hari Ini' : 'Today Screen Time'}
                </span>
                <span className="text-base font-black text-amber-900">
                  {playedMinutes} / {dailyLimit} {lang === 'id' ? 'menit' : 'min'}
                </span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (playedMinutes / dailyLimit) * 100)}%` }}
                />
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  {lang === 'id' ? 'Batas Waktu Harian:' : 'Daily Time Limit:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onSetDailyLimit(mins)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        dailyLimit === mins
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      {mins} {lang === 'id' ? 'mnt' : 'm'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* WHO Advice & Pedagogy */}
            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-xs text-sky-900 leading-relaxed space-y-1">
              <div className="font-black text-sky-950 flex items-center gap-1 text-sm">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                {lang === 'id' ? 'Anjuran Kesehatan & Dampingan (WHO)' : 'Health & Screen Guidelines (WHO)'}
              </div>
              <p>
                {lang === 'id'
                  ? 'Anak usia 2–4 tahun disarankan maksimal 1 jam layar per hari. Dampingi anak saat bermain, ajak menirukan suara hewan, dan praktikkan kosakata baru di kehidupan nyata (misal saat makan buah atau melihat tanaman di luar rumah).'
                  : 'Children aged 2–4 are advised to have no more than 1 hour of screen time per day. Play together, imitate sounds, and explore real fruits and plants together outdoors.'}
              </p>
            </div>

            {/* Sound diagnostics */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <div className="text-sm font-black text-slate-800">
                  {lang === 'id' ? 'Tes Suara & Narasi' : 'Sound & Voice Test'}
                </div>
                <div className="text-xs text-slate-500">
                  {soundTestResult || (lang === 'id' ? 'Periksa suara hewan & narator' : 'Test synthesized audio')}
                </div>
              </div>
              <button
                onClick={handleTestSound}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>{lang === 'id' ? 'Uji Suara' : 'Test'}</span>
              </button>
            </div>

            {/* Reset progress */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm(lang === 'id' ? 'Yakin ingin mereset bintang dan catatan skor?' : 'Reset stars and progress?')) {
                    onResetProgress();
                    onClose();
                  }
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 p-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Reset Bintang' : 'Reset Stars'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer"
              >
                {lang === 'id' ? 'Selesai' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {/* POPUP MODAL QR WEB WALIPINTAR */}
        {showQrModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl text-center border-4 border-emerald-400 relative animate-scale-in text-slate-800">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup QR"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 text-2xl shadow-xs">
                🌱
              </div>

              <h4 className="text-base font-black text-slate-900 mb-0.5">
                QR Web Wali Pintar
              </h4>
              <p className="text-[11px] font-bold text-slate-500 mb-3.5 leading-snug">
                Arahkan kamera smartphone tetangga & kerabat Anda ke kode ini
              </p>

              {/* KOTAK QR CODE SVG HASIL GENERATE VECTOR (100% OFFLINE CAPABLE) */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-inner inline-block mx-auto mb-3">
                <QRCodeSVG
                  value={SHARE_URL}
                  size={180}
                  level="H"
                  includeMargin={false}
                  className="mx-auto"
                />
              </div>

              <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 text-[11px] text-emerald-950 font-bold mb-3 leading-snug text-left">
                <div className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider mb-0.5">
                  Tautan Rekomendasi Resmi:
                </div>
                <div className="font-mono text-emerald-900 text-xs break-all font-bold">
                  {SHARE_URL}
                </div>
                <p className="text-[10px] text-emerald-700 font-medium mt-1">
                  *Otomatis mengarah ke halaman pemesanan resmi (LP Scalev)
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleShareInstagramCopy}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-98"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{linkCopied ? '✅ Tautan Tersalin!' : 'Salin Tautan Web'}</span>
                </button>

                <a
                  href={LP_SCALEV_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Buka Halaman LP Scalev</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={OFFICIAL_DOMAIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] text-slate-400 hover:text-emerald-700 underline pt-1 font-semibold"
                >
                  Buka Domain Walipintar.my.id
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Volume2, Shield, Clock, Heart, Award, RefreshCw, KeyRound, LogOut } from 'lucide-react';
import { SFX, playAnimalSound, speakText } from '../utils/audio';

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
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Eye, Coffee, Moon } from 'lucide-react';
import { SFX } from '../utils/audio';

interface RestBreakModalProps {
  type: 'break' | 'limit';
  onContinue: () => void;
  lang: 'id' | 'en';
}

export const RestBreakModal: React.FC<RestBreakModalProps> = ({
  type,
  onContinue,
  lang,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(type === 'break' ? 25 : 0);

  useEffect(() => {
    if (type !== 'break') return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          SFX.ding();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [type]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border-4 border-emerald-300">
        <div className="text-6xl mb-3 animate-bounce">
          {type === 'break' ? '🌿' : '🌙'}
        </div>

        <h3 className="text-2xl font-black text-slate-900 mb-2">
          {type === 'break'
            ? lang === 'id'
              ? 'Waktunya Istirahat Mata!'
              : 'Time for an Eye Break!'
            : lang === 'id'
            ? 'Cukup untuk Hari Ini!'
            : 'Daily Play Time Reached!'}
        </h3>

        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          {type === 'break'
            ? lang === 'id'
              ? 'Minum segelas air putih, regangkan tangan dan kakimu, lalu pandanglah benda jauh di luar jendela selama beberapa saat.'
              : 'Drink some water, stretch your arms and legs, and look far out the window for a while.'
            : lang === 'id'
            ? 'Otak dan matamu sudah belajar dan bermain banyak hari ini! Sekarang saatnya menggambar, bermain balok, atau beristirahat.'
            : 'Your brain and eyes have learned and played so much today! Time to play away from the screen.'}
        </p>

        {type === 'break' && secondsLeft > 0 && (
          <div className="text-4xl font-black text-emerald-600 mb-4 tabular-nums flex items-center justify-center gap-2">
            <Eye className="w-6 h-6 text-emerald-500" />
            <span>{secondsLeft} detik</span>
          </div>
        )}

        <button
          onClick={onContinue}
          disabled={type === 'break' && secondsLeft > 0}
          className={`w-full py-3.5 rounded-2xl font-black text-base transition-all shadow-md cursor-pointer ${
            type === 'break' && secondsLeft > 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:translate-y-0.5 text-white'
          }`}
        >
          {type === 'break'
            ? secondsLeft > 0
              ? lang === 'id'
                ? 'Tunggu sebentar ya...'
                : 'Resting...'
              : lang === 'id'
              ? 'Lanjut Main ▶️'
              : 'Continue Playing ▶️'
            : lang === 'id'
            ? 'Kembali ke Beranda 🏠'
            : 'Back to Home 🏠'}
        </button>
      </div>
    </div>
  );
};

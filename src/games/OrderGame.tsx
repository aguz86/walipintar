import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SFX, speakText } from '../utils/audio';

interface OrderGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

const PALETTE = ['#ffd1e3', '#cfe6ff', '#c8f2dc', '#fff3b0', '#e2d6ff', '#ffd9c7'];

export const OrderGame: React.FC<OrderGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  // Max numbers by round per level
  const rounds = level === 0 ? [3, 4, 5] : level === 1 ? [5, 7, 9] : [8, 10, 12];
  const [currentRound, setCurrentRound] = useState(0);
  const [nextExpected, setNextExpected] = useState(1);
  const [numbers, setNumbers] = useState<{ val: number; tapped: boolean; color: string }[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');

  const setupRound = () => {
    const count = rounds[currentRound];
    setNextExpected(1);
    setFeedback('');

    const rawNums = Array.from({ length: count }, (_, i) => i + 1);
    const shuffled = rawNums
      .sort(() => Math.random() - 0.5)
      .map((val, idx) => ({
        val,
        tapped: false,
        color: PALETTE[idx % PALETTE.length],
      }));

    setNumbers(shuffled);
  };

  useEffect(() => {
    setupRound();
  }, [currentRound, level]);

  const handleTap = (val: number) => {
    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    if (val === nextExpected) {
      SFX.bloop();
      const updated = numbers.map((n) => (n.val === val ? { ...n, tapped: true } : n));
      setNumbers(updated);

      const nextVal = nextExpected + 1;
      setNextExpected(nextVal);

      if (nextVal > rounds[currentRound]) {
        SFX.ding();
        const praise = lang === 'id' ? `🌟 Hebat sekali, ${displayName}! Urutan benar!` : `🌟 Awesome, ${displayName}! Perfect!`;
        setFeedback(praise);
        speakText(lang === 'id' ? `Hebat sekali, ${displayName}!` : `Great job, ${displayName}!`, lang);

        setTimeout(() => {
          if (currentRound + 1 >= rounds.length) {
            const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
            onWin(stars, lang === 'id' ? 'Selesai 3 putaran urutan angka!' : 'Completed all 3 rounds!');
          } else {
            setCurrentRound((r) => r + 1);
          }
        }, 800);
      }
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      const wrongText = lang === 'id' ? 'Coba lagi yaa!' : 'Try again!';
      setFeedback(wrongText);
      speakText(wrongText, lang);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2 mb-3 bg-white/90 backdrop-blur-md px-4 rounded-2xl shadow-sm border border-slate-100">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5">
          <span>🔢</span>
          <span>{lang === 'id' ? 'Urutkan Angka' : 'Number Order'}</span>
        </div>

        <div className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl tabular-nums">
          {lang === 'id' ? `Putaran ${currentRound + 1}/3` : `Round ${currentRound + 1}/3`}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-2">
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-black text-slate-800 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>
              {lang === 'id'
                ? `Ketuk angka mulai dari ${nextExpected}!`
                : `Tap number ${nextExpected} next!`}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {lang === 'id'
              ? 'Urutkan dari angka 1 hingga angka paling besar'
              : 'Tap numbers in ascending order from 1'}
          </p>
          <div className="min-h-[2rem] flex items-center justify-center mt-2">
            {feedback && (
              <span className={`text-xs sm:text-sm font-black px-4 py-1 rounded-full shadow-xs ${
                feedback.includes('Coba lagi') || feedback.includes('Try again')
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {feedback}
              </span>
            )}
          </div>
        </div>

        {/* Numbers Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full max-w-md">
          {numbers.map((item) => (
            <button
              key={item.val}
              onClick={() => handleTap(item.val)}
              disabled={item.tapped}
              className={`h-20 sm:h-24 rounded-3xl font-black text-3xl md:text-4xl border-3 flex items-center justify-center shadow-sm transition-all cursor-pointer ${
                item.tapped
                  ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-40 scale-90 cursor-default'
                  : 'hover:scale-105 active:scale-95 border-white text-slate-900'
              }`}
              style={
                !item.tapped
                  ? {
                      backgroundColor: item.color,
                      boxShadow: '0 6px 0 rgba(43,58,85,0.15)',
                    }
                  : undefined
              }
            >
              {item.val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

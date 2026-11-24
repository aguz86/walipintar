import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SFX, speakText, stopSpeaking } from '../utils/audio';

interface OrderGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

const PALETTE = ['#ffd1e3', '#cfe6ff', '#c8f2dc', '#fff3b0', '#e2d6ff', '#ffd9c7'];

const NUMBER_WORDS_ID: Record<number, string> = {
  1: 'Satu',
  2: 'Dua',
  3: 'Tiga',
  4: 'Empat',
  5: 'Lima',
  6: 'Enam',
  7: 'Tujuh',
  8: 'Delapan',
  9: 'Sembilan',
  10: 'Sepuluh',
  11: 'Sebelas',
  12: 'Dua belas',
};

const NUMBER_WORDS_EN: Record<number, string> = {
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
  6: 'Six',
  7: 'Seven',
  8: 'Eight',
  9: 'Nine',
  10: 'Ten',
  11: 'Eleven',
  12: 'Twelve',
};

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
  const [clickedDisplay, setClickedDisplay] = useState<{
    val: number;
    word: string;
    isCorrect: boolean;
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setupRound = () => {
    const count = rounds[currentRound];
    setNextExpected(1);
    setFeedback('');
    setClickedDisplay(null);
    setIsTransitioning(false);

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

  useEffect(() => {
    return () => {
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
      stopSpeaking();
    };
  }, []);

  const getNumberWord = (num: number): string => {
    if (lang === 'id') {
      return NUMBER_WORDS_ID[num] || `${num}`;
    }
    return NUMBER_WORDS_EN[num] || `${num}`;
  };

  const handleTap = (val: number) => {
    if (isTransitioning) return;

    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');
    const numberWord = getNumberWord(val);

    if (val === nextExpected) {
      SFX.bloop();
      const updated = numbers.map((n) => (n.val === val ? { ...n, tapped: true } : n));
      setNumbers(updated);
      setClickedDisplay({ val, word: numberWord, isCorrect: true });

      const nextVal = nextExpected + 1;
      setNextExpected(nextVal);

      if (nextVal > rounds[currentRound]) {
        setIsTransitioning(true);
        SFX.ding();
        const praise =
          lang === 'id'
            ? `🌟 ${numberWord} — Hebat sekali, ${displayName}! Urutan benar!`
            : `🌟 ${numberWord} — Awesome, ${displayName}! Perfect!`;
        setFeedback(praise);

        speakText(
          lang === 'id'
            ? `${numberWord}! Hebat sekali, ${displayName}!`
            : `${numberWord}! Great job, ${displayName}!`,
          lang
        );

        roundTimerRef.current = setTimeout(() => {
          if (currentRound + 1 >= rounds.length) {
            const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
            onWin(stars, lang === 'id' ? 'Selesai 3 putaran urutan angka!' : 'Completed all 3 rounds!');
          } else {
            setCurrentRound((r) => r + 1);
          }
        }, 1400);
      } else {
        setFeedback(`✅ ${numberWord}`);
        speakText(numberWord, lang);
      }
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      setClickedDisplay({ val, word: numberWord, isCorrect: false });
      const wrongText = lang === 'id' ? 'Coba lagi yaa!' : 'Try again!';
      setFeedback(`${numberWord} — ${wrongText}`);
      speakText(`${numberWord}. ${wrongText}`, lang);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-xl mx-auto px-4 py-2">
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

      <div className="flex-1 flex flex-col items-center justify-center gap-5 py-2">
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

          {/* Display clicked number + text */}
          <div className="min-h-[3.25rem] flex items-center justify-center mt-2.5">
            {clickedDisplay ? (
              <div
                className={`inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-2xl shadow-xs border text-xs sm:text-sm font-black transition-all ${
                  !clickedDisplay.isCorrect
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                <span className="text-base sm:text-lg font-black px-2 py-0.5 rounded-xl bg-white/80 text-slate-900">
                  {clickedDisplay.val}
                </span>
                <span>{feedback || `${clickedDisplay.val} — ${clickedDisplay.word}`}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">
                {lang === 'id'
                  ? 'Ketuk angka untuk melihat bacaan angkanya'
                  : 'Tap a number to see its word'}
              </span>
            )}
          </div>
        </div>

        {/* Numbers Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full max-w-md">
          {numbers.map((item) => {
            const wordText = getNumberWord(item.val);
            return (
              <button
                key={item.val}
                type="button"
                onClick={() => handleTap(item.val)}
                disabled={item.tapped || isTransitioning}
                className={`h-20 sm:h-24 rounded-3xl font-black border-3 flex flex-col items-center justify-center shadow-sm transition-all cursor-pointer px-1 ${
                  item.tapped
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 scale-95 cursor-default'
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
                <span className={item.tapped ? 'text-2xl md:text-3xl leading-none' : 'text-3xl md:text-4xl leading-none'}>
                  {item.val}
                </span>
                {item.tapped && (
                  <span className="text-[11px] sm:text-xs font-extrabold text-emerald-700 mt-1 leading-tight">
                    {wordText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

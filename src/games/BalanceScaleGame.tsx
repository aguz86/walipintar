import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import { SFX, speakText, stopSpeaking } from '../utils/audio';

interface BalanceScaleGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

interface ScalePuzzle {
  leftValues: number[];
  rightBase: number;
  needed: number;
  choices: number[];
}

export const BalanceScaleGame: React.FC<BalanceScaleGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const totalQuestions = level === 0 ? 6 : level === 1 ? 7 : 8;

  const [qIndex, setQIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<ScalePuzzle | null>(null);
  const [placedWeight, setPlacedWeight] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildPuzzle = (): ScalePuzzle => {
    let leftValues: number[] = [];
    let leftSum = 0;
    let rightBase = 0;

    if (level === 0) {
      // PAUD: sum 3..6, single number on left + base on right
      leftSum = Math.floor(Math.random() * 4) + 3; // 3..6
      rightBase = Math.floor(Math.random() * (leftSum - 1)) + 1;
      leftValues = [leftSum];
    } else if (level === 1) {
      // Pintar: sum 5..12
      leftSum = Math.floor(Math.random() * 7) + 5; // 5..11
      if (Math.random() < 0.5) {
        const a = Math.floor(Math.random() * (leftSum - 2)) + 2;
        leftValues = [a, leftSum - a];
      } else {
        leftValues = [leftSum];
      }
      rightBase = Math.floor(Math.random() * (leftSum - 1)) + 1;
    } else {
      // Juara: sum 10..20 with two blocks on left
      leftSum = Math.floor(Math.random() * 11) + 10; // 10..20
      const a = Math.floor(Math.random() * (leftSum - 4)) + 3;
      leftValues = [a, leftSum - a];
      rightBase = Math.floor(Math.random() * (leftSum - 3)) + 2;
    }

    const needed = leftSum - rightBase;
    const choiceSet = new Set<number>([needed]);
    const candidates = [needed - 1, needed + 1, needed + 2, needed - 2, needed + 3, 1, 2, 3];
    for (const c of candidates) {
      if (choiceSet.size >= (level === 0 ? 3 : 4)) break;
      if (c > 0 && c !== needed) {
        choiceSet.add(c);
      }
    }

    return {
      leftValues,
      rightBase,
      needed,
      choices: Array.from(choiceSet).sort((a, b) => a - b),
    };
  };

  useEffect(() => {
    setPuzzle(buildPuzzle());
    setPlacedWeight(null);
    setIsLocked(false);
    setFeedback('');
  }, [qIndex, level]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeaking();
    };
  }, []);

  if (!puzzle) return null;

  const leftTotal = puzzle.leftValues.reduce((acc, n) => acc + n, 0);
  const rightTotal = puzzle.rightBase + (placedWeight || 0);
  const diff = rightTotal - leftTotal;
  const isBalanced = diff === 0;

  // Tilt angle: negative leans left (left heavier), positive leans right (right heavier), 0 = balanced!
  const tiltDeg = isBalanced ? 0 : diff < 0 ? -11 : 11;

  const handleSelectWeight = (weight: number) => {
    if (isLocked) return;
    setIsLocked(true);
    setPlacedWeight(weight);
    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    if (puzzle.rightBase + weight === leftTotal) {
      SFX.ding();
      const equationText =
        lang === 'id'
          ? `⚖️ Seimbang! ${puzzle.rightBase} + ${weight} = ${leftTotal}!`
          : `⚖️ Balanced! ${puzzle.rightBase} + ${weight} = ${leftTotal}!`;
      setFeedback(equationText);
      speakText(
        lang === 'id'
          ? `Seimbang! ${puzzle.rightBase} ditambah ${weight} sama dengan ${leftTotal}. Hebat ${displayName}!`
          : `Balanced! ${puzzle.rightBase} plus ${weight} equals ${leftTotal}!`,
        lang
      );

      timerRef.current = setTimeout(() => {
        if (qIndex + 1 >= totalQuestions) {
          const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
          onWin(
            stars,
            lang === 'id'
              ? `Hebat ${displayName}! Semua timbangan seimbang!`
              : `Great job ${displayName}! All scales balanced!`
          );
        } else {
          setQIndex((i) => i + 1);
        }
      }, 1500);
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      const isTooHeavy = puzzle.rightBase + weight > leftTotal;
      const hintText = isTooHeavy
        ? lang === 'id'
          ? `Terlalu berat (${puzzle.rightBase + weight} > ${leftTotal})! Coba angka lebih kecil!`
          : `Too heavy (${puzzle.rightBase + weight} > ${leftTotal})! Try a smaller number!`
        : lang === 'id'
        ? `Masih terlalu ringan (${puzzle.rightBase + weight} < ${leftTotal})! Coba angka lebih besar!`
        : `Still too light (${puzzle.rightBase + weight} < ${leftTotal})! Try a bigger number!`;
      setFeedback(hintText);
      speakText(
        isTooHeavy
          ? lang === 'id'
            ? 'Terlalu berat, coba angka lebih kecil!'
            : 'Too heavy, try smaller!'
          : lang === 'id'
          ? 'Masih kurang berat, coba angka lebih besar!'
          : 'Too light, try bigger!',
        lang
      );

      timerRef.current = setTimeout(() => {
        setIsLocked(false);
      }, 950);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-2xl phone-landscape:max-w-4xl mx-auto px-3 sm:px-4 py-2 phone-landscape:py-1.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2 phone-landscape:py-1.5 mb-2 bg-white/90 backdrop-blur-md px-3.5 sm:px-4 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 phone-landscape:w-8 phone-landscape:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 phone-landscape:w-4 phone-landscape:h-4" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
          <Scale className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="truncate">{lang === 'id' ? 'Timbangan Ajaib' : 'Magic Balance'}</span>
        </div>

        <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
          {qIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col phone-landscape:flex-row items-center justify-center gap-3 sm:gap-5 py-1 w-full">
        {/* Interactive Balance Scale Stage */}
        <div className="w-full max-w-md phone-landscape:flex-1 bg-white rounded-3xl border-3 border-indigo-100 shadow-md p-4 sm:p-5 flex flex-col items-center justify-between">
          {/* Status line (unboxed clean state text + icon) */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black mb-2">
            <span
              className={
                isBalanced
                  ? 'text-emerald-700'
                  : diff < 0
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }
            >
              {isBalanced
                ? lang === 'id'
                  ? '● SEIMBANG SEMPURNA'
                  : '● PERFECTLY BALANCED'
                : diff < 0
                ? lang === 'id'
                  ? `◀ Sisi Kiri Lebih Berat (${leftTotal} vs ${rightTotal})`
                  : `◀ Left Side Heavier (${leftTotal} vs ${rightTotal})`
                : lang === 'id'
                ? `▶ Sisi Kanan Terlalu Berat (${leftTotal} vs ${rightTotal})`
                : `▶ Right Side Too Heavy (${leftTotal} vs ${rightTotal})`}
            </span>
          </div>

          {/* Tilting Scale Beam */}
          <div className="relative w-full max-w-[320px] h-44 sm:h-48 phone-landscape:h-36 flex flex-col items-center justify-end my-1">
            {/* Rotating Beam + Pans */}
            <div
              className="w-full flex items-end justify-between px-2 transition-transform duration-500 ease-out origin-bottom relative z-10"
              style={{ transform: `rotate(${tiltDeg}deg)` }}
            >
              {/* Left Pan */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  {puzzle.leftValues.map((val, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-black text-xl sm:text-2xl shadow-sm tabular-nums min-w-[46px] text-center"
                    >
                      {val}
                    </div>
                  ))}
                </div>
                {level === 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 max-w-[90px] mb-1">
                    {Array.from({ length: leftTotal }).map((_, i) => (
                      <span key={i} className="text-xs leading-none">🍎</span>
                    ))}
                  </div>
                )}
                <div className="w-24 sm:w-28 h-3 bg-slate-700 rounded-b-xl border-t-2 border-slate-500" />
              </div>

              {/* Right Pan */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="px-3 py-2 rounded-xl bg-sky-500 text-white font-black text-xl sm:text-2xl shadow-sm tabular-nums min-w-[46px] text-center">
                    {puzzle.rightBase}
                  </div>
                  <span className="font-black text-slate-400">+</span>
                  <div
                    className={`px-3 py-2 rounded-xl font-black text-xl sm:text-2xl tabular-nums min-w-[46px] text-center border-2 transition-all ${
                      placedWeight !== null
                        ? isBalanced
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                          : 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'bg-amber-50 text-amber-700 border-dashed border-amber-400'
                    }`}
                  >
                    {placedWeight !== null ? placedWeight : '?'}
                  </div>
                </div>
                {level === 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 max-w-[90px] mb-1">
                    {Array.from({ length: rightTotal }).map((_, i) => (
                      <span key={i} className="text-xs leading-none">🍎</span>
                    ))}
                  </div>
                )}
                <div className="w-24 sm:w-28 h-3 bg-slate-700 rounded-b-xl border-t-2 border-slate-500" />
              </div>

              {/* Horizontal Beam Bar connecting pans */}
              <div
                className={`absolute bottom-0 left-8 right-8 h-2.5 rounded-full transition-colors duration-300 -z-10 ${
                  isBalanced ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            </div>

            {/* Center Fulcrum Stand */}
            <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[32px] border-b-indigo-500" />
            <div className="w-28 h-3 bg-slate-800 rounded-full" />
          </div>

          <div className="text-xs text-slate-500 font-semibold mt-1 tabular-nums">
            {puzzle.leftValues.join(' + ')} = {puzzle.rightBase} + {placedWeight ?? '?'}
          </div>
        </div>

        {/* Question & Weight Choices */}
        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-sm phone-landscape:flex-1">
          <h2 className="text-base sm:text-xl font-black text-slate-900 text-center">
            {lang === 'id'
              ? 'Pilih beban angka supaya seimbang!'
              : 'Pick a number weight to balance the scale!'}
          </h2>

          <div className="min-h-[2.25rem] flex items-center justify-center px-2">
            {feedback && (
              <span
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black text-center animate-scale-up ${
                  isBalanced
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {feedback}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {puzzle.choices.map((val) => {
              const isSelected = placedWeight === val;
              let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs';
              if (isSelected) {
                btnClass =
                  puzzle.rightBase + val === leftTotal
                    ? 'bg-emerald-400 text-emerald-950 border-emerald-500 scale-105'
                    : 'bg-rose-200 text-rose-950 border-rose-400 animate-shake';
              }

              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectWeight(val)}
                  disabled={isLocked}
                  className={`py-4 phone-landscape:py-3 rounded-2xl border-3 font-black text-2xl sm:text-3xl tabular-nums transition-all cursor-pointer active:scale-95 ${btnClass}`}
                >
                  +{val}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

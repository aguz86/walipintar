import React, { useState, useEffect } from 'react';
import { ArrowLeft, Swords, Heart } from 'lucide-react';
import { SFX, speakText } from '../utils/audio';

interface MonsterGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

interface MathQuestion {
  questionStr: string;
  answer: number;
  options: number[];
}

export const MonsterGame: React.FC<MonsterGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const maxMonsterHp = level === 0 ? 3 : level === 1 ? 4 : 5;
  const [monsterHp, setMonsterHp] = useState(maxMonsterHp);
  const [currentQ, setCurrentQ] = useState<MathQuestion | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [heroEffect, setHeroEffect] = useState<'idle' | 'attack'>('idle');
  const [monsterEffect, setMonsterEffect] = useState<'idle' | 'hit' | 'heal'>('idle');
  const [feedback, setFeedback] = useState('');

  const generateEquation = (): MathQuestion => {
    const isAdd = level <= 1 || Math.random() < 0.6;
    let a = level === 0 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 12) + 2;
    let b = level === 0 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 8) + 1;
    let ans = isAdd ? a + b : a - b;

    if (!isAdd && a < b) {
      const temp = a;
      a = b;
      b = temp;
      ans = a - b;
    }

    const distractors = [ans - 1, ans + 1, ans + 2, ans - 2].filter((n) => n >= 0 && n !== ans);
    const chosenDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [ans, ...chosenDistractors].sort(() => Math.random() - 0.5);

    return {
      questionStr: `${a} ${isAdd ? '+' : '−'} ${b} = ?`,
      answer: ans,
      options: allOptions,
    };
  };

  useEffect(() => {
    setCurrentQ(generateEquation());
  }, [monsterHp]);

  const handleAnswer = (val: number) => {
    if (isLocked || !currentQ) return;
    setIsLocked(true);
    setSelectedOpt(val);

    if (val === currentQ.answer) {
      // HERO ATTACKS MONSTER!
      SFX.hit();
      setHeroEffect('attack');
      setMonsterEffect('hit');

      const displayName = playerName?.trim() || (lang === 'id' ? 'Pahlawan' : 'Hero');
      const praise = lang === 'id' ? `⚔️ Hebat sekali, ${displayName}! Serangan tepat!` : `⚔️ Awesome, ${displayName}! Direct hit!`;
      setFeedback(praise);
      speakText(lang === 'id' ? `Hebat sekali, ${displayName}!` : `Great strike, ${displayName}!`, lang);

      const nextHp = monsterHp - 1;
      setTimeout(() => {
        setHeroEffect('idle');
        setMonsterEffect('idle');
        setIsLocked(false);
        setSelectedOpt(null);
        setMonsterHp(nextHp);

        if (nextHp <= 0) {
          SFX.fanfare();
          onWin(3, lang === 'id' ? `Monster berhasil dikalahkan oleh ${displayName}!` : 'Monster defeated!');
        }
      }, 750);
    } else {
      // WRONG: MONSTER HEALS!
      SFX.heal();
      setMonsterEffect('heal');
      const wrongText = lang === 'id' ? 'Coba lagi yaa!' : 'Try again!';
      setFeedback(`💚 ${wrongText}`);
      speakText(wrongText, lang);

      const nextHp = Math.min(maxMonsterHp, monsterHp + 1);
      setTimeout(() => {
        setMonsterEffect('idle');
        setIsLocked(false);
        setSelectedOpt(null);
        setMonsterHp(nextHp);
      }, 800);
    }
  };

  if (!currentQ) return null;

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2">
      {/* Top HUD */}
      <div className="flex items-center justify-between gap-2 py-2 mb-3 bg-white/90 backdrop-blur-md px-4 rounded-2xl shadow-sm border border-slate-100">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5">
          <Swords className="w-5 h-5 text-indigo-600" />
          <span>{lang === 'id' ? 'Pahlawan vs Monster' : 'Hero vs Monster'}</span>
        </div>

        {/* Monster HP Hearts */}
        <div className="flex items-center gap-1" aria-label={`Nyawa Monster: ${monsterHp}`}>
          <span className="text-xs font-black mr-1">👾</span>
          {[...Array(maxMonsterHp)].map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 ${
                i < monsterHp ? 'text-rose-500 fill-rose-500' : 'text-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Arena View */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-2">
        {/* Battle Arena */}
        <div className="w-full max-w-md bg-gradient-to-b from-purple-100 to-indigo-50 border-4 border-indigo-200 rounded-3xl p-6 shadow-md flex items-center justify-around relative overflow-hidden">
          {/* Hero */}
          <div
            className={`flex flex-col items-center transition-transform ${
              heroEffect === 'attack' ? 'scale-125 translate-x-4' : ''
            }`}
          >
            <div className="text-6xl md:text-7xl">🦸</div>
            <span className="text-xs font-black text-indigo-900 mt-1">
              {playerName || (lang === 'id' ? 'Pahlawan' : 'Hero')}
            </span>
          </div>

          <div className="text-3xl font-black text-indigo-400">⚔️</div>

          {/* Monster */}
          <div
            className={`flex flex-col items-center transition-transform ${
              monsterEffect === 'hit'
                ? 'animate-shake scale-90 opacity-80'
                : monsterEffect === 'heal'
                ? 'animate-pulse scale-110'
                : ''
            }`}
          >
            <div className="text-6xl md:text-7xl">👾</div>
            <span className="text-xs font-black text-purple-900 mt-1">
              {lang === 'id' ? 'Monster Angka' : 'Math Monster'}
            </span>
          </div>
        </div>

        {/* Math Question */}
        <div className="text-center">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
            {lang === 'id' ? 'Jawab benar untuk menyerang!' : 'Answer correctly to strike!'}
          </div>
          <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-wider bg-white py-3 px-8 rounded-2xl shadow-sm border-2 border-slate-200 inline-block">
            {currentQ.questionStr}
          </div>
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

        {/* Choices */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {currentQ.options.map((opt) => {
            const isSelected = selectedOpt === opt;
            let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm';

            if (isSelected) {
              if (opt === currentQ.answer) {
                btnClass = 'bg-emerald-400 text-emerald-950 border-emerald-500 scale-105';
              } else {
                btnClass = 'bg-rose-300 text-rose-950 border-rose-400 animate-shake';
              }
            }

            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isLocked}
                className={`py-4 rounded-2xl border-3 font-black text-2xl md:text-3xl transition-all cursor-pointer active:scale-95 ${btnClass}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

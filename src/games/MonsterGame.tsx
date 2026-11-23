import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Swords, Shield, Sparkles, Trophy, RotateCcw, Zap } from 'lucide-react';
import { SFX, speakText, stopSpeaking } from '../utils/audio';

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
  const maxHeroHp = 3;
  const maxMonsterHp = level === 0 ? 3 : level === 1 ? 4 : 5;
  const heroName = playerName?.trim() || (lang === 'id' ? 'Kamu' : 'Hero');

  const [heroHp, setHeroHp] = useState(maxHeroHp);
  const [monsterHp, setMonsterHp] = useState(maxMonsterHp);
  const [turnIndex, setTurnIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentQ, setCurrentQ] = useState<MathQuestion | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [heroEffect, setHeroEffect] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [monsterEffect, setMonsterEffect] = useState<'idle' | 'attack' | 'hit' | 'win' | 'lose'>('idle');
  const [floatingHeroBadge, setFloatingHeroBadge] = useState<string | null>(null);
  const [floatingMonsterBadge, setFloatingMonsterBadge] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [battleOutcome, setBattleOutcome] = useState<'playing' | 'hero_won' | 'monster_won'>('playing');

  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winProceedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroHpRef = useRef(maxHeroHp);
  heroHpRef.current = heroHp;

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
  }, [turnIndex, level]);

  useEffect(() => {
    return () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      if (winProceedTimerRef.current) clearTimeout(winProceedTimerRef.current);
      stopSpeaking();
    };
  }, []);

  const handleRestartBattle = () => {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    if (winProceedTimerRef.current) clearTimeout(winProceedTimerRef.current);
    stopSpeaking();
    SFX.bloop();
    setHeroHp(maxHeroHp);
    setMonsterHp(maxMonsterHp);
    setStreak(0);
    setSelectedOpt(null);
    setIsLocked(false);
    setHeroEffect('idle');
    setMonsterEffect('idle');
    setFloatingHeroBadge(null);
    setFloatingMonsterBadge(null);
    setFeedback('');
    setBattleOutcome('playing');
    setTurnIndex((t) => t + 1);
  };

  const finishVictory = (remainingHeroHp: number) => {
    if (winProceedTimerRef.current) clearTimeout(winProceedTimerRef.current);
    const stars = remainingHeroHp >= maxHeroHp ? 3 : remainingHeroHp >= 2 ? 2 : 1;
    onWin(
      stars,
      lang === 'id'
        ? `Hore! Pahlawan ${heroName} menang melawan Monster!`
        : `Hooray! Hero ${heroName} defeated the Monster!`
    );
  };

  const handleAnswer = (val: number) => {
    if (isLocked || !currentQ || battleOutcome !== 'playing') return;
    setIsLocked(true);
    setSelectedOpt(val);

    if (val === currentQ.answer) {
      // HERO ATTACKS MONSTER!
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      SFX.hit();
      setHeroEffect('attack');
      setMonsterEffect('hit');
      setFloatingMonsterBadge('-1 HP 💥');
      setFloatingHeroBadge(nextStreak >= 2 ? `🔥 Combo x${nextStreak}!` : '⚔️ Serang!');

      const nextMonsterHp = Math.max(0, monsterHp - 1);
      setMonsterHp(nextMonsterHp);

      if (nextMonsterHp <= 0) {
        const winText =
          lang === 'id'
            ? `🎉 Hore! Pahlawan ${heroName} menang!`
            : `🎉 Hooray! Hero ${heroName} wins!`;
        setFeedback(winText);
        SFX.fanfare();
        speakText(
          lang === 'id' ? `Hore! Pahlawan ${heroName} menang!` : `Hooray! Hero ${heroName} wins!`,
          lang
        );

        actionTimerRef.current = setTimeout(() => {
          setHeroEffect('win');
          setMonsterEffect('lose');
          setFloatingMonsterBadge('K.O. 💫');
          setFloatingHeroBadge('🏆 JUARA!');
          setBattleOutcome('hero_won');
        }, 550);

        winProceedTimerRef.current = setTimeout(() => {
          finishVictory(heroHpRef.current);
        }, 2800);
      } else {
        const praise =
          lang === 'id'
            ? `⚔️ Tepat sekali, Pahlawan ${heroName}! Monster kena serangan!`
            : `⚔️ Direct hit, Hero ${heroName}!`;
        setFeedback(praise);
        speakText(
          lang === 'id' ? `Serangan tepat, ${heroName}!` : `Great strike, ${heroName}!`,
          lang
        );

        actionTimerRef.current = setTimeout(() => {
          setHeroEffect('idle');
          setMonsterEffect('idle');
          setFloatingHeroBadge(null);
          setFloatingMonsterBadge(null);
          setSelectedOpt(null);
          setIsLocked(false);
          setTurnIndex((t) => t + 1);
        }, 750);
      }
    } else {
      // WRONG: MONSTER COUNTER-ATTACKS HERO!
      setStreak(0);
      SFX.no();
      setMonsterEffect('attack');
      setHeroEffect('hit');
      setFloatingHeroBadge('-1 HP 💢');
      setFloatingMonsterBadge('👾 Serang Balik!');

      const nextHeroHp = Math.max(0, heroHp - 1);
      setHeroHp(nextHeroHp);

      if (nextHeroHp <= 0) {
        const loseText =
          lang === 'id'
            ? `😜 Sorry yeee ${heroName}, monster menang!`
            : `😜 Sorry ${heroName}, the monster wins!`;
        setFeedback(loseText);
        speakText(
          lang === 'id' ? `Sorry yeee ${heroName}, monster menang!` : `Sorry ${heroName}, monster wins!`,
          lang
        );

        actionTimerRef.current = setTimeout(() => {
          setHeroEffect('lose');
          setMonsterEffect('win');
          setFloatingHeroBadge('😵 Kalah...');
          setFloatingMonsterBadge('👑 MENANG!');
          setBattleOutcome('monster_won');
        }, 550);
      } else {
        const hurtText =
          lang === 'id'
            ? `💢 Awas ${heroName}, Monster membalas! Nyawa tinggal ${nextHeroHp}!`
            : `💢 Watch out ${heroName}! Hero HP left: ${nextHeroHp}!`;
        setFeedback(hurtText);
        speakText(
          lang === 'id' ? `Awas ${heroName}, coba lagi yaa!` : `Watch out ${heroName}, try again!`,
          lang
        );

        actionTimerRef.current = setTimeout(() => {
          setHeroEffect('idle');
          setMonsterEffect('idle');
          setFloatingHeroBadge(null);
          setFloatingMonsterBadge(null);
          setSelectedOpt(null);
          setIsLocked(false);
          setTurnIndex((t) => t + 1);
        }, 900);
      }
    }
  };

  if (!currentQ) return null;

  const heroHpPct = (heroHp / maxHeroHp) * 100;
  const monsterHpPct = (monsterHp / maxMonsterHp) * 100;

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-xl phone-landscape:max-w-4xl mx-auto px-3 sm:px-4 py-2 phone-landscape:py-1.5">
      {/* Top HUD */}
      <div className="flex items-center justify-between gap-2 py-2 phone-landscape:py-1.5 mb-2 sm:mb-3 bg-white/90 backdrop-blur-md px-3.5 sm:px-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 phone-landscape:w-8 phone-landscape:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 phone-landscape:w-4 phone-landscape:h-4" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
          <Swords className="w-5 h-5 text-indigo-600 shrink-0" />
          <span className="truncate">{lang === 'id' ? 'Pahlawan vs Monster' : 'Hero vs Monster'}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl text-xs font-black text-indigo-800 shrink-0 tabular-nums">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          <span>{streak >= 2 ? `Combo x${streak}` : `Lv.${level + 1}`}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col phone-landscape:flex-row items-center justify-center gap-3 sm:gap-4 phone-landscape:gap-5 py-1 w-full">
        {/* Battle Arena Card */}
        <div className="w-full max-w-md phone-landscape:flex-1 bg-gradient-to-b from-indigo-100 via-purple-50 to-white border-4 border-indigo-200 rounded-3xl p-4 sm:p-5 phone-landscape:p-3.5 shadow-md relative overflow-hidden">
          {/* Celebratory Background Sparkles on Hero Win */}
          {battleOutcome === 'hero_won' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-around opacity-80 animate-pulse">
              <span className="text-3xl -translate-y-8">🎊</span>
              <span className="text-3xl translate-y-6">✨</span>
              <span className="text-3xl -translate-y-6">🎉</span>
            </div>
          )}

          {/* Fighters Row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 relative z-10">
            {/* HERO SIDE */}
            <div className="flex flex-col items-center">
              <div className="min-h-[1.5rem] mb-1 flex items-center justify-center">
                {floatingHeroBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-300 text-amber-950 shadow-xs animate-scale-up whitespace-nowrap">
                    {floatingHeroBadge}
                  </span>
                )}
              </div>

              <div
                className={`text-5xl sm:text-6xl phone-landscape:text-5xl transition-all duration-300 select-none ${
                  heroEffect === 'attack'
                    ? 'scale-125 translate-x-5 rotate-6'
                    : heroEffect === 'hit'
                    ? 'animate-shake scale-90 brightness-75'
                    : heroEffect === 'win'
                    ? 'scale-125 animate-bounce'
                    : heroEffect === 'lose'
                    ? 'scale-90 opacity-60 grayscale'
                    : ''
                }`}
              >
                {heroEffect === 'lose' ? '😵' : heroEffect === 'win' ? '🦸🏆' : '🦸'}
              </div>

              <span className="text-xs sm:text-sm font-black text-indigo-950 mt-1.5 truncate max-w-full px-1">
                {lang === 'id' ? `Pahlawan ${heroName}` : `Hero ${heroName}`}
              </span>

              {/* Hero HP Bar */}
              <div className="w-full max-w-[130px] mt-1.5 bg-white/90 p-1.5 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-black mb-1">
                  <span className="flex items-center gap-0.5 text-emerald-700">
                    <Shield className="w-3 h-3 fill-emerald-500 text-emerald-600" />
                    NYAWA
                  </span>
                  <span className="tabular-nums text-slate-700">
                    {heroHp}/{maxHeroHp}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      heroHpPct > 60
                        ? 'bg-emerald-500'
                        : heroHpPct > 30
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${heroHpPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* VS Center */}
            <div className="flex flex-col items-center justify-center px-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border-2 border-indigo-200 shadow-xs flex items-center justify-center text-lg sm:text-xl font-black text-indigo-600">
                VS
              </div>
            </div>

            {/* MONSTER SIDE */}
            <div className="flex flex-col items-center">
              <div className="min-h-[1.5rem] mb-1 flex items-center justify-center">
                {floatingMonsterBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-rose-500 text-white shadow-xs animate-scale-up whitespace-nowrap">
                    {floatingMonsterBadge}
                  </span>
                )}
              </div>

              <div
                className={`text-5xl sm:text-6xl phone-landscape:text-5xl transition-all duration-300 select-none ${
                  monsterEffect === 'attack'
                    ? 'scale-125 -translate-x-5 -rotate-6'
                    : monsterEffect === 'hit'
                    ? 'animate-shake scale-90 opacity-75'
                    : monsterEffect === 'win'
                    ? 'scale-125 animate-bounce'
                    : monsterEffect === 'lose'
                    ? 'scale-75 opacity-45 rotate-12 grayscale'
                    : ''
                }`}
              >
                {monsterEffect === 'lose' ? '💫' : monsterEffect === 'win' ? '👾👑' : '👾'}
              </div>

              <span className="text-xs sm:text-sm font-black text-purple-950 mt-1.5 truncate max-w-full px-1">
                {lang === 'id' ? 'Monster Angka' : 'Math Monster'}
              </span>

              {/* Monster HP Bar */}
              <div className="w-full max-w-[130px] mt-1.5 bg-white/90 p-1.5 rounded-xl border border-purple-100 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-black mb-1">
                  <span className="text-rose-700">👾 HP</span>
                  <span className="tabular-nums text-slate-700">
                    {monsterHp}/{maxMonsterHp}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${monsterHpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Battle End Banner inside Arena */}
          {battleOutcome === 'hero_won' && (
            <div className="mt-4 bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 border-2 border-amber-400 rounded-2xl p-3 sm:p-4 text-center shadow-md animate-scale-up relative z-10">
              <div className="flex items-center justify-center gap-1.5 text-lg sm:text-xl font-black text-amber-950">
                <Trophy className="w-6 h-6 text-amber-700" />
                <span>
                  {lang === 'id'
                    ? `Hore! Pahlawan ${heroName} Menang!`
                    : `Hooray! Hero ${heroName} Wins!`}
                </span>
                <Sparkles className="w-5 h-5 text-emerald-700" />
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {lang === 'id'
                  ? 'Monster angka berhasil dikalahkan! Menuju hadiah bintang...'
                  : 'Math Monster defeated! Collecting your stars...'}
              </p>
              <button
                type="button"
                onClick={() => finishVictory(heroHp)}
                className="mt-2.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                {lang === 'id' ? '⭐ Ambil Hadiah Bintang!' : '⭐ Claim Stars!'}
              </button>
            </div>
          )}

          {battleOutcome === 'monster_won' && (
            <div className="mt-4 bg-gradient-to-r from-rose-100 via-orange-50 to-purple-100 border-2 border-rose-300 rounded-2xl p-3 sm:p-4 text-center shadow-md animate-scale-up relative z-10">
              <div className="text-lg sm:text-xl font-black text-rose-800">
                {lang === 'id'
                  ? `😜 Sorry yeee ${heroName}, Monster Menang!`
                  : `😜 Sorry ${heroName}, Monster Wins!`}
              </div>
              <p className="text-xs font-bold text-slate-600 mt-1">
                {lang === 'id'
                  ? 'Nyawa pahlawan habis! Ayo bangkit dan balas monster lagi!'
                  : 'Hero HP ran out! Rise up and challenge the monster again!'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleRestartBattle}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Tantang Lagi!' : 'Fight Again!'}</span>
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-black text-xs sm:text-sm cursor-pointer active:scale-95 transition-all"
                >
                  {lang === 'id' ? 'Menu' : 'Menu'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Question & Choices Panel (Hidden when battle ended so celebration/defeat card shines) */}
        {battleOutcome === 'playing' && (
          <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3 w-full max-w-md phone-landscape:flex-1 phone-landscape:max-w-sm">
            {/* Math Question */}
            <div className="text-center w-full">
              <div className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                {lang === 'id'
                  ? 'Jawab benar = Serang! Salah = Kena serang!'
                  : 'Right = Attack! Wrong = Get hit!'}
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl phone-landscape:text-3xl font-black text-slate-900 tracking-wider bg-white py-2.5 sm:py-3 px-6 sm:px-8 rounded-2xl shadow-sm border-2 border-slate-200 inline-block">
                {currentQ.questionStr}
              </div>
              <div className="min-h-[2rem] flex items-center justify-center mt-2">
                {feedback && (
                  <span
                    className={`text-xs sm:text-sm font-black px-3.5 py-1 rounded-full shadow-xs text-center ${
                      feedback.includes('Awas') ||
                      feedback.includes('Watch out') ||
                      feedback.includes('Sorry') ||
                      feedback.includes('Monster menang')
                        ? 'bg-rose-100 text-rose-700 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {feedback}
                  </span>
                )}
              </div>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-sm">
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
                    type="button"
                    onClick={() => handleAnswer(opt)}
                    disabled={isLocked}
                    className={`py-3.5 sm:py-4 phone-landscape:py-2.5 rounded-2xl border-3 font-black text-2xl sm:text-3xl phone-landscape:text-2xl transition-all cursor-pointer active:scale-95 ${btnClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

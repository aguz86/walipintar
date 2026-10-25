import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowLeft, Heart, Star, Sparkles } from 'lucide-react';
import { ANIMALS, GameItem } from '../data/items';
import { ItemIcon } from '../components/ItemIcon';
import { SFX, playAnimalSound, speakText, hasAnimalSound } from '../utils/audio';

interface AnimalSoundGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  playerName: string;
  level: number; // 0 = Si Kecil, 1 = Pintar, 2 = Juara
  onWin: (stars: number, scoreText: string) => void;
}

export const AnimalSoundGame: React.FC<AnimalSoundGameProps> = ({
  onBack,
  lang,
  playerName,
  level,
  onWin,
}) => {
  // Candidate pool of animals that have sound generators
  const soundAnimals = ANIMALS.filter((a) => hasAnimalSound(a.emoji));

  // Config per level
  const totalRounds = level === 0 ? 6 : level === 1 ? 8 : 10;
  const numOptions = level === 0 ? 3 : 4;
  const showTextLabels = level <= 1;

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentAnimal, setCurrentAnimal] = useState<GameItem>(() => soundAnimals[0]);
  const [options, setOptions] = useState<GameItem[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const lastAnimalRef = useRef<string>('');

  const setupRound = () => {
    setIsLocked(false);
    setSelectedOption(null);
    setIsAnswerCorrect(null);
    setFeedbackText('');

    // Pick a new animal different from last one
    const pool = soundAnimals.filter((a) => a.nameId !== lastAnimalRef.current);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || soundAnimals[0];
    lastAnimalRef.current = chosen.nameId;
    setCurrentAnimal(chosen);

    // Pick distractors
    const otherAnimals = ANIMALS.filter((a) => a.nameId !== chosen.nameId)
      .sort(() => Math.random() - 0.5)
      .slice(0, numOptions - 1);

    const roundOptions = [chosen, ...otherAnimals].sort(() => Math.random() - 0.5);
    setOptions(roundOptions);

    // Automatically trigger the sound for kids
    setTimeout(() => {
      playSound(chosen);
    }, 450);
  };

  useEffect(() => {
    setupRound();
  }, [round]);

  const playSound = (animal = currentAnimal) => {
    setIsPlayingAudio(true);
    speakText(
      lang === 'id' ? 'Dengarkan baik-baik, suara hewan apa ini?' : 'Listen carefully, which animal is this?',
      lang,
      () => {
        playAnimalSound(animal.emoji, () => {
          setIsPlayingAudio(false);
        });
      }
    );
  };

  const handleSelectOption = (item: GameItem) => {
    if (isLocked) return;
    setIsLocked(true);
    setSelectedOption(item.nameId);

    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    if (item.nameId === currentAnimal.nameId) {
      // Correct!
      setIsAnswerCorrect(true);
      setScore((s) => s + 10);
      SFX.ding();

      const praise =
        lang === 'id'
          ? `🌟 Hebat sekali, ${displayName}! Jawabanmu benar, ini suara ${currentAnimal.nameId}!`
          : `🌟 Awesome, ${displayName}! Correct, this is a ${currentAnimal.nameEn}!`;
      setFeedbackText(praise);

      setTimeout(() => {
        playAnimalSound(currentAnimal.emoji, () => {
          speakText(praise, lang, () => {
            if (round + 1 >= totalRounds) {
              const stars = lives >= 3 ? 3 : lives >= 2 ? 2 : 1;
              onWin(stars, `${score + 10} poin · ${round + 1}/${totalRounds} soal`);
            } else {
              setRound((r) => r + 1);
            }
          });
        });
      }, 350);
    } else {
      // Wrong!
      setIsAnswerCorrect(false);
      SFX.no();
      const newLives = lives - 1;
      setLives(newLives);

      const wrongText = lang === 'id' ? 'Coba lagi yaa!' : 'Try again!';
      setFeedbackText(wrongText);

      speakText(
        wrongText,
        lang,
        () => {
          if (newLives <= 0) {
            onWin(1, `${score} poin · ${lang === 'id' ? 'Coba lagi yaa!' : 'Try again!'}`);
          } else {
            setIsLocked(false);
            setSelectedOption(null);
            setIsAnswerCorrect(null);
          }
        }
      );
    }
  };

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

        {/* Lives */}
        <div className="flex items-center gap-1" aria-label={`Nyawa: ${lives}`}>
          {[...Array(3)].map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 ${
                i < lives ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Progress & Score */}
        <div className="flex items-center gap-2 text-xs font-black text-slate-700">
          <span className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2.5 py-1 rounded-xl">
            <Star className="w-4 h-4 fill-amber-400" />
            <span className="tabular-nums">{score}</span>
          </span>
          <span className="bg-slate-100 px-2 py-1 rounded-xl tabular-nums">
            {round + 1} / {totalRounds}
          </span>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-2">
        {/* Big Interactive Speaker Button */}
        <button
          onClick={() => playSound()}
          disabled={isPlayingAudio}
          className={`w-36 h-36 md:w-44 md:h-44 rounded-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-xl border-4 border-white transition-all cursor-pointer active:scale-95 ${
            isPlayingAudio ? 'animate-pulse ring-8 ring-amber-300/60' : 'hover:scale-105 ring-4 ring-amber-200'
          }`}
          aria-label="Dengarkan Suara Hewan"
        >
          <Volume2 className="w-16 h-16 md:w-20 md:h-20 drop-shadow-sm" />
          <span className="text-xs md:text-sm font-black mt-1 text-center tracking-wide leading-tight">
            {isPlayingAudio
              ? lang === 'id'
                ? 'Mendengarkan...'
                : 'Listening...'
              : lang === 'id'
              ? 'Ketuk untuk Dengar 🔊'
              : 'Tap to Hear 🔊'}
          </span>
        </button>

        {/* Feedback message banner */}
        <div className="min-h-[2.5rem] flex items-center justify-center px-2 w-full">
          {feedbackText ? (
            <div
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black animate-scale-up shadow-xs text-center ${
                feedbackText.includes('Coba lagi') || feedbackText.includes('Try again')
                  ? 'bg-rose-100 text-rose-700 border-2 border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
              }`}
            >
              {feedbackText}
            </div>
          ) : (
            <p className="text-xs sm:text-sm md:text-base font-bold text-slate-700 text-center flex items-center gap-1.5 bg-white/70 px-4 py-1.5 rounded-full shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {lang === 'id'
                  ? 'Hewan mana yang menghasilkan suara tadi?'
                  : 'Which animal made that sound?'}
              </span>
            </p>
          )}
        </div>

        {/* Choices Grid */}
        <div
          className={`w-full grid gap-3 max-w-md ${
            numOptions === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-2'
          }`}
        >
          {options.map((item, idx) => {
            const isSelected = selectedOption === item.nameId;
            let buttonStyle = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm';

            if (isSelected) {
              if (isAnswerCorrect) {
                buttonStyle = 'bg-emerald-400 text-emerald-950 border-emerald-500 ring-4 ring-emerald-300 scale-105 animate-bounce';
              } else {
                buttonStyle = 'bg-rose-300 text-rose-950 border-rose-400 animate-shake';
              }
            }

            return (
              <button
                key={`${item.nameId}-${idx}`}
                onClick={() => handleSelectOption(item)}
                disabled={isLocked}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl border-3 transition-all cursor-pointer active:scale-95 min-h-[110px] md:min-h-[130px] ${buttonStyle}`}
              >
                <div className="text-5xl md:text-6xl mb-1.5 transition-transform">
                  <ItemIcon
                    name={item.nameId}
                    emoji={item.emoji}
                    category="animals"
                    size="4rem"
                  />
                </div>
                {showTextLabels && (
                  <span className="text-sm md:text-base font-black truncate w-full text-center">
                    {lang === 'id' ? item.nameId : item.nameEn}
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

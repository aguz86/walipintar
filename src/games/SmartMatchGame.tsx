import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { SFX, speakText, stopSpeaking } from '../utils/audio';

interface SmartMatchGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

interface MatchPair {
  id: string;
  leftEmoji: string;
  leftId: string;
  leftEn: string;
  rightEmoji: string;
  rightId: string;
  rightEn: string;
  phraseId: string;
  phraseEn: string;
  minLevel: number;
}

const MATCH_POOL: MatchPair[] = [
  // Level 0+ (Animals & Food / Weather / Nature)
  {
    id: 'monkey_banana',
    leftEmoji: '🐒',
    leftId: 'Monyet',
    leftEn: 'Monkey',
    rightEmoji: '🍌',
    rightId: 'Pisang',
    rightEn: 'Banana',
    phraseId: 'Monyet suka makan pisang!',
    phraseEn: 'Monkeys love eating bananas!',
    minLevel: 0,
  },
  {
    id: 'rabbit_carrot',
    leftEmoji: '🐰',
    leftId: 'Kelinci',
    leftEn: 'Rabbit',
    rightEmoji: '🥕',
    rightId: 'Wortel',
    rightEn: 'Carrot',
    phraseId: 'Kelinci makan wortel segar!',
    phraseEn: 'Rabbits eat fresh carrots!',
    minLevel: 0,
  },
  {
    id: 'bee_flower',
    leftEmoji: '🐝',
    leftId: 'Lebah',
    leftEn: 'Bee',
    rightEmoji: '🌻',
    rightId: 'Bunga',
    rightEn: 'Flower',
    phraseId: 'Lebah menghisap madu bunga!',
    phraseEn: 'Bees collect nectar from flowers!',
    minLevel: 0,
  },
  {
    id: 'cat_fish',
    leftEmoji: '🐱',
    leftId: 'Kucing',
    leftEn: 'Cat',
    rightEmoji: '🐟',
    rightId: 'Ikan',
    rightEn: 'Fish',
    phraseId: 'Kucing suka makan ikan!',
    phraseEn: 'Cats love eating fish!',
    minLevel: 0,
  },
  {
    id: 'rain_umbrella',
    leftEmoji: '🌧️',
    leftId: 'Hujan',
    leftEn: 'Rain',
    rightEmoji: '☂️',
    rightId: 'Payung',
    rightEn: 'Umbrella',
    phraseId: 'Saat hujan kita memakai payung!',
    phraseEn: 'When it rains, we use an umbrella!',
    minLevel: 0,
  },
  {
    id: 'sun_glasses',
    leftEmoji: '☀️',
    leftId: 'Panas Terik',
    leftEn: 'Sunny Day',
    rightEmoji: '🕶️',
    rightId: 'Kacamata',
    rightEn: 'Sunglasses',
    phraseId: 'Cuaca terik memakai kacamata!',
    phraseEn: 'On sunny days we wear sunglasses!',
    minLevel: 0,
  },
  {
    id: 'chicken_egg',
    leftEmoji: '🐔',
    leftId: 'Ayam',
    leftEn: 'Chicken',
    rightEmoji: '🥚',
    rightId: 'Telur',
    rightEn: 'Egg',
    phraseId: 'Ayam bertelur di kandang!',
    phraseEn: 'Chickens lay eggs!',
    minLevel: 0,
  },
  {
    id: 'cow_milk',
    leftEmoji: '🐮',
    leftId: 'Sapi',
    leftEn: 'Cow',
    rightEmoji: '🥛',
    rightId: 'Susu',
    rightEn: 'Milk',
    phraseId: 'Sapi menghasilkan susu sehat!',
    phraseEn: 'Cows give us healthy milk!',
    minLevel: 0,
  },

  // Level 1+ (Professions & Tools / Vehicles & Places)
  {
    id: 'firefighter_truck',
    leftEmoji: '👨‍🚒',
    leftId: 'Pemadam',
    leftEn: 'Firefighter',
    rightEmoji: '🚒',
    rightId: 'Truk Pemadam',
    rightEn: 'Fire Truck',
    phraseId: 'Pemadam mengendarai truk pemadam!',
    phraseEn: 'Firefighters drive fire trucks!',
    minLevel: 1,
  },
  {
    id: 'doctor_stethoscope',
    leftEmoji: '👩‍⚕️',
    leftId: 'Dokter',
    leftEn: 'Doctor',
    rightEmoji: '🩺',
    rightId: 'Stetoskop',
    rightEn: 'Stethoscope',
    phraseId: 'Dokter memeriksa dengan stetoskop!',
    phraseEn: 'Doctors check patients with a stethoscope!',
    minLevel: 1,
  },
  {
    id: 'chef_pan',
    leftEmoji: '👨‍🍳',
    leftId: 'Koki',
    leftEn: 'Chef',
    rightEmoji: '🍳',
    rightId: 'Wajan',
    rightEn: 'Frying Pan',
    phraseId: 'Koki memasak menggunakan wajan!',
    phraseEn: 'Chefs cook using a frying pan!',
    minLevel: 1,
  },
  {
    id: 'pilot_plane',
    leftEmoji: '👨‍✈️',
    leftId: 'Pilot',
    leftEn: 'Pilot',
    rightEmoji: '✈️',
    rightId: 'Pesawat',
    rightEn: 'Airplane',
    phraseId: 'Pilot menerbangkan pesawat terbang!',
    phraseEn: 'Pilots fly airplanes!',
    minLevel: 1,
  },
  {
    id: 'farmer_rice',
    leftEmoji: '👩‍🌾',
    leftId: 'Petani',
    leftEn: 'Farmer',
    rightEmoji: '🌾',
    rightId: 'Padi',
    rightEn: 'Rice Plant',
    phraseId: 'Petani menanam padi di sawah!',
    phraseEn: 'Farmers grow rice in the field!',
    minLevel: 1,
  },
  {
    id: 'night_moon',
    leftEmoji: '🌙',
    leftId: 'Malam Hari',
    leftEn: 'Nighttime',
    rightEmoji: '🛏️',
    rightId: 'Tidur Nyenyak',
    rightEn: 'Bedtime',
    phraseId: 'Malam hari waktunya tidur nyenyak!',
    phraseEn: 'Nighttime is for sleeping!',
    minLevel: 1,
  },

  // Level 2 (Math & Bilingual Knowledge)
  {
    id: 'math_5',
    leftEmoji: '🧮',
    leftId: '2 + 3',
    leftEn: '2 + 3',
    rightEmoji: '🍎',
    rightId: 'Lima (5)',
    rightEn: 'Five (5)',
    phraseId: 'Dua tambah tiga sama dengan lima!',
    phraseEn: 'Two plus three equals five!',
    minLevel: 2,
  },
  {
    id: 'math_7',
    leftEmoji: '🧮',
    leftId: '4 + 3',
    leftEn: '4 + 3',
    rightEmoji: '⭐',
    rightId: 'Tujuh (7)',
    rightEn: 'Seven (7)',
    phraseId: 'Empat tambah tiga sama dengan tujuh!',
    phraseEn: 'Four plus three equals seven!',
    minLevel: 2,
  },
  {
    id: 'math_4',
    leftEmoji: '➖',
    leftId: '9 − 5',
    leftEn: '9 − 5',
    rightEmoji: '🍀',
    rightId: 'Empat (4)',
    rightEn: 'Four (4)',
    phraseId: 'Sembilan dikurang lima sama dengan empat!',
    phraseEn: 'Nine minus five equals four!',
    minLevel: 2,
  },
  {
    id: 'en_apple',
    leftEmoji: '🍎',
    leftId: 'Apel',
    leftEn: 'Apple',
    rightEmoji: '🇬🇧',
    rightId: 'Apple',
    rightEn: 'Apel (ID)',
    phraseId: 'Bahasa Inggris apel adalah Apple!',
    phraseEn: 'Apple in Indonesian is Apel!',
    minLevel: 2,
  },
  {
    id: 'en_bird',
    leftEmoji: '🐦',
    leftId: 'Burung',
    leftEn: 'Bird',
    rightEmoji: '🇬🇧',
    rightId: 'Bird',
    rightEn: 'Burung (ID)',
    phraseId: 'Bahasa Inggris burung adalah Bird!',
    phraseEn: 'Bird in Indonesian is Burung!',
    minLevel: 2,
  },
  {
    id: 'earth_recycle',
    leftEmoji: '🌍',
    leftId: 'Bumi Bersih',
    leftEn: 'Clean Earth',
    rightEmoji: '♻️',
    rightId: 'Daur Ulang',
    rightEn: 'Recycle',
    phraseId: 'Daur ulang menjaga bumi tetap bersih!',
    phraseEn: 'Recycling keeps our Earth clean!',
    minLevel: 2,
  },
];

const PAIR_BADGE_COLORS = [
  'bg-emerald-500 text-white',
  'bg-sky-500 text-white',
  'bg-amber-500 text-white',
  'bg-violet-500 text-white',
];

export const SmartMatchGame: React.FC<SmartMatchGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const totalRounds = 3;
  const pairsPerRound = level === 0 ? 3 : 4;

  const [round, setRound] = useState(0);
  const [leftItems, setLeftItems] = useState<MatchPair[]>([]);
  const [rightItems, setRightItems] = useState<MatchPair[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<{ leftId: string; rightId: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isRoundTransitioning, setIsRoundTransitioning] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setupRound = (targetRound: number) => {
    const eligible = MATCH_POOL.filter((p) => p.minLevel <= level);
    const pool = eligible.length >= pairsPerRound ? eligible : MATCH_POOL;
    const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, pairsPerRound);

    setLeftItems(chosen);
    setRightItems([...chosen].sort(() => Math.random() - 0.5));
    setSelectedLeftId(null);
    setMatchedIds([]);
    setWrongPair(null);
    setIsRoundTransitioning(false);
    setFeedback(
      targetRound === 0
        ? lang === 'id'
          ? 'Pilih satu gambar di kiri, lalu ketuk pasangannya di kanan!'
          : 'Tap one item on the left, then tap its match on the right!'
        : ''
    );
  };

  useEffect(() => {
    setRound(0);
    setMistakes(0);
    setupRound(0);
  }, [level]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeaking();
    };
  }, []);

  const handleSelectLeft = (id: string) => {
    if (isRoundTransitioning || matchedIds.includes(id)) return;
    SFX.bloop();
    setSelectedLeftId((prev) => (prev === id ? null : id));
    setWrongPair(null);
  };

  const handleSelectRight = (rightPair: MatchPair) => {
    if (isRoundTransitioning || matchedIds.includes(rightPair.id)) return;
    if (!selectedLeftId) {
      SFX.bloop();
      setFeedback(
        lang === 'id'
          ? 'Pilih dulu satu kartu di sebelah kiri!'
          : 'Pick a card on the left first!'
      );
      return;
    }

    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    if (selectedLeftId === rightPair.id) {
      SFX.ding();
      const nextMatched = [...matchedIds, rightPair.id];
      setMatchedIds(nextMatched);
      setSelectedLeftId(null);
      setWrongPair(null);

      const phrase = lang === 'id' ? rightPair.phraseId : rightPair.phraseEn;
      setFeedback(`🌟 ${phrase}`);
      speakText(phrase, lang);

      if (nextMatched.length >= pairsPerRound) {
        setIsRoundTransitioning(true);
        timerRef.current = setTimeout(() => {
          if (round + 1 >= totalRounds) {
            const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
            onWin(
              stars,
              lang === 'id'
                ? `Hebat ${displayName}! Semua ${totalRounds} putaran cocok!`
                : `Great job ${displayName}! All ${totalRounds} rounds matched!`
            );
          } else {
            const nextRound = round + 1;
            setRound(nextRound);
            setupRound(nextRound);
          }
        }, 1450);
      }
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      setWrongPair({ leftId: selectedLeftId, rightId: rightPair.id });
      const retryText = lang === 'id' ? 'Belum cocok, coba lagi yaa!' : 'Not a match, try again!';
      setFeedback(retryText);
      speakText(retryText, lang);

      timerRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedLeftId(null);
      }, 650);
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
          <span>🔗</span>
          <span className="truncate">{lang === 'id' ? 'Jodoh Pintar' : 'Smart Match'}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-600 tabular-nums">
            {lang === 'id' ? `Putaran ${round + 1}/${totalRounds}` : `Round ${round + 1}/${totalRounds}`}
          </span>
          <button
            type="button"
            onClick={() => setupRound(round)}
            className="w-9 h-9 phone-landscape:w-8 phone-landscape:h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center cursor-pointer"
            aria-label="Acak Ulang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      <div className="min-h-[2.25rem] flex items-center justify-center mb-2 px-2">
        {feedback ? (
          <div
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black text-center animate-scale-up ${
              feedback.includes('Belum') || feedback.includes('Not') || feedback.includes('Pilih dulu') || feedback.includes('Pick a card')
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : feedback.startsWith('🌟')
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-white/80 text-slate-700 border border-slate-200'
            }`}
          >
            {feedback}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {lang === 'id'
                ? `${matchedIds.length} dari ${pairsPerRound} pasangan ditemukan`
                : `${matchedIds.length} of ${pairsPerRound} pairs matched`}
            </span>
          </div>
        )}
      </div>

      {/* 2-Column Matching Board */}
      <div className="flex-1 flex items-center justify-center py-1">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 w-full max-w-xl">
          {/* Left Column */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="text-[11px] font-bold text-slate-500 text-center">
              {lang === 'id' ? '1. Pilih Kartu Kiri' : '1. Pick Left'}
            </div>
            {leftItems.map((pair) => {
              const matchOrder = matchedIds.indexOf(pair.id);
              const isMatched = matchOrder !== -1;
              const isSelected = selectedLeftId === pair.id;
              const isWrong = wrongPair?.leftId === pair.id;

              return (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => handleSelectLeft(pair.id)}
                  disabled={isMatched || isRoundTransitioning}
                  className={`relative min-h-[68px] sm:min-h-[80px] phone-landscape:min-h-[58px] px-3 py-2 rounded-2xl border-2 flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer active:scale-95 text-left ${
                    isMatched
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 opacity-85 cursor-default'
                      : isWrong
                      ? 'bg-rose-100 border-rose-400 text-rose-950 animate-shake'
                      : isSelected
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-md scale-[1.02]'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl phone-landscape:text-2xl shrink-0 leading-none">
                    {pair.leftEmoji}
                  </span>
                  <span className="font-black text-xs sm:text-sm md:text-base leading-tight truncate flex-1">
                    {lang === 'id' ? pair.leftId : pair.leftEn}
                  </span>
                  {isMatched && (
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 tabular-nums ${
                        PAIR_BADGE_COLORS[matchOrder % PAIR_BADGE_COLORS.length]
                      }`}
                    >
                      {matchOrder + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="text-[11px] font-bold text-slate-500 text-center">
              {lang === 'id' ? '2. Cocokkan di Kanan' : '2. Match Right'}
            </div>
            {rightItems.map((pair) => {
              const matchOrder = matchedIds.indexOf(pair.id);
              const isMatched = matchOrder !== -1;
              const isWrong = wrongPair?.rightId === pair.id;

              return (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => handleSelectRight(pair)}
                  disabled={isMatched || isRoundTransitioning}
                  className={`relative min-h-[68px] sm:min-h-[80px] phone-landscape:min-h-[58px] px-3 py-2 rounded-2xl border-2 flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer active:scale-95 text-left ${
                    isMatched
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 opacity-85 cursor-default'
                      : isWrong
                      ? 'bg-rose-100 border-rose-400 text-rose-950 animate-shake'
                      : selectedLeftId
                      ? 'bg-white hover:bg-indigo-50 border-indigo-200 text-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <span className="text-3xl sm:text-4xl phone-landscape:text-2xl shrink-0 leading-none">
                    {pair.rightEmoji}
                  </span>
                  <span className="font-black text-xs sm:text-sm md:text-base leading-tight truncate flex-1">
                    {lang === 'id' ? pair.rightId : pair.rightEn}
                  </span>
                  {isMatched && (
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 tabular-nums ${
                        PAIR_BADGE_COLORS[matchOrder % PAIR_BADGE_COLORS.length]
                      }`}
                    >
                      {matchOrder + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

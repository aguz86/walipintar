import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Clock, Sparkles, BookOpen, Minus, Plus, Gauge } from 'lucide-react';
import {
  ANIMALS,
  FRUITS,
  VEGGIES,
  VEHICLES,
  GameItem,
  AGE_LEVELS,
} from '../data/items';
import { ItemIcon } from '../components/ItemIcon';
import {
  SFX,
  playAnimalSound,
  hasAnimalSound,
  speakText,
  stopSpeaking,
} from '../utils/audio';

interface BubbleGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName?: string;
  onWin: (stars: number, scoreText: string) => void;
}

type BubbleCategory = 'animals' | 'fruits' | 'veggies' | 'vehicles';

interface CategoryMeta {
  id: BubbleCategory;
  emoji: string;
  labelId: string;
  labelEn: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const CATEGORY_META: Record<BubbleCategory, CategoryMeta> = {
  animals: {
    id: 'animals',
    emoji: '🐾',
    labelId: 'Hewan',
    labelEn: 'Animals',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
    badgeBorder: 'border-pink-200',
  },
  fruits: {
    id: 'fruits',
    emoji: '🍎',
    labelId: 'Buah',
    labelEn: 'Fruits',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
  },
  veggies: {
    id: 'veggies',
    emoji: '🥕',
    labelId: 'Sayur',
    labelEn: 'Veggies',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  vehicles: {
    id: 'vehicles',
    emoji: '🚗',
    labelId: 'Kendaraan',
    labelEn: 'Vehicles',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
  },
};

const CATEGORY_ORDER: BubbleCategory[] = ['fruits', 'animals', 'veggies', 'vehicles'];

interface LevelConfig {
  duration: number;
  baseSpeed: number; // % height per 16.67ms frame
  speedVariance: number;
  spawnInterval: number;
  maxBubbles: number;
  bubbleSize: number;
  poolLimit: number;
  starThresholds: [number, number];
}

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  0: {
    duration: 35,
    baseSpeed: 0.12,
    speedVariance: 0.05,
    spawnInterval: 1350,
    maxBubbles: 8,
    bubbleSize: 94,
    poolLimit: 14,
    starThresholds: [10, 5],
  },
  1: {
    duration: 30,
    baseSpeed: 0.2,
    speedVariance: 0.07,
    spawnInterval: 1050,
    maxBubbles: 10,
    bubbleSize: 84,
    poolLimit: 26,
    starThresholds: [14, 8],
  },
  2: {
    duration: 30,
    baseSpeed: 0.28,
    speedVariance: 0.1,
    spawnInterval: 880,
    maxBubbles: 11,
    bubbleSize: 76,
    poolLimit: 42,
    starThresholds: [18, 10],
  },
};

interface Bubble {
  id: number;
  baseX: number;
  x: number;
  y: number;
  speed: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  age: number;
  size: number;
  color: string;
  item: GameItem;
}

interface BurstParticle {
  tx: number;
  ty: number;
  size: number;
  color: string;
  isStar: boolean;
}

interface PopBurst {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  points: number;
  word: string;
  isBonus: boolean;
  particles: BurstParticle[];
}

interface LearnedBanner {
  id: number;
  item: GameItem;
  points: number;
  isBonus: boolean;
}

const BUBBLE_PALETTES = [
  'rgba(255, 209, 227, 0.78)',
  'rgba(207, 230, 255, 0.78)',
  'rgba(200, 242, 220, 0.78)',
  'rgba(255, 243, 176, 0.78)',
  'rgba(226, 214, 255, 0.78)',
  'rgba(255, 217, 199, 0.78)',
];

const BURST_SPARK_COLORS = [
  '#ffffff',
  '#fde047',
  '#fb7185',
  '#38bdf8',
  '#34d399',
  '#fb923c',
  '#c084fc',
];

interface SpeedPreset {
  factor: number;
  emoji: string;
  labelId: string;
  labelEn: string;
}

const SPEED_PRESETS: SpeedPreset[] = [
  { factor: 0.55, emoji: '🐢', labelId: 'Sangat Pelan', labelEn: 'Very Slow' },
  { factor: 0.75, emoji: '🐌', labelId: 'Pelan', labelEn: 'Slow' },
  { factor: 1.0, emoji: '🫧', labelId: 'Normal', labelEn: 'Normal' },
  { factor: 1.3, emoji: '🐇', labelId: 'Cepat', labelEn: 'Fast' },
  { factor: 1.65, emoji: '🚀', labelId: 'Kilat', labelEn: 'Turbo' },
];

const DEFAULT_SPEED_INDEX = 2; // 1.0x Normal

export const BubbleGame: React.FC<BubbleGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const cfg = LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[1];
  const ageMeta = AGE_LEVELS[level] ?? AGE_LEVELS[1];
  const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

  const [score, setScore] = useState(0);
  const [poppedCount, setPoppedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [bursts, setBursts] = useState<PopBurst[]>([]);
  const [bonusCatIdx, setBonusCatIdx] = useState(0);
  const [learnedBanner, setLearnedBanner] = useState<LearnedBanner | null>(null);
  const [cheerToast, setCheerToast] = useState<string | null>(null);
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED_INDEX);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(1);
  const burstIdRef = useRef(1);
  const learnedIdRef = useRef(1);
  const burstTimersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const learnedWordsRef = useRef<Set<string>>(new Set());
  const timeLeftRef = useRef(cfg.duration);
  const bonusCatRef = useRef<BubbleCategory>(CATEGORY_ORDER[0]);
  const speedFactorRef = useRef(SPEED_PRESETS[DEFAULT_SPEED_INDEX].factor);
  const finishedRef = useRef(false);
  const lastSpokenAtRef = useRef(0);
  const onWinRef = useRef(onWin);

  const bonusCategory = CATEGORY_ORDER[bonusCatIdx % CATEGORY_ORDER.length];
  const bonusMeta = CATEGORY_META[bonusCategory];
  const activeSpeed = SPEED_PRESETS[speedIdx] ?? SPEED_PRESETS[DEFAULT_SPEED_INDEX];

  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    bonusCatRef.current = bonusCategory;
  }, [bonusCategory]);

  useEffect(() => {
    speedFactorRef.current = activeSpeed.factor;
  }, [activeSpeed.factor]);

  // Reset game cleanly if level changes
  useEffect(() => {
    finishedRef.current = false;
    scoreRef.current = 0;
    learnedWordsRef.current = new Set();
    timeLeftRef.current = cfg.duration;
    setScore(0);
    setPoppedCount(0);
    setTimeLeft(cfg.duration);
    setBonusCatIdx(0);
    setLearnedBanner(null);
    setCheerToast(null);
  }, [level, cfg.duration]);

  useEffect(() => {
    return () => {
      burstTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      burstTimersRef.current = [];
      stopSpeaking();
    };
  }, []);

  // Rotate friendly bonus category every 12 seconds
  useEffect(() => {
    const rotator = window.setInterval(() => {
      if (timeLeftRef.current > 3) {
        setBonusCatIdx((idx) => (idx + 1) % CATEGORY_ORDER.length);
      }
    }, 12000);
    return () => clearInterval(rotator);
  }, [level]);

  // Countdown timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [level]);

  // Finish game once when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && !finishedRef.current) {
      finishedRef.current = true;
      stopSpeaking();
      const finalScore = scoreRef.current;
      const learnedTotal = learnedWordsRef.current.size;
      const stars =
        finalScore >= cfg.starThresholds[0]
          ? 3
          : finalScore >= cfg.starThresholds[1]
            ? 2
            : 1;
      onWinRef.current(
        stars,
        lang === 'id'
          ? `${finalScore} poin • ${learnedTotal} kata baru dikenal!`
          : `${finalScore} pts • ${learnedTotal} words learned!`
      );
    }
  }, [timeLeft, cfg.starThresholds, lang]);

  // Build age-filtered pools by category
  const getPools = useCallback((): Record<BubbleCategory, GameItem[]> => {
    const limit = cfg.poolLimit;
    return {
      animals: ANIMALS.slice(0, limit),
      fruits: FRUITS.slice(0, limit),
      veggies: VEGGIES.slice(0, limit),
      vehicles: VEHICLES.slice(0, limit),
    };
  }, [cfg.poolLimit]);

  // Bubble spawner
  useEffect(() => {
    const pools = getPools();
    const allItems = [
      ...pools.animals,
      ...pools.fruits,
      ...pools.veggies,
      ...pools.vehicles,
    ];

    const createBubble = (startY = 104, forceBonus = false): Bubble => {
      const activeBonus = bonusCatRef.current;
      const pickBonusPool = forceBonus || Math.random() < 0.4;
      const sourcePool = pickBonusPool ? pools[activeBonus] : allItems;
      const randomItem =
        sourcePool[Math.floor(Math.random() * sourcePool.length)] || allItems[0];
      const randomColor =
        BUBBLE_PALETTES[Math.floor(Math.random() * BUBBLE_PALETTES.length)];
      const baseX = Math.random() * 68 + 16; // 16%..84% safe from edges

      return {
        id: nextIdRef.current++,
        baseX,
        x: baseX,
        y: startY,
        speed: cfg.baseSpeed + Math.random() * cfg.speedVariance,
        swayAmp: level === 0 ? 1.6 : level === 1 ? 2.2 : 2.6,
        swayFreq: 0.025 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        age: 0,
        size: cfg.bubbleSize,
        color: randomColor,
        item: randomItem,
      };
    };

    // Starter bubbles spread across sky so child can tap right away
    setBubbles([
      createBubble(44, true),
      createBubble(62, false),
      createBubble(78, true),
      createBubble(92, false),
    ]);

    let spawnTimerId: number | null = null;
    let cancelled = false;

    const scheduleNextSpawn = () => {
      if (cancelled) return;
      const delay = Math.round(
        cfg.spawnInterval / Math.max(0.7, Math.min(1.45, speedFactorRef.current))
      );
      spawnTimerId = window.setTimeout(() => {
        if (cancelled) return;
        if (timeLeftRef.current > 0) {
          setBubbles((prev) => {
            if (prev.length >= cfg.maxBubbles) return prev;
            return [...prev, createBubble(102)];
          });
        }
        scheduleNextSpawn();
      }, delay);
    };

    scheduleNextSpawn();

    return () => {
      cancelled = true;
      if (spawnTimerId !== null) {
        window.clearTimeout(spawnTimerId);
      }
    };
  }, [level, cfg, getPools]);

  // Frame-rate independent smooth float + gentle horizontal sway
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dtFactor = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;
      const speedScale = speedFactorRef.current;

      setBubbles((prev) =>
        prev
          .map((b) => {
            const nextAge = b.age + dtFactor;
            const nextY = b.y - b.speed * speedScale * dtFactor;
            const swayX =
              b.baseX +
              Math.sin(nextAge * b.swayFreq * Math.max(0.75, speedScale) + b.phase) *
                b.swayAmp;
            return {
              ...b,
              age: nextAge,
              y: nextY,
              x: Math.max(11, Math.min(89, swayX)),
            };
          })
          .filter((b) => b.y > -20)
      );
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const spawnBurst = (bubble: Bubble, points: number, isBonus: boolean) => {
    const burstId = burstIdRef.current++;
    const particleCount = isBonus ? 14 : 10;
    const baseRadius = bubble.size * (isBonus ? 0.96 : 0.82);
    const particles: BurstParticle[] = Array.from(
      { length: particleCount },
      (_, i) => {
        const angle =
          (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.35;
        const dist = baseRadius * (0.75 + Math.random() * 0.6);
        return {
          tx: Math.round(Math.cos(angle) * dist),
          ty: Math.round(Math.sin(angle) * dist),
          size: Math.round(8 + Math.random() * 9),
          color: isBonus
            ? i % 2 === 0
              ? '#fbbf24'
              : BURST_SPARK_COLORS[i % BURST_SPARK_COLORS.length]
            : BURST_SPARK_COLORS[i % BURST_SPARK_COLORS.length],
          isStar: isBonus ? i % 2 === 0 : i % 3 === 0,
        };
      }
    );

    const newBurst: PopBurst = {
      id: burstId,
      x: bubble.x,
      y: bubble.y,
      size: bubble.size,
      color: isBonus ? '#fde047' : bubble.color,
      points,
      word: lang === 'id' ? bubble.item.nameId : bubble.item.nameEn,
      isBonus,
      particles,
    };

    setBursts((prev) => [...prev.slice(-14), newBurst]);

    const timerId = window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 650);
    burstTimersRef.current.push(timerId);
  };

  const handlePop = (bubble: Bubble) => {
    if (timeLeftRef.current <= 0 || finishedRef.current) return;

    const isBonus = bubble.item.category === bonusCategory;
    const points = isBonus ? 2 : 1;
    const itemName = lang === 'id' ? bubble.item.nameId : bubble.item.nameEn;

    if (isBonus) {
      SFX.ding();
    } else {
      SFX.pop();
    }

    // Speak word cleanly (throttled so fast tapping doesn't stutter) + optional animal sound
    const now = Date.now();
    if (now - lastSpokenAtRef.current > 520) {
      lastSpokenAtRef.current = now;
      if (hasAnimalSound(bubble.item.emoji)) {
        playAnimalSound(bubble.item.emoji, () => {
          if (!finishedRef.current && timeLeftRef.current > 0) {
            speakText(itemName, lang);
          }
        });
      } else {
        speakText(itemName, lang);
      }
    }

    learnedWordsRef.current.add(itemName);
    spawnBurst(bubble, points, isBonus);
    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));

    setScore((prevScore) => {
      const nextScore = prevScore + points;
      if (Math.floor(nextScore / 10) > Math.floor(prevScore / 10)) {
        SFX.correct();
        setCheerToast(
          lang === 'id'
            ? `🎉 Hebat, ${displayName}! ${nextScore} Poin!`
            : `🎉 Awesome, ${displayName}! ${nextScore} Pts!`
        );
        const cheerTimer = window.setTimeout(() => setCheerToast(null), 1800);
        burstTimersRef.current.push(cheerTimer);
      }
      return nextScore;
    });

    setPoppedCount((c) => c + 1);
    setLearnedBanner({
      id: learnedIdRef.current++,
      item: bubble.item,
      points,
      isBonus,
    });
  };

  const getCategoryMeta = (cat: GameItem['category']): CategoryMeta => {
    if (cat === 'animals' || cat === 'fruits' || cat === 'veggies' || cat === 'vehicles') {
      return CATEGORY_META[cat];
    }
    return CATEGORY_META.fruits;
  };

  const activeLearnedMeta = learnedBanner
    ? getCategoryMeta(learnedBanner.item.category)
    : null;

  return (
    <div className="flex flex-col w-full flex-1 max-w-2xl mx-auto px-3 sm:px-4 py-2">
      {/* Top HUD with Clear Game Title */}
      <div className="flex items-center justify-between gap-2 py-2 mb-2 bg-white/95 backdrop-blur-md px-3 sm:px-4 rounded-2xl shadow-sm border border-sky-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
              <span>🫧</span>
              <span className="truncate">
                {lang === 'id' ? 'Pecah Gelembung' : 'Pop Bubbles'}
              </span>
            </h1>
            <p className="text-[11px] font-bold text-sky-700 truncate">
              {ageMeta.badge} {lang === 'id' ? ageMeta.nameId : ageMeta.nameEn} ({ageMeta.ageRange})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span
            className={`flex items-center gap-1 text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl tabular-nums border ${
              timeLeft <= 6
                ? 'text-rose-700 bg-rose-100 border-rose-200 animate-pulse'
                : 'text-rose-700 bg-rose-50 border-rose-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>{timeLeft}s</span>
          </span>
          <span className="text-xs font-black text-cyan-800 bg-cyan-50 px-2.5 sm:px-3 py-1.5 rounded-xl tabular-nums border border-cyan-100">
            🫧 {score}
          </span>
        </div>
      </div>

      {/* Educational Mission & Live Word Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 shrink-0">
        {/* Friendly Bonus Mission (Zero Penalty) */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200/80 rounded-2xl px-3 py-1.5 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{bonusMeta.emoji}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                {lang === 'id' ? 'Misi Bonus ⭐ x2' : 'Bonus Hunt ⭐ x2'}
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {lang === 'id'
                  ? `Cari ${bonusMeta.labelId}!`
                  : `Find ${bonusMeta.labelEn}!`}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-black text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-lg shrink-0">
            +2 ⭐
          </span>
        </div>

        {/* Educational Pop Feedback Card */}
        <div className="flex items-center justify-between gap-2 bg-white/95 border-2 border-sky-100 rounded-2xl px-3 py-1.5 shadow-xs min-h-[46px]">
          {learnedBanner && activeLearnedMeta ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 flex items-center justify-center">
                  <ItemIcon
                    name={learnedBanner.item.nameId}
                    emoji={learnedBanner.item.emoji}
                    category={learnedBanner.item.category}
                    size="26px"
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {lang === 'id'
                      ? learnedBanner.item.nameId
                      : learnedBanner.item.nameEn}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md border ${activeLearnedMeta.badgeBg} ${activeLearnedMeta.badgeText} ${activeLearnedMeta.badgeBorder}`}
                  >
                    {activeLearnedMeta.emoji}{' '}
                    {lang === 'id'
                      ? activeLearnedMeta.labelId
                      : activeLearnedMeta.labelEn}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                  learnedBanner.isBonus
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-sky-100 text-sky-700'
                }`}
              >
                +{learnedBanner.points} {learnedBanner.isBonus ? '⭐' : '✨'}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <BookOpen className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                {lang === 'id'
                  ? 'Ketuk gelembung apa saja untuk mengenal namanya!'
                  : 'Tap any bubble to learn its name & category!'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Speed Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 bg-white/95 backdrop-blur-sm border-2 border-cyan-100 rounded-2xl px-3 py-1.5 shadow-xs shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
          <Gauge className="w-4 h-4 text-cyan-600 shrink-0" />
          <span>{lang === 'id' ? 'Kecepatan:' : 'Speed:'}</span>
          <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-lg text-[11px] font-black">
            <span>{activeSpeed.emoji}</span>
            <span>{lang === 'id' ? activeSpeed.labelId : activeSpeed.labelEn}</span>
            <span className="text-cyan-600">({activeSpeed.factor}x)</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (speedIdx > 0) {
                SFX.bloop();
                setSpeedIdx((idx) => Math.max(0, idx - 1));
              }
            }}
            disabled={speedIdx === 0}
            aria-label={lang === 'id' ? 'Perlambat kecepatan' : 'Decrease speed'}
            className="h-8 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-200 text-amber-800 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{lang === 'id' ? 'Pelan' : 'Slower'}</span>
          </button>

          <div className="flex items-center gap-1 px-1" aria-hidden="true">
            {SPEED_PRESETS.map((preset, idx) => (
              <button
                key={preset.factor}
                type="button"
                onClick={() => {
                  SFX.bloop();
                  setSpeedIdx(idx);
                }}
                title={`${lang === 'id' ? preset.labelId : preset.labelEn} (${preset.factor}x)`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === speedIdx
                    ? 'w-5 bg-cyan-500'
                    : idx < speedIdx
                      ? 'w-2.5 bg-cyan-300 hover:bg-cyan-400'
                      : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (speedIdx < SPEED_PRESETS.length - 1) {
                SFX.bloop();
                setSpeedIdx((idx) => Math.min(SPEED_PRESETS.length - 1, idx + 1));
              }
            }}
            disabled={speedIdx === SPEED_PRESETS.length - 1}
            aria-label={lang === 'id' ? 'Tambah kecepatan' : 'Increase speed'}
            className="h-8 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Cepat' : 'Faster'}</span>
          </button>
        </div>
      </div>

      {/* Festive Sky & Meadow Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-[380px] sm:min-h-[450px] h-[calc(100dvh-280px)] max-h-[640px] rounded-3xl bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-100 relative overflow-hidden border-4 border-white shadow-lg select-none"
      >
        {/* Festive Rainbow Arc */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[125%] h-56 rounded-full opacity-35"
          style={{
            background:
              'radial-gradient(closest-side, transparent 62%, rgba(251,113,133,0.45) 68%, rgba(251,191,36,0.45) 75%, rgba(52,211,153,0.45) 82%, rgba(56,189,248,0.45) 90%, transparent 98%)',
          }}
        />

        {/* Smiling Glowing Sun */}
        <div className="pointer-events-none absolute top-4 right-5 w-14 h-14 rounded-full bg-amber-300/40 flex items-center justify-center shadow-[0_0_28px_rgba(251,191,36,0.55)]">
          <span className="text-4xl drop-shadow-xs">☀️</span>
        </div>

        {/* Soft Clouds & Twinkling Sparkles */}
        <div className="absolute top-6 left-6 text-5xl opacity-75 pointer-events-none drop-shadow-xs">
          ☁️
        </div>
        <div className="absolute top-24 right-20 text-4xl opacity-65 pointer-events-none drop-shadow-xs">
          ☁️
        </div>
        <div className="absolute top-14 left-1/2 text-lg opacity-70 pointer-events-none animate-pulse">
          ✨
        </div>
        <div className="absolute top-36 left-12 text-base opacity-60 pointer-events-none animate-pulse">
          🌟
        </div>

        {/* Cheerful Green Meadow Floor */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-emerald-400/70 via-emerald-300/40 to-transparent flex items-end justify-around px-4 pb-1.5 text-xl sm:text-2xl opacity-85">
          <span>🌱</span>
          <span>🌸</span>
          <span>🌼</span>
          <span>🌷</span>
          <span>🌿</span>
          <span>🌻</span>
        </div>

        {/* Milestone Cheer Toast */}
        {cheerToast && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-400 to-pink-500 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 animate-bounce whitespace-nowrap">
            <Sparkles className="w-4 h-4" />
            <span>{cheerToast}</span>
          </div>
        )}

        {/* Word counter pill bottom-right */}
        <div className="pointer-events-none absolute bottom-2 right-3 z-10 bg-white/80 backdrop-blur-xs text-[11px] font-extrabold text-emerald-800 px-2.5 py-1 rounded-full shadow-xs border border-emerald-100">
          {lang === 'id'
            ? `📚 ${poppedCount} Gelembung`
            : `📚 ${poppedCount} Popped`}
        </div>

        {/* Floating Iridescent Soap Bubbles */}
        {bubbles.map((b) => {
          const isBonus = b.item.category === bonusCategory;
          const shortName = lang === 'id' ? b.item.nameId : b.item.nameEn;

          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handlePop(b)}
              aria-label={shortName}
              className={`absolute -translate-x-1/2 rounded-full flex flex-col items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer touch-manipulation ${
                isBonus
                  ? 'border-[3px] border-amber-300 ring-2 ring-amber-200/70'
                  : 'border-2 border-white/90'
              }`}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                background: isBonus
                  ? `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(254,240,138,0.82) 38%, rgba(251,191,36,0.52) 100%)`
                  : `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.92) 0%, ${b.color} 55%, rgba(255,255,255,0.45) 100%)`,
                boxShadow: isBonus
                  ? 'inset 0 4px 10px rgba(255,255,255,0.9), 0 8px 18px rgba(245,158,11,0.32)'
                  : 'inset 0 4px 10px rgba(255,255,255,0.85), 0 6px 14px rgba(14,116,144,0.16)',
              }}
            >
              {/* Soap bubble glossy reflection spot */}
              <span className="pointer-events-none absolute top-2 left-3 w-3.5 h-2 rounded-full bg-white/80 -rotate-25" />

              {/* Bonus star crown badge */}
              {isBonus && (
                <span className="pointer-events-none absolute -top-2 -right-1 text-sm sm:text-base drop-shadow-xs">
                  ⭐
                </span>
              )}

              <span className="pointer-events-none flex items-center justify-center">
                <ItemIcon
                  name={b.item.nameId}
                  emoji={b.item.emoji}
                  category={b.item.category}
                  size={`${Math.round(b.size * 0.5)}px`}
                />
              </span>

              {/* Crisp educational name label */}
              <span className="pointer-events-none -mt-0.5 max-w-[92%] truncate px-1.5 py-0.2 rounded-full bg-white/85 text-slate-800 text-[9px] sm:text-[10px] font-black leading-tight shadow-xs">
                {shortName}
              </span>
            </button>
          );
        })}

        {/* Pop Explosion Effects */}
        {bursts.map((burst) => (
          <div
            key={burst.id}
            className="absolute -translate-x-1/2 pointer-events-none flex items-center justify-center z-20"
            style={{
              left: `${burst.x}%`,
              top: `${burst.y}%`,
              width: `${burst.size}px`,
              height: `${burst.size}px`,
            }}
          >
            {/* Expanding shockwave ring */}
            <div
              className="absolute inset-0 rounded-full border-4 animate-bubble-ring"
              style={{
                borderColor: burst.isBonus ? '#fde047' : '#ffffff',
                boxShadow: `0 0 20px ${burst.color}`,
              }}
            />

            {/* Bright center burst flash */}
            <div
              className="absolute inset-2 rounded-full animate-bubble-flash"
              style={{
                background: `radial-gradient(circle, #ffffff 20%, ${burst.color} 68%, transparent 100%)`,
              }}
            />

            {/* Radial droplets & star sparks */}
            {burst.particles.map((p, idx) => (
              <span
                key={idx}
                className="absolute left-1/2 top-1/2 animate-bubble-particle"
                style={
                  {
                    '--tx': `${p.tx}px`,
                    '--ty': `${p.ty}px`,
                  } as React.CSSProperties
                }
              >
                {p.isStar ? (
                  <span
                    className="block leading-none drop-shadow-xs"
                    style={{ fontSize: `${p.size + 4}px` }}
                  >
                    {burst.isBonus ? '🌟' : '✨'}
                  </span>
                ) : (
                  <span
                    className="block rounded-full border-2 border-white shadow-sm"
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                    }}
                  />
                )}
              </span>
            ))}

            {/* Floating score & word pop */}
            <span
              className={`absolute left-1/2 top-1/2 text-base sm:text-lg font-black whitespace-nowrap drop-shadow-[0_2px_2px_rgba(255,255,255,0.98)] animate-bubble-plus ${
                burst.isBonus ? 'text-amber-500' : 'text-sky-600'
              }`}
            >
              +{burst.points} {burst.isBonus ? '⭐' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

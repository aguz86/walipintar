import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { ANIMALS, FRUITS, GameItem } from '../data/items';
import { ItemIcon } from '../components/ItemIcon';
import { SFX, playAnimalSound, hasAnimalSound } from '../utils/audio';

interface BubbleGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  onWin: (stars: number, scoreText: string) => void;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  item: GameItem;
}

const BUBBLE_PALETTES = ['#ffd1e3', '#cfe6ff', '#c8f2dc', '#fff3b0', '#e2d6ff', '#ffd9c7'];

export const BubbleGame: React.FC<BubbleGameProps> = ({
  onBack,
  lang,
  level,
  onWin,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(1);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(25);
  const finishedRef = useRef(false);
  const onWinRef = useRef(onWin);

  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Speed and bubble spawn rate by level
  const spawnInterval = level === 0 ? 800 : level === 1 ? 650 : 500;
  const bubbleSize = level === 0 ? 86 : level === 1 ? 72 : 62;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // When timer reaches 0, finish game once with latest score
  useEffect(() => {
    if (timeLeft === 0 && !finishedRef.current) {
      finishedRef.current = true;
      const finalScore = scoreRef.current;
      const thresholds = level === 0 ? [10, 6] : level === 1 ? [16, 10] : [22, 14];
      const stars = finalScore >= thresholds[0] ? 3 : finalScore >= thresholds[1] ? 2 : 1;
      onWinRef.current(
        stars,
        `${finalScore} ${lang === 'id' ? 'gelembung terpecahkan!' : 'bubbles popped!'}`
      );
    }
  }, [timeLeft, level, lang]);

  // Bubble spawner (does not reset every second)
  useEffect(() => {
    const allPool = [...ANIMALS, ...FRUITS];
    const baseSpeed = level === 0 ? 0.55 : level === 1 ? 0.8 : 1.05;

    const createBubble = (startY = 104): Bubble => {
      const randomItem = allPool[Math.floor(Math.random() * allPool.length)];
      const randomColor = BUBBLE_PALETTES[Math.floor(Math.random() * BUBBLE_PALETTES.length)];
      return {
        id: nextIdRef.current++,
        x: Math.random() * 72 + 14, // 14% to 86% (centered with translateX(-50%))
        y: startY,
        speed: Math.random() * 0.55 + baseSpeed,
        size: bubbleSize,
        color: randomColor,
        item: randomItem,
      };
    };

    // Spawn starter bubbles immediately so the sky isn't empty on frame 1
    setBubbles([createBubble(70), createBubble(86), createBubble(100)]);

    const spawner = setInterval(() => {
      if (timeLeftRef.current <= 0) return;
      setBubbles((prev) => [...prev.slice(-20), createBubble(104)]);
    }, spawnInterval);

    return () => clearInterval(spawner);
  }, [level, spawnInterval, bubbleSize]);

  // Frame-rate independent bubble animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dtFactor = Math.min(now - lastTime, 50) / 16.667;
      lastTime = now;

      setBubbles((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - b.speed * dtFactor }))
          .filter((b) => b.y > -22) // remove when off top
      );
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePop = (bubble: Bubble) => {
    if (timeLeftRef.current <= 0) return;
    SFX.pop();
    if (hasAnimalSound(bubble.item.emoji) && Math.random() < 0.4) {
      playAnimalSound(bubble.item.emoji);
    }
    setScore((s) => s + 1);
    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
  };

  return (
    <div className="flex flex-col w-full flex-1 max-w-xl mx-auto px-4 py-2">
      {/* Top HUD */}
      <div className="flex items-center justify-between gap-2 py-2 mb-2 bg-white/90 backdrop-blur-md px-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl tabular-nums border border-rose-100">
            <Clock className="w-4 h-4 text-rose-500" />
            <span>{timeLeft}s</span>
          </span>
          <span className="text-xs font-black text-cyan-800 bg-cyan-50 px-3 py-1.5 rounded-xl tabular-nums border border-cyan-100">
            🫧 {score}
          </span>
        </div>
      </div>

      {/* Bubble Sky Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-[420px] sm:min-h-[500px] h-[calc(100dvh-170px)] max-h-[680px] rounded-3xl bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 relative overflow-hidden border-4 border-white shadow-inner select-none"
      >
        {/* Soft background clouds */}
        <div className="absolute top-6 left-8 text-6xl opacity-40 pointer-events-none">☁️</div>
        <div className="absolute top-20 right-10 text-5xl opacity-40 pointer-events-none">☁️</div>

        {bubbles.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => handlePop(b)}
            aria-label={lang === 'id' ? b.item.nameId : b.item.nameEn}
            className="absolute -translate-x-1/2 rounded-full border-3 border-white/80 shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer touch-manipulation"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              backgroundColor: b.color,
              boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.7), 0 6px 12px rgba(0,0,0,0.1)',
            }}
          >
            <span className="pointer-events-none flex items-center justify-center">
              <ItemIcon
                name={b.item.nameId}
                emoji={b.item.emoji}
                category={b.item.category}
                size={`${b.size * 0.55}px`}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

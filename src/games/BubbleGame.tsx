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

  // When timer reaches 0, finish game
  useEffect(() => {
    if (timeLeft === 0) {
      const thresholds = level === 0 ? [10, 6] : level === 1 ? [16, 10] : [22, 14];
      const stars = score >= thresholds[0] ? 3 : score >= thresholds[1] ? 2 : 1;
      onWin(stars, `${score} ${lang === 'id' ? 'gelembung terpecahkan!' : 'bubbles popped!'}`);
    }
  }, [timeLeft]);

  // Bubble spawner
  useEffect(() => {
    const allPool = [...ANIMALS, ...FRUITS];
    const spawner = setInterval(() => {
      if (timeLeft <= 0) return;

      const randomItem = allPool[Math.floor(Math.random() * allPool.length)];
      const randomColor = BUBBLE_PALETTES[Math.floor(Math.random() * BUBBLE_PALETTES.length)];
      const newBubble: Bubble = {
        id: nextIdRef.current++,
        x: Math.random() * 80 + 5, // 5% to 85%
        y: 110, // start below bottom
        speed: Math.random() * 0.8 + (level === 0 ? 0.7 : level === 1 ? 1.0 : 1.3),
        size: bubbleSize,
        color: randomColor,
        item: randomItem,
      };

      setBubbles((prev) => [...prev.slice(-20), newBubble]);
    }, spawnInterval);

    return () => clearInterval(spawner);
  }, [level, timeLeft]);

  // Bubble animation loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      setBubbles((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - b.speed }))
          .filter((b) => b.y > -25) // remove when off top
      );
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePop = (bubble: Bubble) => {
    SFX.pop();
    if (hasAnimalSound(bubble.item.emoji) && Math.random() < 0.4) {
      playAnimalSound(bubble.item.emoji);
    }
    setScore((s) => s + 1);
    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2">
      {/* Top HUD */}
      <div className="flex items-center justify-between gap-2 py-2 mb-2 bg-white/90 backdrop-blur-md px-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
        <button
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
        className="flex-1 w-full rounded-3xl bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 relative overflow-hidden border-4 border-white shadow-inner select-none cursor-pointer"
      >
        {/* Soft background clouds */}
        <div className="absolute top-6 left-8 text-6xl opacity-40 pointer-events-none">☁️</div>
        <div className="absolute top-20 right-10 text-5xl opacity-40 pointer-events-none">☁️</div>

        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => handlePop(b)}
            className="absolute rounded-full border-3 border-white/80 shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-90 cursor-pointer animate-float"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              backgroundColor: b.color,
              boxShadow: 'inset 0 4px 8px rgba(255,255,255,0.7), 0 6px 12px rgba(0,0,0,0.1)',
            }}
          >
            <ItemIcon
              name={b.item.nameId}
              emoji={b.item.emoji}
              category={b.item.category}
              size={`${b.size * 0.55}px`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

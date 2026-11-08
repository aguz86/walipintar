import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { ANIMALS, FRUITS, GameItem } from '../data/items';
import { ItemIcon } from '../components/ItemIcon';
import { SFX, playAnimalSound, hasAnimalSound, speakText } from '../utils/audio';

interface MemoryGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

interface Card {
  id: number;
  item: GameItem;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const numPairs = level === 0 ? 3 : level === 1 ? 4 : 6;
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState('');

  const initGame = () => {
    const combinedPool = [...ANIMALS.slice(0, 16), ...FRUITS.slice(0, 10)];
    const chosenItems = combinedPool.sort(() => Math.random() - 0.5).slice(0, numPairs);

    const pairedCards: Card[] = [];
    chosenItems.forEach((item, idx) => {
      pairedCards.push({
        id: idx * 2,
        item,
        isFlipped: false,
        isMatched: false,
      });
      pairedCards.push({
        id: idx * 2 + 1,
        item,
        isFlipped: false,
        isMatched: false,
      });
    });

    const shuffled = pairedCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedIndices([]);
    setMoves(0);
    setIsLocked(false);
  };

  useEffect(() => {
    initGame();
  }, [level]);

  const handleCardClick = (idx: number) => {
    if (isLocked) return;
    if (cards[idx].isFlipped || cards[idx].isMatched) return;

    SFX.bloop();
    const newCards = [...cards];
    newCards[idx].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, idx];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsLocked(true);
      setMoves((m) => m + 1);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

      if (firstCard.item.nameId === secondCard.item.nameId) {
        // MATCH!
        setFeedback(lang === 'id' ? `🌟 Hebat, ${displayName}! Kartunya cocok!` : `🌟 Great, ${displayName}! Match!`);
        setTimeout(() => {
          SFX.ding();
          speakText(lang === 'id' ? `Hebat sekali, ${displayName}!` : `Great job, ${displayName}!`, lang);
          if (hasAnimalSound(firstCard.item.emoji)) {
            playAnimalSound(firstCard.item.emoji);
          }
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsLocked(false);

          // Check if all matched
          if (newCards.every((c) => c.isMatched)) {
            setTimeout(() => {
              const stars = moves <= numPairs + 2 ? 3 : moves <= numPairs * 2 ? 2 : 1;
              onWin(stars, `${moves + 1} ${lang === 'id' ? 'langkah' : 'moves'}`);
            }, 600);
          }
        }, 300);
      } else {
        // NO MATCH
        const wrongText = lang === 'id' ? 'Coba lagi yaa!' : 'Try again!';
        setFeedback(wrongText);
        speakText(wrongText, lang);

        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsLocked(false);
        }, 900);
      }
    }
  };

  const gridColsClass =
    numPairs === 3
      ? 'grid-cols-3'
      : numPairs === 4
      ? 'grid-cols-4'
      : 'grid-cols-3 sm:grid-cols-4';

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-4 py-2">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 py-2 mb-2 sm:mb-3 bg-white/90 backdrop-blur-md px-4 rounded-2xl shadow-sm border border-slate-100">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5">
          <span>🃏</span>
          <span>{lang === 'id' ? 'Kartu Kembar' : 'Memory Match'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl tabular-nums">
            {lang === 'id' ? `Langkah: ${moves}` : `Moves: ${moves}`}
          </span>
          <button
            onClick={initGame}
            className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center cursor-pointer"
            aria-label="Acak Kartu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      <div className="min-h-[2rem] flex items-center justify-center mb-1">
        {feedback && (
          <span
            className={`text-xs sm:text-sm font-black px-4 py-1 rounded-full shadow-xs ${
              feedback.includes('Coba lagi') || feedback.includes('Try again')
                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {feedback}
          </span>
        )}
      </div>

      {/* Grid of Cards */}
      <div className="flex-1 flex items-center justify-center py-2">
        <div className={`grid ${gridColsClass} gap-2.5 md:gap-3.5 w-full max-w-md`}>
          {cards.map((card, idx) => {
            const showFront = card.isFlipped || card.isMatched;

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                disabled={card.isMatched || isLocked}
                className={`aspect-square rounded-2xl md:rounded-3xl border-3 flex flex-col items-center justify-center transition-all duration-300 transform cursor-pointer active:scale-95 shadow-sm ${
                  card.isMatched
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 scale-95'
                    : showFront
                    ? 'bg-white border-indigo-400 text-slate-900 shadow-md rotate-y-180'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-300 text-white hover:brightness-110'
                }`}
              >
                {showFront ? (
                  <div className="flex flex-col items-center justify-center p-1">
                    <ItemIcon
                      name={card.item.nameId}
                      emoji={card.item.emoji}
                      category={card.item.category}
                      size="3.2rem"
                    />
                    <span className="text-[10px] md:text-xs font-black mt-1 truncate max-w-full text-slate-700">
                      {lang === 'id' ? card.item.nameId : card.item.nameEn}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl md:text-3xl font-black opacity-80">❓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

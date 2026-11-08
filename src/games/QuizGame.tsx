import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, Star, Sparkles } from 'lucide-react';
import {
  ANIMALS,
  FRUITS,
  VEGGIES,
  PLANTS,
  VEHICLES,
  COLORS,
  SHAPES,
  GameItem,
  GAME_DEFINITIONS,
} from '../data/items';
import { ItemIcon } from '../components/ItemIcon';
import { SFX, playAnimalSound, speakText, hasAnimalSound } from '../utils/audio';

interface QuizGameProps {
  gameId: string;
  onBack: () => void;
  lang: 'id' | 'en';
  playerName: string;
  level: number; // 0 = Si Kecil, 1 = Pintar, 2 = Juara
  onWin: (stars: number, scoreText: string) => void;
}

interface Question {
  promptText: string;
  questionVisual?: React.ReactNode;
  soundEmoji?: string;
  spokenText?: string;
  options: { label: string; visual?: React.ReactNode; isCorrect: boolean }[];
}

export const QuizGame: React.FC<QuizGameProps> = ({
  gameId,
  onBack,
  lang,
  playerName,
  level,
  onWin,
}) => {
  const gameDef = GAME_DEFINITIONS.find((g) => g.id === gameId);
  const totalQuestions = level === 0 ? 6 : level === 1 ? 8 : 10;
  const numChoices = level === 0 ? 2 : level === 1 ? 3 : 4;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const generateQuestion = (): Question => {
    // Helper to get age-appropriate slice from pool
    const getPool = (fullList: GameItem[]) => {
      if (level === 0) return fullList.slice(0, 20);
      if (level === 1) return fullList.slice(0, 45);
      return fullList;
    };

    // 1. ANIMALS
    if (gameId === 'animals') {
      const pool = getPool(ANIMALS);
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = pool
        .filter((a) => a.nameId !== target.nameId)
        .sort(() => Math.random() - 0.5)
        .slice(0, numChoices - 1);

      // Level 2 (Juara): sometimes "find image by name"
      if (level === 2 && Math.random() < 0.6) {
        const targetName = lang === 'id' ? target.nameId : target.nameEn;
        const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
        return {
          promptText: lang === 'id' ? `Pilih gambar: ${targetName}` : `Find the picture of: ${targetName}`,
          questionVisual: <span className="text-3xl font-black text-indigo-700">{targetName}</span>,
          spokenText: targetName,
          soundEmoji: hasAnimalSound(target.emoji) ? target.emoji : undefined,
          options: allOpts.map((opt) => ({
            label: lang === 'id' ? opt.nameId : opt.nameEn,
            visual: <ItemIcon name={opt.nameId} emoji={opt.emoji} category="animals" size="3.5rem" />,
            isCorrect: opt.nameId === target.nameId,
          })),
        };
      }

      // Normal mode: see animal, pick name
      const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
      return {
        promptText: lang === 'id' ? 'Ini hewan apa?' : 'What animal is this?',
        questionVisual: <ItemIcon name={target.nameId} emoji={target.emoji} category="animals" size="5rem" />,
        soundEmoji: hasAnimalSound(target.emoji) ? target.emoji : undefined,
        spokenText: lang === 'id' ? target.nameId : target.nameEn,
        options: allOpts.map((opt) => ({
          label: lang === 'id' ? opt.nameId : opt.nameEn,
          isCorrect: opt.nameId === target.nameId,
        })),
      };
    }

    // 2. PLANTS & FLOWERS (Tebak Tumbuhan)
    if (gameId === 'plants') {
      const pool = getPool(PLANTS);
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = pool
        .filter((p) => p.nameId !== target.nameId)
        .sort(() => Math.random() - 0.5)
        .slice(0, numChoices - 1);

      if (level === 2 && Math.random() < 0.5) {
        const targetName = lang === 'id' ? target.nameId : target.nameEn;
        const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
        return {
          promptText: lang === 'id' ? `Pilih tanaman: ${targetName}` : `Find: ${targetName}`,
          questionVisual: <span className="text-3xl font-black text-emerald-800">{targetName}</span>,
          spokenText: targetName,
          options: allOpts.map((opt) => ({
            label: lang === 'id' ? opt.nameId : opt.nameEn,
            visual: <ItemIcon name={opt.nameId} emoji={opt.emoji} category="plants" size="3.5rem" />,
            isCorrect: opt.nameId === target.nameId,
          })),
        };
      }

      const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
      return {
        promptText: lang === 'id' ? 'Ini tumbuhan apa?' : 'What plant is this?',
        questionVisual: <ItemIcon name={target.nameId} emoji={target.emoji} category="plants" size="5rem" />,
        spokenText: lang === 'id' ? target.nameId : target.nameEn,
        options: allOpts.map((opt) => ({
          label: lang === 'id' ? opt.nameId : opt.nameEn,
          isCorrect: opt.nameId === target.nameId,
        })),
      };
    }

    // 3. FRUITS & VEGGIES
    if (gameId === 'fruitveg') {
      const isFruitCategoryMode = level >= 1 && Math.random() < 0.45;
      if (isFruitCategoryMode) {
        const isFruit = Math.random() < 0.5;
        const source = getPool(isFruit ? FRUITS : VEGGIES);
        const target = source[Math.floor(Math.random() * source.length)];
        return {
          promptText:
            lang === 'id' ? `${target.nameId}: Ini buah atau sayur?` : `${target.nameEn}: Fruit or vegetable?`,
          questionVisual: <ItemIcon name={target.nameId} emoji={target.emoji} category={target.category} size="5rem" />,
          spokenText: lang === 'id' ? target.nameId : target.nameEn,
          options: [
            {
              label: lang === 'id' ? 'Buah 🍎' : 'Fruit 🍎',
              isCorrect: isFruit,
            },
            {
              label: lang === 'id' ? 'Sayur 🥕' : 'Vegetable 🥕',
              isCorrect: !isFruit,
            },
          ],
        };
      }

      // Name guessing mode
      const combined = getPool([...FRUITS, ...VEGGIES]);
      const target = combined[Math.floor(Math.random() * combined.length)];
      const distractors = combined
        .filter((item) => item.nameId !== target.nameId)
        .sort(() => Math.random() - 0.5)
        .slice(0, numChoices - 1);

      const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
      return {
        promptText: lang === 'id' ? 'Ini apa namanya?' : 'What is the name of this?',
        questionVisual: <ItemIcon name={target.nameId} emoji={target.emoji} category={target.category} size="5rem" />,
        spokenText: lang === 'id' ? target.nameId : target.nameEn,
        options: allOpts.map((opt) => ({
          label: lang === 'id' ? opt.nameId : opt.nameEn,
          isCorrect: opt.nameId === target.nameId,
        })),
      };
    }

    // 4. VEHICLES (Tebak Kendaraan)
    if (gameId === 'vehicles') {
      const pool = getPool(VEHICLES);
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = pool
        .filter((v) => v.nameId !== target.nameId)
        .sort(() => Math.random() - 0.5)
        .slice(0, numChoices - 1);

      const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
      return {
        promptText: lang === 'id' ? 'Kendaraan apa ini?' : 'What vehicle is this?',
        questionVisual: <ItemIcon name={target.nameId} emoji={target.emoji} category="vehicles" size="5rem" />,
        spokenText: lang === 'id' ? target.nameId : target.nameEn,
        options: allOpts.map((opt) => ({
          label: lang === 'id' ? opt.nameId : opt.nameEn,
          isCorrect: opt.nameId === target.nameId,
        })),
      };
    }

    // 5. COLORS (Warna Ceria)
    if (gameId === 'colors') {
      const pool = COLORS;
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = pool
        .filter((c) => c.nameId !== target.nameId)
        .sort(() => Math.random() - 0.5)
        .slice(0, numChoices - 1);

      const allOpts = [target, ...distractors].sort(() => Math.random() - 0.5);
      return {
        promptText: lang === 'id' ? 'Warna apa ini?' : 'What color is this?',
        questionVisual: <span className="text-7xl">{target.emoji}</span>,
        spokenText: lang === 'id' ? target.nameId : target.nameEn,
        options: allOpts.map((opt) => ({
          label: lang === 'id' ? opt.nameId : opt.nameEn,
          isCorrect: opt.nameId === target.nameId,
        })),
      };
    }

    // 6. SHAPES (Bentuk Lucu & Benda Sehari-hari)
    if (gameId === 'shapes') {
      const pool = SHAPES;
      const isPickObjectForShapeMode = Math.random() < 0.5;

      if (isPickObjectForShapeMode) {
        // Mode B: "Mana benda yang berbentuk [LINGKARAN / SEGITIGA / etc]?"
        // Pick a target item with valid shapeLabelId
        const validItems = pool.filter((s) => s.shapeLabelId && s.shapeType);
        const target = validItems[Math.floor(Math.random() * validItems.length)];
        const targetType = target.shapeType;
        const targetLabel = lang === 'id' ? target.shapeLabelId : target.shapeLabelEn;

        // Distractors must have DIFFERENT shapeType
        const otherTypeItems = validItems.filter((s) => s.shapeType !== targetType);
        // Ensure distinct shape types among distractors
        const pickedDistractors: GameItem[] = [];
        const usedTypes = new Set<string>([targetType!]);

        const shuffledOthers = [...otherTypeItems].sort(() => Math.random() - 0.5);
        for (const item of shuffledOthers) {
          if (pickedDistractors.length >= numChoices - 1) break;
          if (!usedTypes.has(item.shapeType!)) {
            usedTypes.add(item.shapeType!);
            pickedDistractors.push(item);
          }
        }

        const allOpts = [target, ...pickedDistractors].sort(() => Math.random() - 0.5);

        return {
          promptText:
            lang === 'id'
              ? `Mana benda yang berbentuk ${targetLabel?.toUpperCase()}?`
              : `Which item is a ${targetLabel?.toUpperCase()}?`,
          questionVisual: (
            <div className="flex flex-col items-center justify-center p-3 bg-indigo-50 border-2 border-indigo-200 rounded-2xl">
              <span className="text-xs uppercase font-black text-indigo-500 mb-1">
                {lang === 'id' ? 'Cari Bentuk' : 'Find Shape'}
              </span>
              <span className="text-2xl md:text-3xl font-black text-indigo-900">
                {targetLabel}
              </span>
            </div>
          ),
          spokenText: targetLabel,
          options: allOpts.map((opt) => {
            const cleanName = lang === 'id'
              ? opt.nameId.replace(/\s*\(.*?\)/, '')
              : opt.nameEn.replace(/\s*\(.*?\)/, '');
            return {
              label: cleanName,
              visual: (
                <ItemIcon
                  name={opt.emoji || opt.nameId}
                  emoji={opt.emoji}
                  category="shapes"
                  size="3.5rem"
                />
              ),
              isCorrect: opt.shapeType === targetType,
            };
          }),
        };
      } else {
        // Mode A: "Benda ini berbentuk apa?" (What shape is this item?)
        const validItems = pool.filter((s) => s.shapeLabelId && s.shapeType);
        const target = validItems[Math.floor(Math.random() * validItems.length)];
        const targetLabel = lang === 'id' ? target.shapeLabelId! : target.shapeLabelEn!;
        const cleanName = lang === 'id'
          ? target.nameId.replace(/\s*\(.*?\)/, '')
          : target.nameEn.replace(/\s*\(.*?\)/, '');

        // Collect distinct shape labels as choices
        const allDistinctShapes = Array.from(
          new Set(validItems.map((s) => (lang === 'id' ? s.shapeLabelId! : s.shapeLabelEn!)))
        );
        const otherShapes = allDistinctShapes
          .filter((label) => label !== targetLabel)
          .sort(() => Math.random() - 0.5)
          .slice(0, numChoices - 1);

        const allChoices = [targetLabel, ...otherShapes].sort(() => Math.random() - 0.5);

        return {
          promptText:
            lang === 'id'
              ? `${cleanName}: Benda ini berbentuk apa?`
              : `${cleanName}: What shape is this?`,
          questionVisual: (
            <div className="flex flex-col items-center">
              <ItemIcon
                name={target.emoji || target.nameId}
                emoji={target.emoji}
                category="shapes"
                size="5rem"
              />
              <span className="mt-2 text-sm font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full border border-slate-200">
                {cleanName}
              </span>
            </div>
          ),
          spokenText: `${cleanName}. ${targetLabel}`,
          options: allChoices.map((label) => ({
            label,
            isCorrect: label === targetLabel,
          })),
        };
      }
    }

    // 7. COUNTING FRUIT (Hitung Buah)
    if (gameId === 'count') {
      const count = level === 0 ? Math.floor(Math.random() * 5) + 1 : level === 1 ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 12) + 4;
      const fruitEmojis = ['🍎', '🍌', '🍓', '🍊', '🍇'];
      const chosenEmoji = fruitEmojis[Math.floor(Math.random() * fruitEmojis.length)];

      const distractors = [count - 1, count + 1, count + 2, count - 2].filter((n) => n > 0 && n !== count);
      const chosenDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, numChoices - 1);
      const allNums = [count, ...chosenDistractors].sort(() => Math.random() - 0.5);

      return {
        promptText: lang === 'id' ? 'Ada berapa buah di layar?' : 'How many fruits are there?',
        questionVisual: (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-xs text-4xl">
            {[...Array(count)].map((_, i) => (
              <span key={i} className="animate-scale-up">{chosenEmoji}</span>
            ))}
          </div>
        ),
        spokenText: `${count}`,
        options: allNums.map((num) => ({
          label: `${num}`,
          isCorrect: num === count,
        })),
      };
    }

    // 8. FIRST OR LAST LETTER (Huruf Pertama / Terakhir)
    if (gameId === 'letters') {
      const pool = ANIMALS;
      const target = pool[Math.floor(Math.random() * pool.length)];
      const word = lang === 'id' ? target.nameId : target.nameEn;
      const isLast = level === 2 && Math.random() < 0.5;
      const letter = (isLast ? word[word.length - 1] : word[0]).toUpperCase();

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((l) => l !== letter);
      const distLetters = alphabet.sort(() => Math.random() - 0.5).slice(0, numChoices - 1);
      const allLetters = [letter, ...distLetters].sort(() => Math.random() - 0.5);

      return {
        promptText: isLast
          ? lang === 'id'
            ? `Huruf TERAKHIR nama ${target.nameId}?`
            : `LAST letter of ${target.nameEn}?`
          : lang === 'id'
          ? `Huruf PERTAMA nama ${target.nameId}?`
          : `FIRST letter of ${target.nameEn}?`,
        questionVisual: <ItemIcon name={target.nameId} emoji={target.emoji} category="animals" size="5rem" />,
        spokenText: letter,
        options: allLetters.map((l) => ({
          label: l,
          isCorrect: l === letter,
        })),
      };
    }

    // 9. PATTERN LOGIC (Lanjutkan Pola)
    if (gameId === 'pattern') {
      const emojis = ['🍎', '🍌', '⭐', '🚗', '🐱', '🌻'].sort(() => Math.random() - 0.5);
      const a = emojis[0];
      const b = emojis[1];
      const c = emojis[2];

      const patternType = level === 0 ? 'ABAB' : level === 1 ? 'AABAAB' : 'ABCABC';
      let sequence: string[] = [];
      let nextEmoji = '';

      if (patternType === 'ABAB') {
        sequence = [a, b, a, b, a];
        nextEmoji = b;
      } else if (patternType === 'AABAAB') {
        sequence = [a, a, b, a, a];
        nextEmoji = b;
      } else {
        sequence = [a, b, c, a, b];
        nextEmoji = c;
      }

      const allChoices = [a, b, c].sort(() => Math.random() - 0.5);

      return {
        promptText: lang === 'id' ? 'Apa gambar berikutnya?' : 'What comes next?',
        questionVisual: (
          <div className="flex items-center justify-center gap-2 text-4xl font-black">
            {sequence.map((em, i) => (
              <span key={i}>{em}</span>
            ))}
            <span className="text-indigo-600 bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-dashed border-indigo-300">
              ?
            </span>
          </div>
        ),
        options: allChoices.map((em) => ({
          label: em,
          isCorrect: em === nextEmoji,
        })),
      };
    }

    // 10. ODD ONE OUT (Mana yang Berbeda)
    if (gameId === 'odd') {
      const catA = ANIMALS.sort(() => Math.random() - 0.5).slice(0, 3);
      const catB = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
      const mixed = [...catA, catB].sort(() => Math.random() - 0.5);

      return {
        promptText: lang === 'id' ? 'Mana yang BERBEDA jenisnya?' : 'Which one is the ODD one out?',
        options: mixed.map((item) => ({
          label: lang === 'id' ? item.nameId : item.nameEn,
          visual: <ItemIcon name={item.nameId} emoji={item.emoji} category={item.category} size="3rem" />,
          isCorrect: item.category === 'vehicles',
        })),
      };
    }

    // 11. COMPARE NUMBERS (Mana Lebih Besar)
    if (gameId === 'compare') {
      const maxNum = level === 0 ? 10 : level === 1 ? 30 : 100;
      const numA = Math.floor(Math.random() * (maxNum - 2)) + 1;
      let numB = Math.floor(Math.random() * (maxNum - 2)) + 1;
      while (numA === numB) numB = Math.floor(Math.random() * (maxNum - 2)) + 1;

      const pickBigger = Math.random() < 0.5;
      const correctNum = pickBigger ? Math.max(numA, numB) : Math.min(numA, numB);

      return {
        promptText: pickBigger
          ? lang === 'id'
            ? 'Pilih angka yang LEBIH BESAR:'
            : 'Pick the BIGGER number:'
          : lang === 'id'
          ? 'Pilih angka yang LEBIH KECIL:'
          : 'Pick the SMALLER number:',
        questionVisual: <div className="text-5xl font-black text-indigo-700">⚖️</div>,
        options: [
          { label: `${numA}`, isCorrect: numA === correctNum },
          { label: `${numB}`, isCorrect: numB === correctNum },
        ],
      };
    }

    // 12. QUICK MATH (Hitung Cepat)
    const isAdd = level <= 1 || Math.random() < 0.6;
    let n1 = level === 0 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 15) + 3;
    let n2 = level === 0 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 10) + 1;
    let ans = isAdd ? n1 + n2 : n1 - n2;
    if (!isAdd && n1 < n2) {
      const temp = n1;
      n1 = n2;
      n2 = temp;
      ans = n1 - n2;
    }

    const distractors = [ans - 1, ans + 1, ans + 2, ans - 2].filter((n) => n >= 0 && n !== ans);
    const chosenDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, numChoices - 1);
    const allNums = [ans, ...chosenDistractors].sort(() => Math.random() - 0.5);

    return {
      promptText: lang === 'id' ? 'Berapa hasilnya?' : 'What is the answer?',
      questionVisual: (
        <span className="text-4xl md:text-5xl font-black text-indigo-900 tracking-wider">
          {n1} {isAdd ? '+' : '−'} {n2} = ?
        </span>
      ),
      spokenText: `${ans}`,
      options: allNums.map((n) => ({
        label: `${n}`,
        isCorrect: n === ans,
      })),
    };
  };

  useEffect(() => {
    const q = generateQuestion();
    setCurrentQ(q);
    setIsLocked(false);
    setSelectedIdx(null);
    setFeedback('');

    if (q.soundEmoji) {
      setTimeout(() => playAnimalSound(q.soundEmoji!), 400);
    }
  }, [currentIndex]);

  const handleSelect = (idx: number, isCorrect: boolean) => {
    if (isLocked) return;
    setIsLocked(true);
    setSelectedIdx(idx);

    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    const affirmationsId = [
      `🌟 Hebat sekali, ${displayName}! Jawabanmu benar!`,
      `🎉 Pintar banget, ${displayName}! Kamu luar biasa!`,
      `👏 Keren, ${displayName}! Tepat sekali!`,
      `✨ Luar biasa, ${displayName}! Mantap!`,
      `🌈 Bagus sekali, ${displayName}! Benar lagi!`,
    ];
    const affirmationsEn = [
      `🌟 Great job, ${displayName}! You're right!`,
      `🎉 So smart, ${displayName}! Amazing!`,
      `👏 Awesome, ${displayName}! Correct!`,
      `✨ Outstanding, ${displayName}!`,
    ];

    if (isCorrect) {
      SFX.ding();
      const randomAffirmation = lang === 'id'
        ? affirmationsId[Math.floor(Math.random() * affirmationsId.length)]
        : affirmationsEn[Math.floor(Math.random() * affirmationsEn.length)];
      setFeedback(randomAffirmation);

      setTimeout(() => {
        const spokenAffirmation = lang === 'id'
          ? `Hebat sekali, ${displayName}!`
          : `Great job, ${displayName}!`;

        if (currentQ?.soundEmoji) {
          playAnimalSound(currentQ.soundEmoji, () => {
            if (currentQ?.spokenText) {
              speakText(`${spokenAffirmation} ${currentQ.spokenText}`, lang);
            } else {
              speakText(spokenAffirmation, lang);
            }
          });
        } else if (currentQ?.spokenText) {
          speakText(`${spokenAffirmation}. ${currentQ.spokenText}`, lang);
        } else {
          speakText(spokenAffirmation, lang);
        }

        setTimeout(() => {
          if (currentIndex + 1 >= totalQuestions) {
            const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
            onWin(stars, `${currentIndex + 1}/${totalQuestions} soal terjawab dengan baik!`);
          } else {
            setCurrentIndex((i) => i + 1);
          }
        }, 750);
      }, 300);
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      const wrongText = lang === 'id' ? 'Coba lagi yaa!' : 'Try again!';
      setFeedback(wrongText);
      speakText(wrongText, lang);

      setTimeout(() => {
        setIsLocked(false);
        setSelectedIdx(null);
      }, 850);
    }
  };

  if (!currentQ) return null;

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto px-3 sm:px-4 py-2 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2 mb-2 sm:mb-3 bg-white/90 backdrop-blur-md px-3.5 sm:px-4 rounded-2xl shadow-sm border border-slate-100">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
          <span>{gameDef?.emoji}</span>
          <span className="truncate">{lang === 'id' ? gameDef?.nameId : gameDef?.nameEn}</span>
        </div>

        <div className="flex items-center gap-1 text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl tabular-nums shrink-0">
          <span>{currentIndex + 1}</span>
          <span className="opacity-50">/</span>
          <span>{totalQuestions}</span>
        </div>
      </div>

      {/* Main Question Container */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 py-2 w-full">
        <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 text-center leading-snug px-2">
          {currentQ.promptText}
        </h2>

        {/* Question Visual Container */}
        <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-3xl bg-white border-4 border-indigo-100 shadow-md flex items-center justify-center p-3 relative shrink-0">
          {currentQ.questionVisual}

          {currentQ.soundEmoji && (
            <button
              onClick={() => playAnimalSound(currentQ.soundEmoji!)}
              className="absolute -bottom-2.5 -right-2.5 w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 flex items-center justify-center shadow-md cursor-pointer active:scale-95 border-2 border-white"
              aria-label="Dengarkan Suara"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Feedback message (With Child Name Affirmation & High Contrast) */}
        <div className="min-h-[2.5rem] flex items-center justify-center px-2 w-full">
          {feedback ? (
            <div
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black animate-scale-up shadow-xs text-center ${
                feedback.includes('Coba lagi') || feedback.includes('Try again')
                  ? 'bg-rose-100 text-rose-700 border-2 border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
              }`}
            >
              {feedback}
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>

        {/* Options (Touch-Friendly for Phones & Tablets) */}
        <div
          className={`w-full grid gap-2.5 sm:gap-3 max-w-md ${
            currentQ.options.length === 2
              ? 'grid-cols-2'
              : currentQ.options.length === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-2'
          }`}
        >
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm';

            if (isSelected) {
              if (opt.isCorrect) {
                btnClass = 'bg-emerald-400 text-emerald-950 border-emerald-500 ring-4 ring-emerald-300 scale-102';
              } else {
                btnClass = 'bg-rose-200 text-rose-950 border-rose-400 animate-shake';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx, opt.isCorrect)}
                disabled={isLocked}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-3 font-black text-sm sm:text-base md:text-lg transition-all cursor-pointer active:scale-95 min-h-[64px] sm:min-h-[72px] select-none ${btnClass}`}
              >
                {opt.visual && <div className="mb-1">{opt.visual}</div>}
                <span className="truncate w-full text-center px-1">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

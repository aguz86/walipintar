import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Star,
  ChevronRight,
  ChevronLeft,
  PenTool,
  HelpCircle,
  BookOpen,
  Shuffle,
  Music,
  X,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import {
  ALPHABET_LIST,
  WORD_BUILDER_ITEMS,
  AlphabetItem,
  WordBuilderItem,
} from '../data/alphabet';
import { SFX, speakText, unlockAudio } from '../utils/audio';

interface AlphabetPhonicsGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  playerName: string;
  level: number; // 0 = Si Kecil, 1 = Pintar, 2 = Juara
  onWin: (stars: number, scoreText: string) => void;
}

interface FloatingBubble {
  id: number;
  letter: string;
  emoji: string;
  x: number; // percentage 5% to 85%
  speed: number;
  color: string;
  popped: boolean;
}

export const AlphabetPhonicsGame: React.FC<AlphabetPhonicsGameProps> = ({
  onBack,
  lang,
  playerName,
  level,
  onWin,
}) => {
  // 5 Engaging Modes: 'cards' | 'bubble' | 'wordbuilder' | 'quiz' | 'trace'
  const [activeTab, setActiveTab] = useState<'cards' | 'bubble' | 'wordbuilder' | 'quiz' | 'trace'>('cards');

  // Cards filter: 'all' | 'vowels' | 'consonants'
  const [filterType, setFilterType] = useState<'all' | 'vowels' | 'consonants'>('all');

  // Active example index for each letter: { [letter]: number }
  const [cardExampleIndices, setCardExampleIndices] = useState<Record<string, number>>({});

  // Playing letter animation pulse
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);

  // Auto-play Karaoke A-Z state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayIndexRef = useRef(0);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detail Modal for a single letter
  const [selectedLetter, setSelectedLetter] = useState<AlphabetItem | null>(null);

  // --- 1. WORD BUILDER MODE STATE ---
  const filteredWords = WORD_BUILDER_ITEMS.filter((w) => w.level <= level);
  const [wordIndex, setWordIndex] = useState(0);
  const currentWordItem: WordBuilderItem = filteredWords[wordIndex] || filteredWords[0];
  const [placedLetters, setPlacedLetters] = useState<string[]>([]);
  const [availableTiles, setAvailableTiles] = useState<{ id: string; letter: string; used: boolean }[]>([]);
  const [wordCompleted, setWordCompleted] = useState(false);

  // Setup word builder round
  const setupWordRound = (item: WordBuilderItem) => {
    setPlacedLetters(new Array(item.letters.length).fill(''));
    setWordCompleted(false);

    // Scramble letters with 1-2 random distractors for older kids
    const lettersCopy = [...item.letters];
    if (level >= 1) {
      const alphabetPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomExtra = alphabetPool[Math.floor(Math.random() * alphabetPool.length)];
      lettersCopy.push(randomExtra);
    }
    // Shuffle
    const shuffled = lettersCopy
      .map((letter, idx) => ({ id: `${letter}-${idx}-${Math.random()}`, letter, used: false }))
      .sort(() => Math.random() - 0.5);

    setAvailableTiles(shuffled);
  };

  useEffect(() => {
    if (activeTab === 'wordbuilder' && currentWordItem) {
      setupWordRound(currentWordItem);
    }
  }, [activeTab, wordIndex]);

  const handleTileClick = (tileId: string, letter: string) => {
    if (wordCompleted) return;
    unlockAudio();
    SFX.pop();

    // Find first empty slot
    const emptyIndex = placedLetters.findIndex((l) => l === '');
    if (emptyIndex === -1) return;

    const newPlaced = [...placedLetters];
    newPlaced[emptyIndex] = letter;
    setPlacedLetters(newPlaced);

    // Mark tile as used
    setAvailableTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, used: true } : t))
    );

    // Play letter sound
    speakText(letter, lang);

    // Check if word is complete
    if (emptyIndex === currentWordItem.letters.length - 1) {
      const builtWord = newPlaced.join('');
      if (builtWord === currentWordItem.word) {
        // Correct word!
        setWordCompleted(true);
        SFX.fanfare();
        const praise =
          lang === 'id'
            ? `Hebat sekali ${playerName || 'sayang'}! Kata ${currentWordItem.word} tersusun benar!`
            : `Awesome job! You spelled ${currentWordItem.word}!`;
        speakText(praise, lang);
        onWin(2, builtWord);
      } else {
        // Incorrect
        SFX.no();
        const retryText = lang === 'id' ? 'Coba susun lagi yaa!' : 'Try arranging again!';
        speakText(retryText, lang);
      }
    }
  };

  const handleRemovePlacedLetter = (index: number) => {
    if (wordCompleted) return;
    const letterToRemove = placedLetters[index];
    if (!letterToRemove) return;

    SFX.bloop();
    const newPlaced = [...placedLetters];
    newPlaced[index] = '';
    setPlacedLetters(newPlaced);

    // Free the tile back
    setAvailableTiles((prev) => {
      let freed = false;
      return prev.map((t) => {
        if (!freed && t.used && t.letter === letterToRemove) {
          freed = true;
          return { ...t, used: false };
        }
        return t;
      });
    });
  };

  // --- 2. BUBBLE POP MINIGAME STATE ---
  const [bubbleTarget, setBubbleTarget] = useState<AlphabetItem>(ALPHABET_LIST[0]);
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [bubbleScore, setBubbleScore] = useState(0);
  const [bubbleRound, setBubbleRound] = useState(1);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize bubble pop round
  const startBubbleRound = () => {
    const randomTarget = ALPHABET_LIST[Math.floor(Math.random() * ALPHABET_LIST.length)];
    setBubbleTarget(randomTarget);

    const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    const otherLetters = ALPHABET_LIST.filter((l) => l.letter !== randomTarget.letter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    // 2-3 target bubbles + 4 distractors
    const roundList = [
      randomTarget,
      randomTarget,
      level === 0 ? randomTarget : otherLetters[0],
      otherLetters[1],
      otherLetters[2],
      otherLetters[3],
    ].sort(() => Math.random() - 0.5);

    const generatedBubbles: FloatingBubble[] = roundList.map((item, idx) => ({
      id: Date.now() + idx,
      letter: item.letter,
      emoji: item.emoji,
      x: 10 + (idx * 15) % 80,
      speed: 1.5 + Math.random() * 1.5,
      color: colors[idx % colors.length],
      popped: false,
    }));

    setBubbles(generatedBubbles);

    // Voice prompt
    const promptText =
      lang === 'id'
        ? `Pecahkan gelembung huruf ${randomTarget.letter}!`
        : `Pop the letter ${randomTarget.letter} bubbles!`;
    speakText(promptText, lang);
  };

  useEffect(() => {
    if (activeTab === 'bubble') {
      startBubbleRound();
    }
  }, [activeTab]);

  const handlePopBubble = (bubble: FloatingBubble) => {
    if (bubble.popped) return;
    unlockAudio();

    if (bubble.letter === bubbleTarget.letter) {
      SFX.pop();
      setBubbles((prev) =>
        prev.map((b) => (b.id === bubble.id ? { ...b, popped: true } : b))
      );
      setBubbleScore((s) => s + 1);

      // Check if all target bubbles popped
      const remainingTarget = bubbles.filter(
        (b) => b.letter === bubbleTarget.letter && !b.popped && b.id !== bubble.id
      );

      if (remainingTarget.length === 0) {
        SFX.fanfare();
        const praise =
          lang === 'id'
            ? `Pintar sekali, ${playerName || 'kamu'}! Semua huruf ${bubbleTarget.letter} berhasil dipecahkan!`
            : `Great job! You popped all letter ${bubbleTarget.letter} bubbles!`;
        speakText(praise, lang);
        onWin(2, `${bubbleScore + 1} Poin`);

        setTimeout(() => {
          setBubbleRound((r) => r + 1);
          startBubbleRound();
        }, 1200);
      }
    } else {
      SFX.no();
      const retry =
        lang === 'id'
          ? `Itu huruf ${bubble.letter}. Cari huruf ${bubbleTarget.letter} yaa!`
          : `That is letter ${bubble.letter}. Find letter ${bubbleTarget.letter}!`;
      speakText(retry, lang);
    }
  };

  // --- 3. QUIZ MODE STATE ---
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal] = useState(level === 0 ? 5 : level === 1 ? 8 : 10);
  const [currentQuestion, setCurrentQuestion] = useState<{
    target: AlphabetItem;
    choices: AlphabetItem[];
    type: 'sound' | 'word' | 'missing';
  } | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isQuizLocked, setIsQuizLocked] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<string>('');

  // --- 4. TRACING MODE STATE ---
  const [traceLetterIdx, setTraceLetterIdx] = useState(0);
  const [isTracingUpper, setIsTracingUpper] = useState(true);
  const traceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isTracingRef = useRef(false);
  const [traceColor, setTraceColor] = useState('#ef4444');
  const [traceCleared, setTraceCleared] = useState(0);

  // Cleanup auto-play on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filtered letters for Cards
  const displayedLetters = ALPHABET_LIST.filter((item) => {
    if (filterType === 'vowels') return item.isVowel;
    if (filterType === 'consonants') return !item.isVowel;
    return true;
  });

  // Cycle example word on card
  const handleCycleExample = (letter: string, e: React.MouseEvent) => {
    e.stopPropagation();
    SFX.bloop();
    setCardExampleIndices((prev) => {
      const currentIdx = prev[letter] || 0;
      const targetItem = ALPHABET_LIST.find((a) => a.letter === letter);
      const totalExamples = targetItem?.examples.length || 1;
      return {
        ...prev,
        [letter]: (currentIdx + 1) % totalExamples,
      };
    });
  };

  // Play audio for a letter
  const handlePlayLetter = (item: AlphabetItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    unlockAudio();
    SFX.pop();
    setPlayingLetter(item.letter);

    const activeExampleIdx = cardExampleIndices[item.letter] || 0;
    const example = item.examples[activeExampleIdx] || item.examples[0];

    const speechText =
      lang === 'id'
        ? `Huruf ${item.letter}. ${example ? example.phonicId : item.phonicId}`
        : `Letter ${item.letter}. ${example ? example.phonicEn : item.phonicEn}`;

    speakText(speechText, lang, () => {
      setPlayingLetter(null);
    });
  };

  // Auto Play A-Z Sequence (Karaoke)
  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingLetter(null);
  };

  const startAutoPlay = () => {
    unlockAudio();
    SFX.ding();
    setIsAutoPlaying(true);
    autoPlayIndexRef.current = 0;
    playNextInSequence();
  };

  const playNextInSequence = () => {
    if (autoPlayIndexRef.current >= ALPHABET_LIST.length) {
      setIsAutoPlaying(false);
      setPlayingLetter(null);
      SFX.fanfare();
      speakText(
        lang === 'id'
          ? `Hore, ${playerName || 'kamu'} sudah mendengarkan semua huruf A sampai Z!`
          : `Hurray, you listened to all letters from A to Z!`,
        lang
      );
      return;
    }

    const currentItem = ALPHABET_LIST[autoPlayIndexRef.current];
    setPlayingLetter(currentItem.letter);

    const phrase =
      lang === 'id'
        ? `${currentItem.letter}... untuk ${currentItem.wordId}!`
        : `${currentItem.letter}... is for ${currentItem.wordEn}!`;

    speakText(phrase, lang, () => {
      autoPlayIndexRef.current += 1;
      autoPlayTimerRef.current = setTimeout(() => {
        playNextInSequence();
      }, 500);
    });
  };

  // --- QUIZ LOGIC ---
  const generateQuizQuestion = () => {
    const numChoices = level === 0 ? 2 : level === 1 ? 3 : 4;
    const target = ALPHABET_LIST[Math.floor(Math.random() * ALPHABET_LIST.length)];
    const others = ALPHABET_LIST.filter((i) => i.letter !== target.letter);
    const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, numChoices - 1);
    const choices = [target, ...shuffledOthers].sort(() => Math.random() - 0.5);

    const questionTypes: ('sound' | 'word' | 'missing')[] =
      level === 0 ? ['sound', 'word'] : ['sound', 'word', 'missing'];
    const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    setCurrentQuestion({ target, choices, type });
    setSelectedChoice(null);
    setIsQuizLocked(false);
    setQuizFeedback('');

    setTimeout(() => {
      playQuestionAudio(target, type);
    }, 200);
  };

  const playQuestionAudio = (target: AlphabetItem, type: 'sound' | 'word' | 'missing') => {
    unlockAudio();
    let prompt = '';
    if (type === 'sound') {
      prompt =
        lang === 'id'
          ? `Dengarkan baik-baik. Mana huruf ${target.letter}? ${target.letter}!`
          : `Listen carefully. Which one is letter ${target.letter}?`;
    } else if (type === 'word') {
      prompt =
        lang === 'id'
          ? `Huruf awal untuk ${target.wordId} adalah apa yaa?`
          : `What is the first letter for ${target.wordEn}?`;
    } else {
      prompt =
        lang === 'id'
          ? `Lengkapi kata berikut untuk ${target.wordId}! Huruf depannya adalah?`
          : `Complete the word for ${target.wordEn}! What is the missing letter?`;
    }
    speakText(prompt, lang);
  };

  useEffect(() => {
    if (activeTab === 'quiz') {
      setQuizIndex(0);
      setQuizScore(0);
      generateQuizQuestion();
    }
  }, [activeTab]);

  const handleChoiceClick = (choice: AlphabetItem) => {
    if (isQuizLocked || !currentQuestion) return;
    setIsQuizLocked(true);
    setSelectedChoice(choice.letter);
    unlockAudio();

    const isCorrect = choice.letter === currentQuestion.target.letter;

    if (isCorrect) {
      SFX.ding();
      setQuizScore((prev) => prev + 1);
      setQuizFeedback(
        lang === 'id'
          ? `Benar sekali, ${playerName || 'hebat'}! Huruf ${choice.letter} untuk ${choice.wordId}!`
          : `That is right, ${playerName || 'great'}! Letter ${choice.letter} for ${choice.wordEn}!`
      );
      speakText(
        lang === 'id'
          ? `Benar sekali, ${playerName || 'hebat'}!`
          : `Awesome, ${playerName || 'friend'}!`,
        lang
      );
    } else {
      SFX.no();
      setQuizFeedback(
        lang === 'id'
          ? `Coba lagi yaa ${playerName || 'sayang'}! Jawaban yang benar adalah ${currentQuestion.target.letter}.`
          : `Try again! The correct letter is ${currentQuestion.target.letter}.`
      );
      speakText(
        lang === 'id' ? `Coba lagi yaa!` : `Try again!`,
        lang
      );
    }

    setTimeout(() => {
      if (quizIndex + 1 < quizTotal) {
        setQuizIndex((prev) => prev + 1);
        generateQuizQuestion();
      } else {
        const finalScore = quizScore + (isCorrect ? 1 : 0);
        const starsEarned = finalScore >= quizTotal * 0.8 ? 3 : finalScore >= quizTotal * 0.5 ? 2 : 1;
        SFX.fanfare();
        speakText(
          lang === 'id'
            ? `Hore, ${playerName || 'kamu'} menyelesaikan kuis huruf dengan nilai ${finalScore} dari ${quizTotal}!`
            : `Hurray, you finished the alphabet quiz! Score ${finalScore} of ${quizTotal}!`,
          lang
        );
        onWin(starsEarned, `${finalScore}/${quizTotal}`);
      }
    }, 2000);
  };

  // --- TRACING LOGIC ---
  const activeTraceItem = ALPHABET_LIST[traceLetterIdx];

  useEffect(() => {
    if (activeTab === 'trace') {
      const canvas = traceCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background guidelines
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Guided dotted outline
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Draw large letter template in soft gray
      ctx.setLineDash([]);
      ctx.font = 'bold 220px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(
        isTracingUpper ? activeTraceItem.letter : activeTraceItem.lower,
        canvas.width / 2,
        canvas.height / 2
      );

      // Draw dashed outline of letter
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.strokeText(
        isTracingUpper ? activeTraceItem.letter : activeTraceItem.lower,
        canvas.width / 2,
        canvas.height / 2
      );
      ctx.setLineDash([]);
    }
  }, [activeTab, traceLetterIdx, traceCleared, isTracingUpper]);

  const startTracing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudio();
    isTracingRef.current = true;
    drawTrace(e);
  };

  const stopTracing = () => {
    if (isTracingRef.current) {
      isTracingRef.current = false;
      const canvas = traceCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const drawTrace = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTracingRef.current) return;
    const canvas = traceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineWidth = level === 0 ? 28 : level === 1 ? 20 : 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = traceColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleFinishTracing = () => {
    SFX.fanfare();
    const speech =
      lang === 'id'
        ? `Bagus sekali tulisan huruf ${activeTraceItem.letter} milik ${playerName || 'kamu'}!`
        : `Great tracing of letter ${activeTraceItem.letter}!`;
    speakText(speech, lang);
    onWin(2, `Huruf ${activeTraceItem.letter}`);
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-2 sm:px-4 py-2 flex-1 flex flex-col">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs md:text-sm cursor-pointer transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'id' ? 'Kembali' : 'Back'}</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-tight flex items-center justify-center gap-1.5">
            <span className="text-xl">🔤</span>
            <span>{lang === 'id' ? 'Belajar Abjad & Fonik A-Z' : 'Alphabet & Phonics Fun'}</span>
          </h2>
          <span className="text-[10px] sm:text-xs font-bold text-indigo-700">
            {activeTab === 'cards' && (lang === 'id' ? '26 Huruf & 100+ Kosakata Ceria' : '26 Letters & 100+ Words')}
            {activeTab === 'bubble' && (lang === 'id' ? 'Pecah Gelembung Suara Huruf' : 'Alphabet Bubble Pop')}
            {activeTab === 'wordbuilder' && (lang === 'id' ? 'Papan Susun Kata Pintar' : 'Word Builder Puzzle')}
            {activeTab === 'quiz' && (lang === 'id' ? 'Kuis Tebak Huruf & Suara' : 'Phonics Sound Quiz')}
            {activeTab === 'trace' && (lang === 'id' ? 'Lacak & Tulis Huruf Besar/Kecil' : 'Letter Tracing')}
          </span>
        </div>

        {/* Karaoke Auto Play Button */}
        <button
          onClick={isAutoPlaying ? stopAutoPlay : startAutoPlay}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs cursor-pointer transition-all ${
            isAutoPlaying
              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
          }`}
          title="Putar Lagu Suara A sampai Z"
        >
          {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span className="hidden sm:inline">
            {isAutoPlaying ? (lang === 'id' ? 'Berhenti' : 'Stop') : (lang === 'id' ? 'Lagu A-Z' : 'Song A-Z')}
          </span>
        </button>
      </div>

      {/* 5 Distinct Activity Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 mb-3 overflow-x-auto no-scrollbar pb-1 bg-white/70 backdrop-blur-xs p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => {
            setActiveTab('cards');
            SFX.bloop();
          }}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'cards'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Kartu A-Z' : 'Cards'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('bubble');
            SFX.bloop();
          }}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'bubble'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Gelembung' : 'Bubble Pop'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('wordbuilder');
            SFX.bloop();
          }}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'wordbuilder'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Susun Kata' : 'Word Builder'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('quiz');
            SFX.bloop();
          }}
          className={`flex-1 min-w-[80px] py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Kuis' : 'Quiz'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('trace');
            SFX.bloop();
          }}
          className={`flex-1 min-w-[80px] py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'trace'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Tulis' : 'Trace'}</span>
        </button>
      </div>

      {/* ================= TAB 1: CARDS & PHONICS ================= */}
      {activeTab === 'cards' && (
        <div className="flex-1 flex flex-col gap-3">
          {/* Vowels / Consonants Filter Chips */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setFilterType('all');
                  SFX.bloop();
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  filterType === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lang === 'id' ? 'Semua (A-Z)' : 'All Letters'}
              </button>
              <button
                onClick={() => {
                  setFilterType('vowels');
                  SFX.bloop();
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  filterType === 'vowels'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lang === 'id' ? 'Huruf Vokal (A, I, U, E, O)' : 'Vowels'}
              </button>
              <button
                onClick={() => {
                  setFilterType('consonants');
                  SFX.bloop();
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  filterType === 'consonants'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lang === 'id' ? 'Konsonan' : 'Consonants'}
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-500">
              {displayedLetters.length} {lang === 'id' ? 'Huruf' : 'Letters'}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {displayedLetters.map((item) => {
              const isPlaying = playingLetter === item.letter;
              const exampleIdx = cardExampleIndices[item.letter] || 0;
              const activeExample = item.examples[exampleIdx] || item.examples[0];

              return (
                <div
                  key={item.letter}
                  onClick={() => setSelectedLetter(item)}
                  className={`relative p-3 rounded-3xl border-3 transition-all duration-200 cursor-pointer flex flex-col items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                    isPlaying
                      ? 'border-indigo-500 ring-4 ring-indigo-200 bg-white scale-103'
                      : 'border-slate-200/90 hover:border-indigo-300 bg-white'
                  }`}
                  style={{
                    backgroundColor: isPlaying ? '#eef2ff' : undefined,
                  }}
                >
                  {/* Top Badge: Letter & Vowel Indicator */}
                  <div className="w-full flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                      {item.letter}
                      <span className="text-slate-400 font-bold text-lg ml-0.5">{item.lower}</span>
                    </span>

                    {item.isVowel && (
                      <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">
                        {lang === 'id' ? 'Vokal' : 'Vowel'}
                      </span>
                    )}
                  </div>

                  {/* Big Friendly Object Emoji */}
                  <div className="my-2 text-4xl sm:text-5xl transition-transform hover:scale-115">
                    {activeExample ? activeExample.emoji : item.emoji}
                  </div>

                  {/* Word Name */}
                  <div className="text-center w-full">
                    <p className="font-black text-xs sm:text-sm text-slate-800 truncate">
                      {lang === 'id'
                        ? activeExample ? activeExample.wordId : item.wordId
                        : activeExample ? activeExample.wordEn : item.wordEn}
                    </p>
                  </div>

                  {/* Bottom Action Buttons: Listen & Cycle Example */}
                  <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => handleCycleExample(item.letter, e)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Ganti Contoh Kata Lain"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="text-[9px]">{exampleIdx + 1}/{item.examples.length}</span>
                    </button>

                    <button
                      onClick={(e) => handlePlayLetter(item, e)}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-indigo-600 text-white scale-110'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                      title="Dengarkan Suara Huruf"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: BUBBLE POP MINIGAME ================= */}
      {activeTab === 'bubble' && (
        <div className="flex-1 flex flex-col gap-3">
          {/* Score & Prompt Header */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-3 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎈</span>
              <div>
                <p className="text-xs uppercase tracking-wide font-black opacity-90">
                  {lang === 'id' ? 'Misi Pecahkan Huruf:' : 'Target Letter:'}
                </p>
                <p className="text-lg font-black flex items-center gap-2">
                  <span className="bg-white text-rose-600 px-2 py-0.5 rounded-lg text-xl">
                    {bubbleTarget.letter} {bubbleTarget.lower}
                  </span>
                  <span>({lang === 'id' ? bubbleTarget.wordId : bubbleTarget.wordEn})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] opacity-80 uppercase font-black">{lang === 'id' ? 'Skor' : 'Score'}</span>
                <p className="text-xl font-black">⭐ {bubbleScore}</p>
              </div>
              <button
                onClick={startBubbleRound}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl cursor-pointer"
                title="Acak Huruf Baru"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floating Bubble Sky Area */}
          <div className="flex-1 bg-gradient-to-b from-sky-100 via-sky-50 to-indigo-50 rounded-3xl border-3 border-sky-200 shadow-md p-4 min-h-[380px] relative overflow-hidden flex flex-wrap items-center justify-around gap-4">
            {bubbles.map((bubble) => (
              <button
                key={bubble.id}
                onClick={() => handlePopBubble(bubble)}
                disabled={bubble.popped}
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform select-none ${
                  bubble.popped
                    ? 'scale-0 opacity-0 pointer-events-none'
                    : 'hover:scale-110 active:scale-95 animate-bounce shadow-lg ring-4 ring-white/60'
                }`}
                style={{
                  backgroundColor: bubble.color,
                  animationDuration: `${bubble.speed}s`,
                }}
              >
                {/* Bubble Gloss Highlight */}
                <span className="absolute top-2 left-3 w-5 h-2.5 bg-white/40 rounded-full rotate-[-30deg]" />

                <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                  {bubble.letter}
                </span>
                <span className="text-sm opacity-90 drop-shadow-xs">{bubble.emoji}</span>
              </button>
            ))}
          </div>

          <div className="text-center text-xs font-bold text-slate-500">
            {lang === 'id'
              ? '💡 Ketuk dan pecahkan gelembung dengan huruf yang sesuai untuk mendapat bintang!'
              : '💡 Tap and pop bubbles that match the requested target letter!'}
          </div>
        </div>
      )}

      {/* ================= TAB 3: WORD BUILDER PUZZLE ================= */}
      {activeTab === 'wordbuilder' && (
        <div className="flex-1 flex flex-col gap-4 items-center justify-center">
          {/* Word Item Card */}
          <div className="w-full max-w-xl bg-white p-5 rounded-3xl border-3 border-amber-300 shadow-md flex flex-col items-center gap-4">
            {/* Top Navigation */}
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2">
              <button
                onClick={() => {
                  setWordIndex((prev) => (prev > 0 ? prev - 1 : filteredWords.length - 1));
                  SFX.bloop();
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                {lang === 'id' ? `Kata ${wordIndex + 1} dari ${filteredWords.length}` : `Word ${wordIndex + 1} of ${filteredWords.length}`}
              </span>

              <button
                onClick={() => {
                  setWordIndex((prev) => (prev < filteredWords.length - 1 ? prev + 1 : 0));
                  SFX.bloop();
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Picture & Hint */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-6xl sm:text-7xl animate-pulse">{currentWordItem.emoji}</span>
              <p className="text-xs font-bold text-slate-500 text-center">
                {lang === 'id' ? currentWordItem.hintId : currentWordItem.hintEn}
              </p>
            </div>

            {/* Empty Slots for Letters */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 py-2 max-w-full">
              {currentWordItem.letters.map((_, idx) => {
                const filledLetter = placedLetters[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleRemovePlacedLetter(idx)}
                    className={`w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 rounded-xl sm:rounded-2xl font-black text-xl sm:text-2xl md:text-3xl flex items-center justify-center border-3 transition-all cursor-pointer ${
                      filledLetter
                        ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-103'
                        : 'bg-slate-100 text-slate-400 border-dashed border-slate-300'
                    }`}
                  >
                    {filledLetter || '_'}
                  </button>
                );
              })}
            </div>

            {/* Word Completion Celebration or Available Scrambled Letter Tiles */}
            {wordCompleted ? (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-2xl flex items-center gap-3 w-full justify-center animate-bounce">
                <Trophy className="w-6 h-6 text-emerald-600" />
                <span className="font-black text-sm">
                  {lang === 'id' ? `Hore! Kata ${currentWordItem.word} selesai!` : `Awesome! Word ${currentWordItem.word} finished!`}
                </span>
                <button
                  onClick={() => {
                    setWordIndex((prev) => (prev < filteredWords.length - 1 ? prev + 1 : 0));
                    SFX.ding();
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs min-h-[36px]"
                >
                  {lang === 'id' ? 'Kata Berikutnya →' : 'Next Word →'}
                </button>
              </div>
            ) : (
              <div className="w-full">
                <p className="text-xs font-black text-slate-600 text-center mb-2 uppercase tracking-wide">
                  {lang === 'id' ? 'Pilih Huruf Untuk Disusun:' : 'Pick Letters to Place:'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  {availableTiles.map((tile) => (
                    <button
                      key={tile.id}
                      disabled={tile.used}
                      onClick={() => handleTileClick(tile.id, tile.letter)}
                      className={`w-10 h-12 sm:w-11 sm:h-13 md:w-12 md:h-14 rounded-xl sm:rounded-2xl font-black text-lg sm:text-xl md:text-2xl flex items-center justify-center border-2 transition-all cursor-pointer min-w-[38px] min-h-[44px] ${
                        tile.used
                          ? 'opacity-20 border-slate-200 pointer-events-none'
                          : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-300 shadow-xs hover:scale-108 active:scale-95'
                      }`}
                    >
                      {tile.letter}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: PHONICS QUIZ ================= */}
      {activeTab === 'quiz' && currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-4">
          {/* Quiz Card */}
          <div className="w-full bg-white p-5 rounded-3xl border-3 border-emerald-200 shadow-md flex flex-col items-center gap-4">
            {/* Progress Header */}
            <div className="w-full flex items-center justify-between text-xs font-black text-slate-600 border-b border-slate-100 pb-2">
              <span>{lang === 'id' ? `Pertanyaan ${quizIndex + 1} / ${quizTotal}` : `Question ${quizIndex + 1} / ${quizTotal}`}</span>
              <span className="text-emerald-700">⭐ {quizScore} {lang === 'id' ? 'Benar' : 'Correct'}</span>
            </div>

            {/* Question Illustration & Audio Prompt */}
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-6xl sm:text-7xl">{currentQuestion.target.emoji}</span>
              <p className="font-black text-base text-slate-800">
                {currentQuestion.type === 'sound' && (lang === 'id' ? 'Dengarkan suara & pilih hurufnya:' : 'Listen & pick the letter:')}
                {currentQuestion.type === 'word' && (lang === 'id' ? `Apa huruf awal untuk ${currentQuestion.target.wordId}?` : `What is the first letter for ${currentQuestion.target.wordEn}?`)}
                {currentQuestion.type === 'missing' && (
                  <span>
                    _ {currentQuestion.target.wordId.slice(1).toUpperCase()}
                  </span>
                )}
              </p>

              <button
                onClick={() => playQuestionAudio(currentQuestion.target, currentQuestion.type)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-xs cursor-pointer transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>{lang === 'id' ? 'Putar Suara Pertanyaan' : 'Replay Sound'}</span>
              </button>
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full pt-2">
              {currentQuestion.choices.map((choice) => {
                const isSelected = selectedChoice === choice.letter;
                const isCorrect = choice.letter === currentQuestion.target.letter;

                let btnStyle = 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-300';
                if (isSelected) {
                  btnStyle = isCorrect
                    ? 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-200 scale-105'
                    : 'bg-rose-500 text-white border-rose-600 ring-4 ring-rose-200';
                }

                return (
                  <button
                    key={choice.letter}
                    disabled={isQuizLocked}
                    onClick={() => handleChoiceClick(choice)}
                    className={`py-4 rounded-2xl font-black text-3xl border-3 shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center ${btnStyle}`}
                  >
                    <span>{choice.letter}</span>
                    <span className="text-xs font-bold opacity-80">{choice.lower}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback Banner */}
            {quizFeedback && (
              <div
                className={`w-full p-2.5 rounded-2xl text-xs font-black text-center ${
                  selectedChoice === currentQuestion.target.letter
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {quizFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 5: LETTER TRACING ================= */}
      {activeTab === 'trace' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full gap-3">
          {/* Tracing Controls Bar */}
          <div className="w-full bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
            {/* Letter Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setTraceLetterIdx((prev) => (prev > 0 ? prev - 1 : ALPHABET_LIST.length - 1));
                  SFX.bloop();
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-black text-base text-slate-900 px-2">
                {activeTraceItem.letter} {activeTraceItem.lower} ({activeTraceItem.emoji})
              </span>

              <button
                onClick={() => {
                  setTraceLetterIdx((prev) => (prev < ALPHABET_LIST.length - 1 ? prev + 1 : 0));
                  SFX.bloop();
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Uppercase / Lowercase Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setIsTracingUpper(true);
                  SFX.bloop();
                }}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isTracingUpper ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {lang === 'id' ? 'BESAR' : 'UPPER'}
              </button>
              <button
                onClick={() => {
                  setIsTracingUpper(false);
                  SFX.bloop();
                }}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  !isTracingUpper ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {lang === 'id' ? 'kecil' : 'lower'}
              </button>
            </div>

            {/* Clear Button */}
            <button
              onClick={() => {
                setTraceCleared((c) => c + 1);
                SFX.pop();
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-700 text-xs font-black cursor-pointer"
              title="Bersihkan Coretan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Tracing Board */}
          <div className="w-full aspect-square max-w-[280px] sm:max-w-[340px] md:max-w-[380px] bg-white rounded-3xl border-3 border-violet-300 shadow-md overflow-hidden relative touch-none">
            <canvas
              ref={traceCanvasRef}
              width={400}
              height={400}
              onPointerDown={startTracing}
              onPointerMove={drawTrace}
              onPointerUp={stopTracing}
              onPointerLeave={stopTracing}
              className="w-full h-full cursor-crosshair block touch-none"
            />
          </div>

          {/* Finish & Color Picker Bar */}
          <div className="flex items-center justify-between w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px]">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'].map((hex) => (
                <button
                  key={hex}
                  onClick={() => {
                    setTraceColor(hex);
                    SFX.bloop();
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full cursor-pointer transition-transform min-w-[28px] min-h-[28px] ${
                    traceColor === hex ? 'scale-125 ring-2 ring-slate-800' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <button
              onClick={handleFinishTracing}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'id' ? 'Selesai!' : 'Done!'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= LETTER DETAIL POPUP MODAL ================= */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border-4 border-indigo-300 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black">{selectedLetter.letter} {selectedLetter.lower}</span>
                {selectedLetter.isVowel && (
                  <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {lang === 'id' ? 'Huruf Vokal' : 'Vowel'}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedLetter(null)}
                className="p-1 rounded-xl bg-black/20 hover:bg-black/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: 4 Example Illustrations */}
            <div className="p-4 flex flex-col gap-3">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wide">
                {lang === 'id' ? `Koleksi Kata Huruf ${selectedLetter.letter}:` : `Words starting with ${selectedLetter.letter}:`}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {selectedLetter.examples.map((ex, exIdx) => (
                  <button
                    key={exIdx}
                    onClick={() => {
                      unlockAudio();
                      SFX.pop();
                      const speech = lang === 'id' ? ex.phonicId : ex.phonicEn;
                      speakText(speech, lang);
                    }}
                    className="p-3 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-300 rounded-2xl flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all"
                  >
                    <span className="text-4xl">{ex.emoji}</span>
                    <span className="font-black text-xs text-slate-900">
                      {lang === 'id' ? ex.wordId : ex.wordEn}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-bold">
                      <Volume2 className="w-3 h-3" />
                      <span>{lang === 'id' ? 'Dengar' : 'Listen'}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-center">
                <p className="text-xs font-bold text-indigo-900">
                  {lang === 'id' ? selectedLetter.descId : selectedLetter.descEn}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLetter(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer"
              >
                {lang === 'id' ? 'Tutup' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

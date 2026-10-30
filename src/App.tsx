import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Globe,
  Star,
  Sparkles,
  BookOpen,
  RotateCcw,
  Home,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  GAME_DEFINITIONS,
  AGE_LEVELS,
  ALL_ITEMS,
  GameDefinition,
} from './data/items';
import { ItemIcon } from './components/ItemIcon';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ParentModal } from './components/ParentModal';
import { ProfileModal } from './components/ProfileModal';
import { LibraryModal } from './components/LibraryModal';
import { RestBreakModal } from './components/RestBreakModal';
import { ConfettiCanvas } from './components/ConfettiCanvas';
import { AnimalSoundGame } from './games/AnimalSoundGame';
import { QuizGame } from './games/QuizGame';
import { MemoryGame } from './games/MemoryGame';
import { BubbleGame } from './games/BubbleGame';
import { OrderGame } from './games/OrderGame';
import { MonsterGame } from './games/MonsterGame';
import { AlphabetPhonicsGame } from './games/AlphabetPhonicsGame';
import { ColoringDrawingGame } from './games/ColoringDrawingGame';
import { SFX, speakText, unlockAudio } from './utils/audio';

interface UserData {
  lang: 'id' | 'en';
  isMuted: boolean;
  name: string;
  age: number;
  avatar: string;
  level: number;
  dailyLimit: number;
  bestScores: Record<string, number>;
  todayDate: string;
  playedSeconds: number;
}

const STORAGE_KEY = 'tbc_kids_v2';

export default function App() {
  const [data, setData] = useState<UserData>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const defaults: UserData = {
      lang: 'id',
      isMuted: false,
      name: '',
      age: 4,
      avatar: '👧',
      level: 0,
      dailyLimit: 30,
      bestScores: {},
      todayDate: today,
      playedSeconds: 0,
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.todayDate !== today) {
          parsed.todayDate = today;
          parsed.playedSeconds = 0;
        }
        return { ...defaults, ...parsed };
      }
    } catch {
      // Ignore
    }
    return defaults;
  });

  // Main Category Selection: 'educational' | 'coloring' | 'alphabet' | null
  // User asked: "sebelumnya harus pilih dulu"
  const [mainCategory, setMainCategory] = useState<'educational' | 'coloring' | 'alphabet' | null>(() => {
    try {
      const saved = localStorage.getItem('tbc_main_category');
      if (saved === 'educational' || saved === 'coloring' || saved === 'alphabet') {
        return saved as 'educational' | 'coloring' | 'alphabet';
      }
    } catch {
      // Ignore
    }
    return null;
  });

  // Active game view inside educational category
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showParent, setShowParent] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [breakType, setBreakType] = useState<'break' | 'limit' | null>(null);

  // Victory State
  const [victoryData, setVictoryData] = useState<{
    stars: number;
    scoreText: string;
    activityId: string;
    activityEn: string;
  } | null>(null);

  // Screen-time session counter (in seconds)
  const sessionSecondsRef = useRef(0);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }, [data]);

  useEffect(() => {
    try {
      if (mainCategory) {
        localStorage.setItem('tbc_main_category', mainCategory);
      } else {
        localStorage.removeItem('tbc_main_category');
      }
    } catch {
      // Ignore
    }
  }, [mainCategory]);

  // Screen-time interval ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      const isPlaying = (activeGameId || mainCategory === 'coloring' || mainCategory === 'alphabet') && document.visibilityState === 'visible';
      if (isPlaying) {
        sessionSecondsRef.current += 1;

        setData((prev) => {
          const newSeconds = prev.playedSeconds + 1;

          // Check daily limit
          if (newSeconds >= prev.dailyLimit * 60 && !breakType) {
            setBreakType('limit');
          }
          // Check 15-minute eye-break
          else if (sessionSecondsRef.current >= 15 * 60 && !breakType) {
            sessionSecondsRef.current = 0;
            setBreakType('break');
          }

          return { ...prev, playedSeconds: newSeconds };
        });
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [activeGameId, mainCategory, breakType]);

  const totalStars = Object.values(data.bestScores).reduce((a, b) => a + b, 0);

  const handleSelectCategory = (cat: 'educational' | 'coloring' | 'alphabet') => {
    unlockAudio();
    SFX.fanfare();
    setMainCategory(cat);
    setActiveGameId(null);
    setVictoryData(null);
  };

  const handleStartGame = (gameId: string) => {
    unlockAudio();
    SFX.bloop();
    setActiveGameId(gameId);
    setVictoryData(null);
  };

  const handleWin = (stars: number, scoreText: string) => {
    SFX.fanfare();
    const gameKey = activeGameId
      ? `${activeGameId}_lvl${data.level}`
      : `${mainCategory || 'general'}_lvl${data.level}`;
    const prevBest = data.bestScores[gameKey] || 0;

    setData((prev) => ({
      ...prev,
      bestScores: {
        ...prev.bestScores,
        [gameKey]: Math.max(prevBest, stars),
      },
    }));

    const currentGameDef = GAME_DEFINITIONS.find((g) => g.id === activeGameId);
    setVictoryData({
      stars,
      scoreText,
      activityId:
        currentGameDef?.activityId ||
        (mainCategory === 'alphabet'
          ? 'Ucapkan huruf-huruf pada benda di sekitarmu bersama keluarga!'
          : mainCategory === 'coloring'
          ? 'Tunjukkan gambar karyamu kepada Ayah atau Ibu di rumah!'
          : 'Bermainlah bersama keluarga!'),
      activityEn:
        currentGameDef?.activityEn ||
        (mainCategory === 'alphabet'
          ? 'Spell out letters of items around you with family!'
          : mainCategory === 'coloring'
          ? 'Show your artwork to your parents!'
          : 'Have fun with your family!'),
    });

    const congrat =
      data.lang === 'id'
        ? `Selamat, ${data.name || 'kamu'} juara! Dapat ${stars} bintang emas!`
        : `Congratulations! You earned ${stars} golden stars!`;
    speakText(congrat, data.lang);
  };

  const handlePlayAgain = () => {
    setVictoryData(null);
    SFX.bloop();
  };

  const handleBackToHome = () => {
    setActiveGameId(null);
    setVictoryData(null);
    SFX.bloop();
  };

  const handleBackToCategories = () => {
    setActiveGameId(null);
    setMainCategory(null);
    setVictoryData(null);
    SFX.bloop();
  };

  const handleResetProgress = () => {
    setData((prev) => ({ ...prev, bestScores: {}, playedSeconds: 0 }));
    SFX.ding();
  };

  const activeLevelConfig = AGE_LEVELS[data.level];

  return (
    <div className="min-h-screen min-h-dvh flex flex-col antialiased">
      {/* Confetti Animation when Victory */}
      <ConfettiCanvas active={!!victoryData} />

      {/* 3-ZONE TOP BAR (Clean Top Bar Contract & Mobile Friendly) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2.5 sm:px-4 py-2 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Zone 1: Brand Title */}
          <button
            onClick={handleBackToCategories}
            className="flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer group shrink-0"
            title={data.lang === 'id' ? 'Kembali ke Pilihan Kategori' : 'Back to Categories'}
          >
            <img
              src="/assets/aistudio/Wali_Pintar_Family_Education_Badge_aebad423.png"
              alt="Logo Wali Pintar"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover shadow-2xs border-2 border-emerald-300 transition-transform group-hover:scale-105"
            />
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                Wali Pintar
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 hidden sm:inline">
                {data.lang === 'id' ? 'Bermain & Belajar 3–8 Th' : 'Kids Learning 3–8 yo'}
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation & Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Header Compact PWA Install Button */}
            <PWAInstallButton lang={data.lang} variant="compact" />

            {/* Language Toggle */}
            <button
              onClick={() => {
                setData((p) => ({ ...p, lang: p.lang === 'id' ? 'en' : 'id' }));
                SFX.bloop();
              }}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-[11px] sm:text-xs text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              aria-label="Ganti Bahasa"
              title="Ganti Bahasa / Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{data.lang.toUpperCase()}</span>
            </button>

            {/* Parental Gate Modal Button */}
            <button
              onClick={() => setShowParent(true)}
              className="h-8 sm:h-9 w-8 sm:w-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              title={data.lang === 'id' ? 'Pengaturan Orang Tua' : 'Parent Controls'}
              aria-label="Area Orang Tua"
            >
              <Shield className="w-4 h-4 text-amber-600" />
            </button>

            {/* Profile & Age Button (Umur di samping profil) */}
            <button
              onClick={() => setShowProfile(true)}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-black text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              aria-label="Profil Anak"
              title={
                data.lang === 'id'
                  ? `Profil ${data.name || 'Anak'} (${data.age} tahun)`
                  : `Profile ${data.name || 'Kid'} (${data.age} yo)`
              }
            >
              <span className="text-base sm:text-lg">{data.avatar}</span>
              <span className="max-w-[65px] truncate hidden md:inline">
                {data.name || (data.lang === 'id' ? 'Profil' : 'Profile')}
              </span>
              <span className="bg-indigo-600 text-white text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-md shrink-0">
                {data.age} {data.lang === 'id' ? 'th' : 'yo'}
              </span>
            </button>
          </div>

          {/* Zone 3: Star Counter */}
          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 border border-amber-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs md:text-sm font-black shrink-0">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400" />
            <span className="tabular-nums text-amber-900">{totalStars}</span>
          </div>
        </div>
      </header>

      {/* SUB-HEADER TAGLINE BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white shadow-xs border-b border-emerald-700/30">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center justify-center gap-2 text-center">
          <span className="text-xs sm:text-sm animate-pulse">✨</span>
          <p className="text-[11px] sm:text-xs md:text-sm font-black tracking-wide leading-snug">
            {data.lang === 'id'
              ? 'Zona bermain dan belajar si kecil agar lebih pintar dan berwawasan luas'
              : 'Zona bermain dan belajar si kecil agar lebih pintar dan berwawasan luas'}
          </p>
          <span className="text-xs sm:text-sm">🌱</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col">
        {/* If a category is selected and no mini-game is open, show Category Quick-Switcher Header Bar */}
        {mainCategory && !activeGameId && (
          <div className="bg-slate-100/90 border-b border-slate-200/80 px-2.5 sm:px-4 py-1.5 shadow-2xs">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={handleBackToCategories}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-black text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
                title={data.lang === 'id' ? 'Kembali ke Pilihan Kategori' : 'Back to Categories Hub'}
              >
                <span>🏠</span>
                <span>{data.lang === 'id' ? 'Pilih Kategori' : 'All Categories'}</span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleSelectCategory('educational')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 cursor-pointer transition-all ${
                    mainCategory === 'educational'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <span>🎮</span>
                  <span>{data.lang === 'id' ? 'Edukasi' : 'Educational'}</span>
                </button>

                <button
                  onClick={() => handleSelectCategory('coloring')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 cursor-pointer transition-all ${
                    mainCategory === 'coloring'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <span>🎨</span>
                  <span>{data.lang === 'id' ? 'Mewarnai' : 'Coloring'}</span>
                </button>

                <button
                  onClick={() => handleSelectCategory('alphabet')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs shrink-0 cursor-pointer transition-all ${
                    mainCategory === 'alphabet'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-slate-700'
                  }`}
                >
                  <span>🔤</span>
                  <span>{data.lang === 'id' ? 'Abjad A-Z' : 'Alphabet'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. CATEGORY HUB SCREEN (Pilih Kategori Utama: Edukasi, Mewarnai, Belajar Abjad) */}
        {!mainCategory && (
          <div className="max-w-5xl mx-auto w-full px-4 py-5 space-y-6 animate-fade-in">
            {/* Age Tier Selection Tabs for 3-8 years */}
            <div className="bg-white/85 backdrop-blur-sm p-3.5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {data.lang === 'id' ? 'Tingkat Usia & Kesulitan:' : 'Age Tier & Difficulty:'}
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                  {activeLevelConfig.ageRange} ({activeLevelConfig.stageId})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {AGE_LEVELS.map((lvl) => {
                  const isActive = data.level === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => {
                        setData((p) => ({ ...p, level: lvl.id }));
                        SFX.bloop();
                      }}
                      className={`py-2.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border-2 ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm scale-102'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="text-xl md:text-2xl">{lvl.badge}</span>
                      <span className="text-xs md:text-sm font-black mt-0.5">
                        {data.lang === 'id' ? lvl.nameId : lvl.nameEn}
                      </span>
                      <span className={`text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {lvl.ageRange}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 text-center mt-2 px-2">
                {data.lang === 'id' ? activeLevelConfig.descId : activeLevelConfig.descEn}
              </p>
            </div>

            {/* Hub Title Banner */}
            <div className="text-center px-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {data.lang === 'id' ? 'Pilih Kategori Permainan' : 'Choose Your Learning Adventure'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-lg mx-auto">
                {data.lang === 'id'
                  ? 'Silakan pilih salah satu dari 3 kategori seru di bawah untuk mulai bermain dan belajar bersama:'
                  : 'Select from 3 fun categories below to start playing and learning together:'}
              </p>
            </div>

            {/* 3 BIG CATEGORIES CARDS (Pilihan 3 Kategori Utama) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Kategori 1: Permainan Edukasi */}
              <div
                onClick={() => handleSelectCategory('educational')}
                className="bg-gradient-to-b from-amber-50 via-white to-emerald-50 rounded-3xl p-5 border-3 border-emerald-300 hover:border-emerald-500 shadow-md hover:shadow-xl transition-all hover:scale-103 active:scale-97 cursor-pointer flex flex-col justify-between relative group text-left"
              >
                <div className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  {data.lang === 'id' ? '14 Game' : '14 Games'}
                </div>

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-4xl mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    🎮
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {data.lang === 'id' ? 'Permainan Edukasi' : 'Educational Games'}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {data.lang === 'id'
                      ? 'Tebak hewan, suara alami, buah & sayur tropis, kendaraan, bentuk lucu, memori kartu kembar, dan logika matematika.'
                      : 'Animal quizzes, realistic sounds, tropical fruits, vehicles, memory cards, and math logic.'}
                  </p>

                  <ul className="text-xs text-slate-700 font-bold mt-3 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span>🐾</span>
                      <span>{data.lang === 'id' ? 'Tebak Hewan & Suara Alami' : 'Animal & Sound Quizzes'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>🍎</span>
                      <span>{data.lang === 'id' ? 'Buah, Sayur, Flora & Kendaraan' : 'Fruits, Flora & Vehicles'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>🃏</span>
                      <span>{data.lang === 'id' ? 'Memori Kartu & Urut Angka' : 'Memory Cards & Number Logic'}</span>
                    </li>
                  </ul>
                </div>

                <button className="w-full mt-4 py-2.5 px-4 rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer">
                  <span>{data.lang === 'id' ? 'Mulai Edukasi' : 'Play Edu Games'}</span>
                  <span>🚀</span>
                </button>
              </div>

              {/* Kategori 2: Menggambar dan Mewarnai */}
              <div
                onClick={() => handleSelectCategory('coloring')}
                className="bg-gradient-to-b from-rose-50 via-white to-pink-50 rounded-3xl p-5 border-3 border-rose-300 hover:border-rose-500 shadow-md hover:shadow-xl transition-all hover:scale-103 active:scale-97 cursor-pointer flex flex-col justify-between relative group text-left"
              >
                <div className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  {data.lang === 'id' ? 'Baru 🎨' : 'New 🎨'}
                </div>

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center text-4xl mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    🎨
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {data.lang === 'id' ? 'Menggambar & Mewarnai' : 'Drawing & Coloring'}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {data.lang === 'id'
                      ? '30+ buku mewarnai interaktif dalam 6 kategori (hewan, manisan, kendaraan, alam, dino), 4 tema palet warna, kuas berkilau, stempel stiker, dan Galeri Karyaku!'
                      : '30+ interactive coloring pages in 6 categories, 4 color palettes, glitter sparkle brush, sticker stamps, and saved My Art Gallery!'}
                  </p>

                  <ul className="text-xs text-slate-700 font-bold mt-3 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span>🖍️</span>
                      <span>{data.lang === 'id' ? '30+ Halaman Gambar (6 Kategori)' : '30+ Pages in 6 Categories'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>✨</span>
                      <span>{data.lang === 'id' ? 'Kuas Berkilau, Pelangi & 4 Palet' : 'Glitter, Rainbow & 4 Palettes'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>{data.lang === 'id' ? 'Galeri Karyaku & Tantangan Harian' : 'My Art Gallery & Daily Pick'}</span>
                    </li>
                  </ul>
                </div>

                <button className="w-full mt-4 py-2.5 px-4 rounded-2xl bg-rose-500 group-hover:bg-rose-600 text-white font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer">
                  <span>{data.lang === 'id' ? 'Mulai Mewarnai' : 'Start Coloring'}</span>
                  <span>🎨</span>
                </button>
              </div>

              {/* Kategori 3: Belajar Abjad & Alfabet dengan Suara Baca */}
              <div
                onClick={() => handleSelectCategory('alphabet')}
                className="bg-gradient-to-b from-indigo-50 via-white to-sky-50 rounded-3xl p-5 border-3 border-indigo-300 hover:border-indigo-500 shadow-md hover:shadow-xl transition-all hover:scale-103 active:scale-97 cursor-pointer flex flex-col justify-between relative group text-left"
              >
                <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  {data.lang === 'id' ? 'Suara Baca 🔊' : 'Voice Play 🔊'}
                </div>

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-4xl mb-3 shadow-inner group-hover:scale-110 transition-transform">
                    🔤
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {data.lang === 'id' ? 'Belajar Abjad & Alfabet' : 'Alphabet & Phonics'}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {data.lang === 'id'
                      ? '26 huruf A-Z dengan 100+ kosakata suara, lagu karaoke abjad, minigame pecah gelembung huruf, papan susun kata, kuis suara, dan lacak garis tulis!'
                      : '26 letters A-Z with 100+ voiced vocabulary words, karaoke song, letter bubble pop minigame, word builder, phonics quiz, and tracing!'}
                  </p>

                  <ul className="text-xs text-slate-700 font-bold mt-3 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span>🔊</span>
                      <span>{data.lang === 'id' ? '100+ Kosakata Suara & Lagu A-Z' : '100+ Voiced Words & A-Z Song'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>🎈</span>
                      <span>{data.lang === 'id' ? 'Minigame Pecah Gelembung Abjad' : 'Alphabet Bubble Pop Minigame'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span>🔤</span>
                      <span>{data.lang === 'id' ? 'Papan Susun Kata & Tulis Huruf' : 'Word Builder & Letter Tracing'}</span>
                    </li>
                  </ul>
                </div>

                <button className="w-full mt-4 py-2.5 px-4 rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer">
                  <span>{data.lang === 'id' ? 'Belajar Abjad' : 'Learn Alphabet'}</span>
                  <span>🔤</span>
                </button>
              </div>
            </div>

            {/* Pustaka Ceria Hero Card */}
            <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-emerald-100 rounded-3xl p-5 border-3 border-amber-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/80 text-amber-950 flex items-center justify-center text-3xl shadow-sm shrink-0">
                  📚
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {data.lang === 'id' ? 'Pustaka Ceria (Ensiklopedia Lengkap)' : 'Learning Library (Encyclopedia)'}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                    {data.lang === 'id'
                      ? `Jelajahi ${ALL_ITEMS.length} hewan, tumbuhan, buah tropis, kendaraan, dan benda bentuk unik dengan gambar visual & suara!`
                      : `Explore ${ALL_ITEMS.length} real plants, animals, tropical fruits, vehicles, and shape objects with authentic sounds!`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLibrary(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:translate-y-0.5 text-white font-black text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                {data.lang === 'id' ? 'Buka Pustaka 📖' : 'Open Library 📖'}
              </button>
            </div>

            {/* PWA Offline Download in Footer */}
            <div className="pt-2">
              <PWAInstallButton lang={data.lang} variant="footer" />
            </div>

            {/* Application Footer Info */}
            <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200/60 mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 font-bold text-slate-700 text-xs sm:text-sm">
                <span>🌻 Taman Belajar Ceria</span>
                <span>•</span>
                <span>{data.lang === 'id' ? 'Edukasi Anak Usia 3–8 Tahun' : 'Early Childhood Learning (3–8 yo)'}</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                {data.lang === 'id'
                  ? 'Dirancang khusus untuk layar ponsel & tablet. 100% aman untuk anak, bebas iklan & bisa dimainkan offline tanpa kuota.'
                  : 'Tailored for phone & tablet screens. 100% kid-safe, ad-free & playable offline anytime.'}
              </p>
            </footer>
          </div>
        )}

        {/* 2. CATEGORY: MENGGAMBAR & MEWARNAI */}
        {mainCategory === 'coloring' && (
          <ColoringDrawingGame
            onBack={handleBackToCategories}
            lang={data.lang}
            playerName={data.name}
            level={data.level}
            onWin={handleWin}
          />
        )}

        {/* 3. CATEGORY: BELAJAR ABJAD & ALFABET (DENGAN SUARA BACA) */}
        {mainCategory === 'alphabet' && (
          <AlphabetPhonicsGame
            onBack={handleBackToCategories}
            lang={data.lang}
            playerName={data.name}
            level={data.level}
            onWin={handleWin}
          />
        )}

        {/* 4. CATEGORY: PERMAINAN EDUKASI (14 GAMES) */}
        {mainCategory === 'educational' && (
          <>
            {activeGameId ? (
              <div className="flex-1 flex flex-col py-2">
                {/* 1. Dedicated Animal Sound Game */}
                {activeGameId === 'animal_sound' && (
                  <AnimalSoundGame
                    onBack={handleBackToHome}
                    lang={data.lang}
                    playerName={data.name}
                    level={data.level}
                    onWin={handleWin}
                  />
                )}

                {/* 2. Memory Match Cards */}
                {activeGameId === 'memory' && (
                  <MemoryGame
                    onBack={handleBackToHome}
                    lang={data.lang}
                    level={data.level}
                    playerName={data.name}
                    onWin={handleWin}
                  />
                )}

                {/* 3. Pop Bubbles */}
                {activeGameId === 'bubbles' && (
                  <BubbleGame
                    onBack={handleBackToHome}
                    lang={data.lang}
                    level={data.level}
                    onWin={handleWin}
                  />
                )}

                {/* 4. Number Order */}
                {activeGameId === 'order' && (
                  <OrderGame
                    onBack={handleBackToHome}
                    lang={data.lang}
                    level={data.level}
                    playerName={data.name}
                    onWin={handleWin}
                  />
                )}

                {/* 5. Hero vs Monster */}
                {activeGameId === 'monster' && (
                  <MonsterGame
                    onBack={handleBackToHome}
                    lang={data.lang}
                    level={data.level}
                    playerName={data.name}
                    onWin={handleWin}
                  />
                )}

                {/* 6. General Quiz Categories */}
                {![
                  'animal_sound',
                  'memory',
                  'bubbles',
                  'order',
                  'monster',
                ].includes(activeGameId) && (
                  <QuizGame
                    gameId={activeGameId}
                    onBack={handleBackToHome}
                    lang={data.lang}
                    playerName={data.name}
                    level={data.level}
                    onWin={handleWin}
                  />
                )}
              </div>
            ) : (
              /* Educational Games Dashboard */
              <div className="max-w-5xl mx-auto w-full px-4 py-4 space-y-6 animate-fade-in">
                {/* Age Tier Selection Tabs */}
                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-3xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2 px-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {data.lang === 'id' ? 'Tingkat Kesulitan Sesuai Usia:' : 'Difficulty by Age Tier:'}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                      {activeLevelConfig.ageRange} ({activeLevelConfig.stageId})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {AGE_LEVELS.map((lvl) => {
                      const isActive = data.level === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          onClick={() => {
                            setData((p) => ({ ...p, level: lvl.id }));
                            SFX.bloop();
                          }}
                          className={`py-2.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border-2 ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm scale-102'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="text-xl md:text-2xl">{lvl.badge}</span>
                          <span className="text-xs md:text-sm font-black mt-0.5">
                            {data.lang === 'id' ? lvl.nameId : lvl.nameEn}
                          </span>
                          <span className={`text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {lvl.ageRange}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-2 px-2">
                    {data.lang === 'id' ? activeLevelConfig.descId : activeLevelConfig.descEn}
                  </p>
                </div>

                {/* Pustaka Ceria Hero Card */}
                <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-emerald-100 rounded-3xl p-5 border-3 border-amber-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-16 h-16 rounded-2xl bg-amber-400/80 text-amber-950 flex items-center justify-center text-3xl shadow-sm shrink-0">
                      📚
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-black text-slate-900">
                        {data.lang === 'id' ? 'Pustaka Ceria (Ensiklopedia Anak)' : 'Learning Library (Encyclopedia)'}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                        {data.lang === 'id'
                          ? `Jelajahi ${ALL_ITEMS.length} hewan, tumbuhan, buah tropis, kendaraan, dan benda bentuk unik dengan gambar visual & suara!`
                          : `Explore ${ALL_ITEMS.length} real plants, animals, tropical fruits, vehicles, and shape objects with authentic sounds!`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowLibrary(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:translate-y-0.5 text-white font-black text-sm shadow-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    {data.lang === 'id' ? 'Buka Pustaka 📖' : 'Open Library 📖'}
                  </button>
                </div>

                {/* Games Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>🎮</span>
                      <span>{data.lang === 'id' ? 'Pilih Permainan Edukasi' : 'Choose a Learning Game'}</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-500">
                      {GAME_DEFINITIONS.length} {data.lang === 'id' ? 'Game Tersedia' : 'Games Available'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {GAME_DEFINITIONS.map((game) => {
                      const gameKey = `${game.id}_lvl${data.level}`;
                      const starsEarned = data.bestScores[gameKey] || 0;

                      return (
                        <button
                          key={game.id}
                          onClick={() => handleStartGame(game.id)}
                          className="flex flex-col items-center justify-between p-4 rounded-3xl border-3 border-white shadow-md hover:shadow-lg transition-all hover:scale-103 active:scale-97 cursor-pointer text-center relative overflow-hidden group min-h-[160px]"
                          style={{
                            backgroundColor: game.color,
                            boxShadow: '0 6px 0 rgba(43,58,85,0.12)',
                          }}
                        >
                          {/* Age tag */}
                          <span className="absolute top-2.5 right-3 text-[10px] font-black text-slate-700 bg-white/70 px-2 py-0.5 rounded-full">
                            {game.ageRange}
                          </span>

                          {/* Icon */}
                          <div className="text-5xl my-2 transition-transform group-hover:scale-115">
                            {game.emoji}
                          </div>

                          {/* Title & Skill */}
                          <div className="w-full">
                            <div className="font-black text-sm md:text-base text-slate-900 leading-tight">
                              {data.lang === 'id' ? game.nameId : game.nameEn}
                            </div>
                            <div className="text-[10px] text-slate-600 font-bold truncate mt-0.5">
                              {data.lang === 'id' ? game.skillId : game.skillEn}
                            </div>
                          </div>

                          {/* Stars indicator */}
                          <div className="flex gap-0.5 mt-2 text-amber-500 text-xs">
                            {[1, 2, 3].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= starsEarned ? 'fill-amber-400' : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PWA Offline Download in Footer */}
                <div className="pt-2">
                  <PWAInstallButton lang={data.lang} variant="footer" />
                </div>

                {/* Application Footer Info */}
                <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200/60 mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 font-black text-slate-700 text-xs sm:text-sm">
                    <img
                      src="/assets/aistudio/Wali_Pintar_Family_Education_Badge_aebad423.png"
                      alt="Wali Pintar"
                      className="w-5 h-5 rounded-full object-cover inline-block"
                    />
                    <span>Wali Pintar</span>
                    <span>•</span>
                    <span>{data.lang === 'id' ? 'Edukasi Anak Usia 3–8 Tahun' : 'Early Childhood Learning (3–8 yo)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                    {data.lang === 'id'
                      ? 'Dirancang khusus untuk layar ponsel & tablet. 100% aman untuk anak, bebas iklan & bisa dimainkan offline tanpa kuota.'
                      : 'Tailored for phone & tablet screens. 100% kid-safe, ad-free & playable offline anytime.'}
                  </p>
                </footer>
              </div>
            )}
          </>
        )}
      </main>

      {/* VICTORY / ROUND SUMMARY MODAL */}
      {victoryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl text-center border-4 border-amber-300 relative max-h-[92vh] overflow-y-auto">
            <div className="text-6xl mb-2 animate-bounce">🎉</div>
            <h3 className="text-2xl font-black text-slate-900 mb-1">
              {data.name
                ? data.lang === 'id'
                  ? `Hebat Sekali, ${data.name}!`
                  : `Well done, ${data.name}!`
                : data.lang === 'id'
                ? 'Hebat Sekali!'
                : 'Well Done!'}
            </h3>

            {/* Stars row */}
            <div className="flex justify-center gap-1.5 text-amber-400 text-3xl my-3">
              {[...Array(3)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-9 h-9 ${
                    i < victoryData.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>

            <p className="text-sm font-bold text-slate-600 mb-3">{victoryData.scoreText}</p>

            {/* Family activity prompt (anti-screen addiction / real world connection) */}
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-950 font-bold text-left mb-5 leading-relaxed">
              <div className="text-amber-800 flex items-center gap-1 text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{data.lang === 'id' ? 'Aktivitas Seru Bersama Ayah & Ibu:' : 'Fun Family Activity:'}</span>
              </div>
              <p>{data.lang === 'id' ? victoryData.activityId : victoryData.activityEn}</p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePlayAgain}
                className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:translate-y-0.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{data.lang === 'id' ? 'Main Lagi' : 'Play Again'}</span>
              </button>
              <button
                onClick={handleBackToHome}
                className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:translate-y-0.5"
              >
                <Home className="w-4 h-4" />
                <span>{data.lang === 'id' ? 'Menu Utama' : 'Home'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        lang={data.lang}
        name={data.name}
        onSetName={(name) => setData((p) => ({ ...p, name }))}
        age={data.age}
        onSetAge={(age) => setData((p) => ({ ...p, age }))}
        avatar={data.avatar}
        onSetAvatar={(avatar) => setData((p) => ({ ...p, avatar }))}
        level={data.level}
        onSetLevel={(level) => setData((p) => ({ ...p, level }))}
      />

      <ParentModal
        isOpen={showParent}
        onClose={() => setShowParent(false)}
        lang={data.lang}
        dailyLimit={data.dailyLimit}
        onSetDailyLimit={(dailyLimit) => setData((p) => ({ ...p, dailyLimit }))}
        playedMinutes={Math.floor(data.playedSeconds / 60)}
        onResetProgress={handleResetProgress}
      />

      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        lang={data.lang}
      />

      {breakType && (
        <RestBreakModal
          type={breakType}
          onContinue={() => {
            setBreakType(null);
            if (breakType === 'limit') handleBackToHome();
          }}
          lang={data.lang}
        />
      )}
    </div>
  );
}

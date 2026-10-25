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

  // Active game view
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

  // Screen-time interval ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      if (activeGameId && document.visibilityState === 'visible') {
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
  }, [activeGameId, breakType]);

  const totalStars = Object.values(data.bestScores).reduce((a, b) => a + b, 0);

  const handleStartGame = (gameId: string) => {
    unlockAudio();
    SFX.bloop();
    setActiveGameId(gameId);
    setVictoryData(null);
  };

  const handleWin = (stars: number, scoreText: string) => {
    if (!activeGameId) return;
    SFX.fanfare();
    const gameKey = `${activeGameId}_lvl${data.level}`;
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
      activityId: currentGameDef?.activityId || 'Bermainlah bersama keluarga!',
      activityEn: currentGameDef?.activityEn || 'Have fun with your family!',
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
            onClick={handleBackToHome}
            className="flex items-center gap-1 sm:gap-2 text-left cursor-pointer group shrink-0"
          >
            <span className="text-2xl sm:text-3xl md:text-4xl transition-transform group-hover:scale-110">
              🌻
            </span>
            <div>
              <h1 className="text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
                Taman Ceria
              </h1>
              <span className="text-[10px] font-bold text-emerald-700 hidden sm:inline">
                Game Edukasi 3–8 Th
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col">
        {/* If a game is currently active, render its screen */}
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

            {/* 6. General Quiz Categories (Animals, Plants, Fruits, Vehicles, Colors, Shapes, Count, etc.) */}
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
          /* HOME SCREEN (Dashboard with Age Tiers & Games) */
          <div className="max-w-5xl mx-auto w-full px-4 py-5 space-y-6">
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
      </main>

      {/* VICTORY / ROUND SUMMARY MODAL */}
      {victoryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border-4 border-amber-300 relative">
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

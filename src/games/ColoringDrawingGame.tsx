import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Download,
  Palette,
  Sparkles,
  Eraser,
  PenTool,
  Check,
  Star,
  Layers,
  Smile,
  Volume2,
  Image as ImageIcon,
  Trash2,
  X,
  Award,
  Flame,
} from 'lucide-react';
import {
  COLORING_PAGES,
  COLORING_CATEGORIES,
  PALETTE_THEMES,
  STICKER_PACKS,
  ColoringPage,
} from '../data/coloringPages';
import { SFX, speakText, unlockAudio } from '../utils/audio';

interface ColoringDrawingGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  playerName: string;
  level: number; // 0 = Si Kecil, 1 = Pintar, 2 = Juara
  onWin: (stars: number, scoreText: string) => void;
}

interface SavedArtwork {
  id: string;
  title: string;
  timestamp: number;
  dataUrl: string;
}

export const ColoringDrawingGame: React.FC<ColoringDrawingGameProps> = ({
  onBack,
  lang,
  playerName,
  level,
  onWin,
}) => {
  // Mode: 'coloring' (coloring books) or 'free' (free drawing canvas)
  const [mode, setMode] = useState<'coloring' | 'free'>('coloring');

  // Category filter for coloring books
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtered coloring pages
  const filteredPages =
    selectedCategory === 'all'
      ? COLORING_PAGES
      : COLORING_PAGES.filter((p) => p.category === selectedCategory);

  // Active coloring page
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const activePage: ColoringPage = filteredPages[selectedPageIndex] || COLORING_PAGES[0];

  // Colors filled in current coloring page: { [pageId]: { [partId]: hexColor } }
  const [pageColors, setPageColors] = useState<Record<string, Record<string, string>>>({});

  // Active selected color & palette theme
  const [activePaletteIndex, setActivePaletteIndex] = useState(0);
  const currentPalette = PALETTE_THEMES[activePaletteIndex] || PALETTE_THEMES[0];
  const [selectedColor, setSelectedColor] = useState(currentPalette.colors[0].hex);

  // Tools in free drawing: 'brush' | 'rainbow' | 'glitter' | 'eraser' | 'sticker'
  const [tool, setTool] = useState<'brush' | 'rainbow' | 'glitter' | 'eraser' | 'sticker'>('brush');
  const [brushSize, setBrushSize] = useState<number>(level === 0 ? 18 : level === 1 ? 12 : 7);

  // Sticker pack selection
  const [activeStickerPackIdx, setActiveStickerPackIdx] = useState(0);
  const currentStickerPack = STICKER_PACKS[activeStickerPackIdx] || STICKER_PACKS[0];
  const [selectedSticker, setSelectedSticker] = useState(currentStickerPack.stickers[0]);

  // Gallery modal
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [savedArtworks, setSavedArtworks] = useState<SavedArtwork[]>([]);

  // Daily Challenge logic (deterministic based on day of year)
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const dailyChallengePage = COLORING_PAGES[dayOfYear % COLORING_PAGES.length];
  const isDailyChallenge = activePage.id === dailyChallengePage.id;

  // Free canvas ref & history for undo
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const canvasHistoryRef = useRef<ImageData[]>([]);
  const rainbowHueRef = useRef(0);

  // Load saved artworks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tbc_gallery_artworks');
      if (stored) {
        setSavedArtworks(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save updated artworks
  const saveToGalleryStore = (newArt: SavedArtwork) => {
    try {
      const updated = [newArt, ...savedArtworks].slice(0, 30);
      setSavedArtworks(updated);
      localStorage.setItem('tbc_gallery_artworks', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const deleteFromGallery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    SFX.pop();
    const updated = savedArtworks.filter((a) => a.id !== id);
    setSavedArtworks(updated);
    try {
      localStorage.setItem('tbc_gallery_artworks', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Initialize canvas on free mode
  useEffect(() => {
    if (mode === 'free') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveCanvasState();
    }
  }, [mode]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvasHistoryRef.current.push(snapshot);
    if (canvasHistoryRef.current.length > 20) {
      canvasHistoryRef.current.shift();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvasHistoryRef.current.length <= 1) return;
    SFX.bloop();
    canvasHistoryRef.current.pop();
    const previousState = canvasHistoryRef.current[canvasHistoryRef.current.length - 1];
    const ctx = canvas.getContext('2d');
    if (ctx && previousState) {
      ctx.putImageData(previousState, 0, 0);
    }
  };

  const handleClearCanvas = () => {
    SFX.pop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  const handleFillCanvasBackground = () => {
    SFX.fanfare();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  // Color selection with voice pronunciation
  const handleSelectColor = (hex: string, nameId: string, nameEn: string) => {
    unlockAudio();
    setSelectedColor(hex);
    SFX.bloop();
    const colorSpeech = lang === 'id' ? nameId : nameEn;
    speakText(colorSpeech, lang);
  };

  // Tap-to-color interactive coloring page
  const handleColorPart = (partId: string) => {
    unlockAudio();
    SFX.pop();

    setPageColors((prev) => {
      const currentPageMap = prev[activePage.id] || {};
      const updatedPage = {
        ...currentPageMap,
        [partId]: selectedColor,
      };

      // Check if all parts of this page have been colored
      const totalParts = activePage.parts.length;
      const filledPartsCount = Object.keys(updatedPage).length;

      if (filledPartsCount === totalParts) {
        // Complete page celebration!
        setTimeout(() => {
          SFX.fanfare();
          const bonusStars = isDailyChallenge ? 5 : 3;
          speakText(
            lang === 'id'
              ? `Luar biasa, ${playerName || 'sayang'}! Gambar ${activePage.nameId} sudah selesai diwarnai dengan indah!`
              : `Amazing, ${playerName || 'friend'}! The ${activePage.nameEn} is fully colored!`,
            lang
          );
          onWin(bonusStars, '100%');
        }, 300);
      }

      return {
        ...prev,
        [activePage.id]: updatedPage,
      };
    });
  };

  const handleResetCurrentPage = () => {
    SFX.bloop();
    setPageColors((prev) => {
      const copy = { ...prev };
      delete copy[activePage.id];
      return copy;
    });
  };

  // Drawing Canvas Pointer Events
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudio();
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (tool === 'sticker') {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      ctx.font = `${brushSize * 3.5 + 24}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedSticker, x, y);
      SFX.pop();
      saveCanvasState();
      return;
    }

    isDrawingRef.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
      saveCanvasState();
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === 'rainbow') {
      rainbowHueRef.current = (rainbowHueRef.current + 8) % 360;
      ctx.strokeStyle = `hsl(${rainbowHueRef.current}, 95%, 52%)`;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === 'glitter') {
      // Glitter starlight stroke
      ctx.strokeStyle = '#facc15';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 12;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(x, y);

      // Random sparkle dots around path
      if (Math.random() > 0.4) {
        const sparkX = x + (Math.random() - 0.5) * brushSize * 2.5;
        const sparkY = y + (Math.random() - 0.5) * brushSize * 2.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#fde047';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = selectedColor;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // Convert SVG coloring page to PNG Data URL for saving
  const exportColoringPageToDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      const svgElement = document.getElementById('coloring-page-svg');
      if (!svgElement) {
        resolve('');
        return;
      }
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 600;
        offCanvas.height = 600;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.fillStyle = '#ffffff';
          offCtx.fillRect(0, 0, 600, 600);
          offCtx.drawImage(img, 20, 20, 560, 560);
          URL.revokeObjectURL(blobURL);
          resolve(offCanvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.src = blobURL;
    });
  };

  // Save artwork to phone & gallery
  const handleSaveArtwork = async () => {
    SFX.fanfare();
    let dataUrl = '';
    let title = '';

    if (mode === 'free') {
      const canvas = canvasRef.current;
      if (canvas) {
        dataUrl = canvas.toDataURL('image/png');
        title = lang === 'id' ? 'Gambar Bebas Ceria' : 'Free Drawing';
      }
    } else {
      dataUrl = await exportColoringPageToDataUrl();
      title = lang === 'id' ? activePage.nameId : activePage.nameEn;
    }

    if (!dataUrl) return;

    // Trigger instant browser download
    const link = document.createElement('a');
    link.download = `karya_${playerName || 'anak'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    // Save to in-app local gallery
    saveToGalleryStore({
      id: `art_${Date.now()}`,
      title,
      timestamp: Date.now(),
      dataUrl,
    });

    speakText(
      lang === 'id'
        ? `Hore! Gambarmu tersimpan ke galeri! Hebat sekali, ${playerName || 'sayang'}!`
        : `Hurray! Saved to gallery! You are a great artist, ${playerName || 'friend'}!`,
      lang
    );
    onWin(3, '100%');
  };

  const currentColorMap = pageColors[activePage.id] || {};
  const currentCompletedCount = Object.keys(currentColorMap).length;
  const isCurrentPageFinished = currentCompletedCount === activePage.parts.length;

  return (
    <div className="max-w-5xl mx-auto w-full px-2 sm:px-4 py-2 flex-1 flex flex-col">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 bg-white p-2 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs">
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
            <span className="text-xl">🎨</span>
            <span>{lang === 'id' ? 'Menggambar & Mewarnai' : 'Drawing & Coloring'}</span>
          </h2>
          <span className="text-[10px] sm:text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
            {mode === 'coloring'
              ? lang === 'id'
                ? '30+ Gambar Sentuh Ceria'
                : '30+ Interactive Coloring Pages'
              : lang === 'id'
              ? 'Kanvas Gambar & Kuas Berkilau'
              : 'Free Drawing Canvas'}
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Gallery Button */}
          <button
            onClick={() => {
              SFX.bloop();
              setIsGalleryOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-xs cursor-pointer transition-all border border-amber-300"
            title="Galeri Karyaku"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'id' ? 'Galeri' : 'Gallery'}</span>
            {savedArtworks.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {savedArtworks.length}
              </span>
            )}
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setMode('coloring');
                SFX.bloop();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                mode === 'coloring' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              {lang === 'id' ? 'Mewarnai' : 'Coloring'}
            </button>
            <button
              onClick={() => {
                setMode('free');
                SFX.bloop();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                mode === 'free' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              {lang === 'id' ? 'Gambar Bebas' : 'Free Canvas'}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODE 1: COLORING BOOK ================= */}
      {mode === 'coloring' && (
        <div className="flex-1 flex flex-col gap-2 sm:gap-2.5">
          {/* Categories Tab Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-1">
            {COLORING_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedPageIndex(0);
                  SFX.pop();
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-black transition-all cursor-pointer min-h-[38px] ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs scale-102'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{lang === 'id' ? cat.nameId : cat.nameEn}</span>
              </button>
            ))}
          </div>

          {/* Page Carousel for Current Category */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            {filteredPages.map((page, idx) => {
              const isSelected = selectedPageIndex === idx;
              const isDone = (pageColors[page.id] && Object.keys(pageColors[page.id]).length === page.parts.length);
              const isDaily = page.id === dailyChallengePage.id;

              return (
                <button
                  key={page.id}
                  onClick={() => {
                    setSelectedPageIndex(idx);
                    SFX.pop();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl whitespace-nowrap text-xs font-black border-2 transition-all cursor-pointer shrink-0 relative min-h-[38px] ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-500 shadow-sm scale-103'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-base">{page.emoji}</span>
                  <span>{lang === 'id' ? page.nameId : page.nameEn}</span>
                  {isDaily && (
                    <span className="bg-amber-500 text-white text-[9px] px-1 py-0.2 rounded-md font-black flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 fill-current" />
                      {lang === 'id' ? 'Hari Ini' : 'Daily'}
                    </span>
                  )}
                  {isDone && (
                    <span className="text-emerald-600 text-xs font-black">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Coloring Board & Palette Sidebar */}
          <div className="flex-1 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-center justify-center">
            {/* Interactive SVG Canvas */}
            <div className="w-full max-w-[320px] sm:max-w-md max-h-[38vh] sm:max-h-[46vh] md:max-h-[450px] aspect-square bg-white rounded-3xl border-3 border-slate-200 shadow-md p-3 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden shrink-0 touch-none">
              {/* Daily Challenge Badge */}
              {isDailyChallenge && (
                <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current text-yellow-200" />
                  <span>{lang === 'id' ? 'Tantangan Hari Ini!' : 'Daily Challenge!'}</span>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-slate-100/90 backdrop-blur-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-black text-slate-700 border border-slate-200">
                <span>{currentCompletedCount} / {activePage.parts.length}</span>
                {isCurrentPageFinished && <span className="text-emerald-600">🎉</span>}
              </div>

              <svg
                id="coloring-page-svg"
                viewBox={activePage.viewBox}
                className="w-full h-full select-none cursor-pointer filter drop-shadow-xs max-h-[300px] sm:max-h-[360px]"
              >
                {activePage.parts.map((part) => {
                  const fillColor = currentColorMap[part.id] || '#ffffff';
                  return (
                    <path
                      key={part.id}
                      d={part.d}
                      fill={fillColor}
                      stroke="#1e293b"
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      onClick={() => handleColorPart(part.id)}
                      className="transition-colors duration-150 hover:brightness-95 active:scale-98"
                    />
                  );
                })}
              </svg>

              {/* Bottom Canvas Controls */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2">
                <button
                  onClick={handleResetCurrentPage}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Ulangi Warna"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{lang === 'id' ? 'Ulang' : 'Reset'}</span>
                </button>

                <button
                  onClick={handleSaveArtwork}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                  title="Simpan Hasil Karya"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Simpan Gambar' : 'Save Picture'}</span>
                </button>
              </div>
            </div>

            {/* Color Palette Sidebar */}
            <div className="w-full md:w-64 bg-white p-3 rounded-3xl border-2 border-slate-200 shadow-xs flex flex-col gap-2.5">
              {/* Palette Theme Tabs */}
              <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                  {lang === 'id' ? 'Palet Warna:' : 'Color Theme:'}
                </span>
                <div className="flex items-center gap-1">
                  {PALETTE_THEMES.map((theme, tIdx) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setActivePaletteIndex(tIdx);
                        setSelectedColor(theme.colors[0].hex);
                        SFX.bloop();
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                        activePaletteIndex === tIdx
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {theme.nameId.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Grid */}
              <div className="grid grid-cols-6 md:grid-cols-4 gap-2 justify-items-center py-1">
                {currentPalette.colors.map((col) => {
                  const isSelected = selectedColor === col.hex;
                  return (
                    <button
                      key={col.hex}
                      onClick={() => handleSelectColor(col.hex, col.nameId, col.nameEn)}
                      className={`w-9 h-9 rounded-full cursor-pointer transition-all relative flex items-center justify-center ${
                        isSelected
                          ? 'scale-115 ring-3 ring-slate-900 shadow-md'
                          : 'hover:scale-105 border border-slate-300'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={lang === 'id' ? col.nameId : col.nameEn}
                      aria-label={col.nameId}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 ${
                            col.hex === '#ffffff' || col.hex === '#fef08a' || col.hex === '#ccff00'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Interactive Audio Hint */}
              <div className="text-[11px] text-slate-600 font-bold bg-emerald-50/80 border border-emerald-200/60 p-2 rounded-xl text-center flex items-center justify-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {lang === 'id'
                    ? 'Ketuk warna untuk mendengar bunyinya, lalu sentuh gambar!'
                    : 'Tap a color to hear its name, then tap the picture!'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODE 2: FREE CANVAS DRAWING ================= */}
      {mode === 'free' && (
        <div className="flex-1 flex flex-col gap-2">
          {/* Main Free Drawing Tools Bar */}
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
            {/* Tool Selection */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setTool('brush');
                  SFX.bloop();
                }}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'brush'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Kuas Ceria"
              >
                <PenTool className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Kuas' : 'Brush'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('rainbow');
                  SFX.ding();
                }}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'rainbow'
                    ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Kuas Pelangi"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Pelangi' : 'Rainbow'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('glitter');
                  SFX.ding();
                }}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'glitter'
                    ? 'bg-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Kuas Bintang Berkilau"
              >
                <Star className="w-4 h-4 fill-current text-yellow-500" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Berkilau' : 'Glitter'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('eraser');
                  SFX.bloop();
                }}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'eraser'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Penghapus"
              >
                <Eraser className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Hapus' : 'Eraser'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('sticker');
                  SFX.pop();
                }}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'sticker'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Stempel Stiker"
              >
                <Smile className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Stiker' : 'Sticker'}</span>
              </button>
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { size: 6, label: 'Halus' },
                { size: 12, label: 'Sedang' },
                { size: 22, label: 'Tebal' },
              ].map((s) => (
                <button
                  key={s.size}
                  onClick={() => {
                    setBrushSize(s.size);
                    SFX.bloop();
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    brushSize === s.size ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Canvas Actions: Undo, Clear, Fill Background, Save */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Batal Coretan"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleFillCanvasBackground}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-amber-800 font-bold text-xs cursor-pointer transition-colors"
                title="Warnai Latar Belakang Kanvas"
              >
                {lang === 'id' ? 'Warna Latar' : 'Fill BG'}
              </button>

              <button
                onClick={handleClearCanvas}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer transition-colors"
                title="Bersihkan Kanvas"
              >
                {lang === 'id' ? 'Bersihkan' : 'Clear'}
              </button>

              <button
                onClick={handleSaveArtwork}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                title="Simpan ke Galeri"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'id' ? 'Simpan' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Sticker Bar if Tool is Sticker */}
          {tool === 'sticker' && (
            <div className="flex flex-col gap-1.5 bg-amber-50 border border-amber-200 p-2 rounded-2xl">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs font-black text-amber-900 shrink-0">
                  {lang === 'id' ? 'Kategori Stiker:' : 'Packs:'}
                </span>
                {STICKER_PACKS.map((pack, pIdx) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      setActiveStickerPackIdx(pIdx);
                      setSelectedSticker(pack.stickers[0]);
                      SFX.bloop();
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer transition-all min-h-[34px] ${
                      activeStickerPackIdx === pIdx
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white text-amber-800 border border-amber-300'
                    }`}
                  >
                    {lang === 'id' ? pack.nameId : pack.nameEn}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                {currentStickerPack.stickers.map((stk) => (
                  <button
                    key={stk}
                    onClick={() => {
                      setSelectedSticker(stk);
                      SFX.pop();
                    }}
                    className={`text-2xl p-1.5 rounded-xl cursor-pointer transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center ${
                      selectedSticker === stk ? 'scale-125 bg-amber-200 ring-2 ring-amber-500' : 'hover:scale-115'
                    }`}
                  >
                    {stk}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Bar if Brush */}
          {tool !== 'sticker' && tool !== 'eraser' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-black text-slate-700 shrink-0 pl-1">
                {lang === 'id' ? 'Warna:' : 'Color:'}
              </span>
              {currentPalette.colors.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => handleSelectColor(col.hex, col.nameId, col.nameEn)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 cursor-pointer transition-transform min-w-[32px] min-h-[32px] ${
                    selectedColor === col.hex ? 'scale-120 ring-3 ring-slate-900 shadow-xs' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  aria-label={col.nameId}
                  title={lang === 'id' ? col.nameId : col.nameEn}
                />
              ))}
            </div>
          )}

          {/* Interactive Free Canvas */}
          <div className="flex-1 bg-white rounded-3xl border-3 border-slate-300 shadow-md overflow-hidden relative touch-none min-h-[300px] sm:min-h-[400px] md:min-h-[500px] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={550}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-full cursor-crosshair block touch-none"
            />
          </div>
        </div>
      )}

      {/* ================= GALERI KARYAKU MODAL ================= */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border-4 border-amber-300 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-6 h-6" />
                <h3 className="font-black text-lg">
                  {lang === 'id' ? 'Galeri Karyaku' : 'My Art Gallery'}
                </h3>
              </div>
              <button
                onClick={() => setIsGalleryOpen(false)}
                className="p-1 rounded-xl bg-black/20 hover:bg-black/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gallery Grid or Empty State */}
            <div className="flex-1 overflow-y-auto p-4">
              {savedArtworks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                  <span className="text-5xl">🎨</span>
                  <p className="font-black text-slate-800 text-base">
                    {lang === 'id' ? 'Belum ada gambar yang tersimpan!' : 'No saved artworks yet!'}
                  </p>
                  <p className="text-xs max-w-xs text-slate-500">
                    {lang === 'id'
                      ? 'Warnai gambar kesukaanmu atau buat coretan bebas, lalu klik tombol "Simpan Gambar"!'
                      : 'Color your favorite pages or draw freely, then click "Save" to keep them here!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedArtworks.map((art) => (
                    <div
                      key={art.id}
                      className="bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="aspect-square bg-white flex items-center justify-center p-2 border-b border-slate-200">
                        <img
                          src={art.dataUrl}
                          alt={art.title}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1">
                        <div className="overflow-hidden">
                          <p className="font-black text-xs text-slate-800 truncate">{art.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(art.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={art.dataUrl}
                            download={`${art.title}.png`}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                            title="Unduh"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={(e) => deleteFromGallery(art.id, e)}
                            className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsGalleryOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs cursor-pointer"
              >
                {lang === 'id' ? 'Tutup Galeri' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

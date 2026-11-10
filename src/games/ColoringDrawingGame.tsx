import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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
  Flame,
  Grid,
  Maximize2,
} from 'lucide-react';
import {
  COLORING_PAGES,
  COLORING_CATEGORIES,
  PALETTE_THEMES,
  STICKER_PACKS,
  ColoringPage,
  getSampleColorForPart,
} from '../data/coloringPages';
import { SFX, speakText, unlockAudio } from '../utils/audio';
import { SlideScrollContainer } from '../components/SlideScrollContainer';

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
  const [selectedColorName, setSelectedColorName] = useState(currentPalette.colors[0].nameId);

  // Tools in free drawing: 'brush' | 'rainbow' | 'glitter' | 'eraser' | 'sticker'
  const [tool, setTool] = useState<'brush' | 'rainbow' | 'glitter' | 'eraser' | 'sticker'>('brush');
  const [brushSize, setBrushSize] = useState<number>(level === 0 ? 26 : level === 1 ? 16 : 8);

  // Sticker pack selection
  const [activeStickerPackIdx, setActiveStickerPackIdx] = useState(0);
  const currentStickerPack = STICKER_PACKS[activeStickerPackIdx] || STICKER_PACKS[0];
  const [selectedSticker, setSelectedSticker] = useState(currentStickerPack.stickers[0]);

  // Gallery modal & Catalog modal & Sample modal
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [savedArtworks, setSavedArtworks] = useState<SavedArtwork[]>([]);

  // Daily Challenge logic (deterministic based on day of year)
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const dailyChallengePage = COLORING_PAGES[dayOfYear % COLORING_PAGES.length];
  const isDailyChallenge = activePage.id === dailyChallengePage.id;

  // Free canvas ref & history for undo
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
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

  // Dynamically initialize and resize canvas to fit container perfectly (eliminates offset & dead zones)
  const initCanvasSize = () => {
    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 800;
    const height = Math.floor(rect.height) || 550;

    if (width <= 0 || height <= 0) return;

    // Preserve existing drawing if canvas already has content
    let savedCanvas: HTMLCanvasElement | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try {
        savedCanvas = document.createElement('canvas');
        savedCanvas.width = canvas.width;
        savedCanvas.height = canvas.height;
        const tempCtx = savedCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
        }
      } catch {
        // ignore
      }
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        if (savedCanvas) {
          ctx.drawImage(savedCanvas, 0, 0, width, height);
        }
      }
      saveCanvasState();
    }
  };

  // Initialize canvas on free mode and keep it responsive
  useEffect(() => {
    if (mode === 'free') {
      const timer = setTimeout(() => {
        initCanvasSize();
      }, 40);

      const handleResize = () => {
        initCanvasSize();
      };
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [mode]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvasHistoryRef.current = [...canvasHistoryRef.current.slice(-15), snap];
    } catch {
      // Ignore
    }
  };

  const handleUndo = () => {
    if (canvasHistoryRef.current.length <= 1) return;
    SFX.bloop();
    canvasHistoryRef.current.pop(); // remove current
    const prev = canvasHistoryRef.current[canvasHistoryRef.current.length - 1];
    const canvas = canvasRef.current;
    if (!canvas || !prev) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(prev, 0, 0);
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
    SFX.pop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  // Previous & Next Page Navigation
  const handlePrevPage = () => {
    SFX.bloop();
    setSelectedPageIndex((prev) => (prev > 0 ? prev - 1 : filteredPages.length - 1));
  };

  const handleNextPage = () => {
    SFX.bloop();
    setSelectedPageIndex((prev) => (prev < filteredPages.length - 1 ? prev + 1 : 0));
  };

  // Color selection with audio pronunciation
  const handleSelectColor = (hex: string, nameId: string, nameEn: string) => {
    setSelectedColor(hex);
    setSelectedColorName(lang === 'id' ? nameId : nameEn);
    SFX.bloop();
    unlockAudio();
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

  const handleApplySampleColors = () => {
    SFX.fanfare();
    const sampleMap: Record<string, string> = {};
    activePage.parts.forEach((p) => {
      sampleMap[p.id] = getSampleColorForPart(activePage.id, p.id);
    });
    setPageColors((prev) => ({
      ...prev,
      [activePage.id]: sampleMap,
    }));
    setShowSampleModal(false);
    speakText(lang === 'id' ? 'Contoh warna berhasil ditiru!' : 'Sample colors applied!', lang);
  };

  // Helper to accurately extract (x, y) on canvas without any offset or letterbox distortion
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Drawing Canvas Pointer Events - Ultra-responsive touch & immediate dot on touch
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudio();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer so fast finger dragging is tracked smoothly
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    const { x, y } = getCanvasCoords(e);

    if (tool === 'sticker') {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = `${brushSize * 3.5 + 24}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedSticker, x, y);
      SFX.pop();
      saveCanvasState();
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Immediately draw a smooth circular dot at the point of touch
    // (This guarantees instant visual feedback on touch/tap without needing to drag)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'rainbow') {
      rainbowHueRef.current = (rainbowHueRef.current + 8) % 360;
      ctx.fillStyle = `hsl(${rainbowHueRef.current}, 95%, 52%)`;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'glitter') {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      saveCanvasState();
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    const last = lastPointRef.current || { x, y };

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'rainbow') {
      rainbowHueRef.current = (rainbowHueRef.current + 5) % 360;
      ctx.strokeStyle = `hsl(${rainbowHueRef.current}, 95%, 52%)`;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'glitter') {
      ctx.strokeStyle = '#facc15';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Sparkles
      if (Math.random() > 0.35) {
        const sparkX = x + (Math.random() - 0.5) * brushSize * 2.5;
        const sparkY = y + (Math.random() - 0.5) * brushSize * 2.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#fde047';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = selectedColor;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPointRef.current = { x, y };
  };

  // Convert SVG coloring page to PNG Data URL for saving
  const exportColoringPageToDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      const svgElement = document.getElementById('coloring-page-svg') as SVGElement | null;
      if (!svgElement) {
        resolve('');
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 700;
        canvas.height = 700;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 30, 30, 640, 640);

          // Add child name & brand signature watermark
          ctx.font = 'bold 20px sans-serif';
          ctx.fillStyle = '#059669';
          ctx.textAlign = 'right';
          ctx.fillText(
            `Karya: ${playerName || 'Seniman Kecil'} • Wali Pintar`,
            canvas.width - 24,
            canvas.height - 20
          );
        }
        URL.revokeObjectURL(blobURL);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = blobURL;
    });
  };

  const handleSaveArtwork = async () => {
    SFX.fanfare();
    let dataUrl = '';
    const title =
      mode === 'coloring'
        ? `${activePage.nameId} (${activePage.emoji})`
        : `Lukisan Bebas ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (mode === 'coloring') {
      dataUrl = await exportColoringPageToDataUrl();
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    if (!dataUrl) return;

    const newArt: SavedArtwork = {
      id: `art_${Date.now()}`,
      title,
      timestamp: Date.now(),
      dataUrl,
    };

    saveToGalleryStore(newArt);

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
    <div className="flex-1 flex flex-col w-full h-full max-w-7xl mx-auto p-1.5 sm:p-2.5 md:p-3 overflow-hidden select-none">
      {/* ================= COMPACT UNIVERSAL TOP HEADER ================= */}
      <header className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 bg-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
        {/* Left: Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm cursor-pointer transition-colors shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">{lang === 'id' ? 'Kembali' : 'Back'}</span>
        </button>

        {/* Center: Title / Active Page Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-hidden text-center justify-center">
          <span className="text-base sm:text-xl shrink-0">
            {mode === 'coloring' ? activePage.emoji : '🎨'}
          </span>
          <div className="truncate text-left sm:text-center">
            <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-tight truncate">
              {mode === 'coloring' ? (lang === 'id' ? activePage.nameId : activePage.nameEn) : (lang === 'id' ? 'Kanvas Gambar Bebas' : 'Free Canvas')}
            </h2>
            <div className="text-[10px] sm:text-xs font-bold text-emerald-700 leading-none truncate">
              {mode === 'coloring' ? (
                <span>
                  {selectedPageIndex + 1} / {filteredPages.length} {lang === 'id' ? 'Gambar' : 'Pages'}
                </span>
              ) : (
                <span>{lang === 'id' ? 'Kuas Berkilau & Stiker Ceria' : 'Glitter Brush & Stickers'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Mode Switcher, Catalog Button & Gallery */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl">
            <button
              onClick={() => {
                setMode('coloring');
                SFX.bloop();
              }}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                mode === 'coloring' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{lang === 'id' ? 'Mewarnai' : 'Coloring'}</span>
            </button>
            <button
              onClick={() => {
                setMode('free');
                SFX.bloop();
              }}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                mode === 'free' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{lang === 'id' ? 'Bebas' : 'Free'}</span>
            </button>
          </div>

          {/* Catalog Button in Coloring Mode */}
          {mode === 'coloring' && (
            <button
              onClick={() => {
                SFX.pop();
                setIsCatalogOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] sm:text-xs cursor-pointer border border-emerald-200 transition-colors"
              title="Katalog 30+ Gambar"
            >
              <Grid className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">{lang === 'id' ? '30+ Gambar' : 'Catalog'}</span>
            </button>
          )}

          {/* Gallery Button */}
          <button
            onClick={() => {
              SFX.bloop();
              setIsGalleryOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-[11px] sm:text-xs cursor-pointer border border-amber-200 transition-colors relative"
            title="Galeri Karyaku"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">{lang === 'id' ? 'Galeri' : 'Gallery'}</span>
            {savedArtworks.length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {savedArtworks.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ================= MODE 1: COLORING BOOK ================= */}
      {mode === 'coloring' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Quick Categories Bar (Slideable with clear visual indicator & chevrons) */}
          <div className="py-1 shrink-0">
            <SlideScrollContainer
              showScrollbar={true}
              showChevrons={true}
              gradientColor="from-[#d4eeff]"
            >
              {COLORING_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedPageIndex(0);
                    SFX.pop();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap text-[11px] sm:text-xs font-black transition-all cursor-pointer min-h-[34px] shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-2xs scale-102'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{lang === 'id' ? cat.nameId : cat.nameEn}</span>
                </button>
              ))}
            </SlideScrollContainer>
          </div>

          {/* Responsive Split View: Portrait (Stacked) vs Landscape/Tablet (Side-by-Side) */}
          <div className="flex-1 flex flex-col md:flex-row landscape:flex-row gap-2 sm:gap-2.5 min-h-0 overflow-hidden mt-1">
            {/* STAGE A: CANVAS BOARD (FLEXIBLE HEIGHT & WIDTH) */}
            <div className="flex-1 relative flex items-center justify-center bg-white rounded-3xl border-2 sm:border-3 border-slate-200/90 shadow-sm p-2 sm:p-3 overflow-hidden touch-none select-none min-h-[220px]">
              {/* CONTOH DESAIN SUDAH DIWARNAI DI UJUNG GAMBAR DENGAN JUDUL DI BAWAHNYA */}
              <div
                className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-20 flex flex-col items-center bg-white/95 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border-2 border-emerald-400 shadow-md select-none group"
                title={lang === 'id' ? 'Contoh Desain yang Sudah Diwarnai (Ketuk untuk memperbesar)' : 'Sample Colored Design (Tap to enlarge)'}
              >
                {/* Thumbnail Gambar Contoh Desain yang Sudah Diwarnai */}
                <button
                  type="button"
                  onClick={() => {
                    SFX.ding();
                    setShowSampleModal(true);
                  }}
                  className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-emerald-200/90 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                  aria-label="Lihat Contoh Desain"
                >
                  <svg viewBox={activePage.viewBox} className="w-full h-full pointer-events-none filter drop-shadow-2xs">
                    {activePage.parts.map((part) => (
                      <path
                        key={part.id}
                        d={part.d}
                        fill={getSampleColorForPart(activePage.id, part.id)}
                        stroke="#1e293b"
                        strokeWidth="2.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <span className="absolute top-0.5 right-0.5 text-[7.5px] sm:text-[9px] bg-emerald-600 text-white font-black px-1 rounded-sm shadow-2xs leading-tight">
                    IDE
                  </span>
                </button>

                {/* JUDUL DIBAWAH GAMBAR CONTOH */}
                <div className="mt-1 text-center max-w-[62px] sm:max-w-[78px] md:max-w-[95px] leading-tight">
                  <span className="text-[8px] sm:text-[9px] font-black text-emerald-800 uppercase tracking-tight block">
                    {lang === 'id' ? 'Contoh Desain' : 'Design Sample'}
                  </span>
                  <span className="text-[7.5px] sm:text-[8.5px] font-extrabold text-slate-700 truncate block mt-0.5" title={lang === 'id' ? activePage.nameId : activePage.nameEn}>
                    {lang === 'id' ? activePage.nameId : activePage.nameEn}
                  </span>
                </div>
              </div>

              {/* Badges di Pojok Kanan Atas (Tantangan & Progres Bagian) */}
              <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 flex items-center gap-1.5">
                {isDailyChallenge && (
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-current text-yellow-200" />
                    <span>{lang === 'id' ? 'Tantangan!' : 'Daily!'}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 bg-slate-100/90 backdrop-blur-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-black text-slate-700 border border-slate-200/90 shadow-2xs">
                  <span>{currentCompletedCount} / {activePage.parts.length}</span>
                  {isCurrentPageFinished && <span className="text-emerald-600">🎉</span>}
                </div>
              </div>

              {/* Previous Page Arrow (Left) */}
              <button
                onClick={handlePrevPage}
                className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-emerald-50 active:scale-95 text-slate-700 hover:text-emerald-700 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer transition-all"
                title="Gambar Sebelumnya"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Page Arrow (Right) */}
              <button
                onClick={handleNextPage}
                className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-emerald-50 active:scale-95 text-slate-700 hover:text-emerald-700 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer transition-all"
                title="Gambar Selanjutnya"
                aria-label="Next Page"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Interactive Coloring SVG */}
              <div className="w-full h-full flex items-center justify-center max-w-[420px] max-h-[420px] md:max-w-[480px] md:max-h-[480px] px-8">
                <svg
                  id="coloring-page-svg"
                  viewBox={activePage.viewBox}
                  className="w-full h-full max-h-full select-none cursor-pointer filter drop-shadow-xs"
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
              </div>

              {/* Floating Bottom Action Buttons inside Canvas */}
              <div className="absolute bottom-2 inset-x-2 sm:bottom-2.5 sm:inset-x-3 flex items-center justify-between gap-1 z-10 pointer-events-none">
                <button
                  onClick={handleResetCurrentPage}
                  className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors border border-slate-200/90 shadow-2xs"
                  title="Ulangi Warna"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">{lang === 'id' ? 'Ulang' : 'Reset'}</span>
                </button>

                <button
                  onClick={handleSaveArtwork}
                  className="pointer-events-auto px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition-all active:scale-98"
                  title="Simpan Hasil Karya"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Simpan' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* STAGE B: COLOR PALETTE DOCK (Bottom in Portrait, Sidebar in Landscape/Tablet) */}
            <div className="w-full md:w-64 landscape:w-60 lg:w-72 bg-white p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 shadow-2xs flex flex-col justify-between shrink-0 overflow-y-auto no-scrollbar">
              {/* Palette Themes Switcher */}
              <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5 mb-1">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-800 uppercase tracking-wide shrink-0">
                  {lang === 'id' ? 'Palet:' : 'Palette:'}
                </span>
                <SlideScrollContainer
                  showScrollbar={false}
                  showChevrons={true}
                  gradientColor="from-white"
                  className="flex-1 min-w-0"
                >
                  {PALETTE_THEMES.map((theme, tIdx) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setActivePaletteIndex(tIdx);
                        setSelectedColor(theme.colors[0].hex);
                        setSelectedColorName(lang === 'id' ? theme.colors[0].nameId : theme.colors[0].nameEn);
                        SFX.bloop();
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                        activePaletteIndex === tIdx
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {theme.nameId.split(' ')[0]}
                    </button>
                  ))}
                </SlideScrollContainer>
              </div>

              {/* Colors Grid (Large Touch Targets >= 42px) */}
              <div className="grid grid-cols-6 md:grid-cols-4 landscape:grid-cols-4 gap-1.5 sm:gap-2 justify-items-center py-1">
                {currentPalette.colors.map((col) => {
                  const isSelected = selectedColor === col.hex;
                  return (
                    <button
                      key={col.hex}
                      onClick={() => handleSelectColor(col.hex, col.nameId, col.nameEn)}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full cursor-pointer transition-all relative flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'scale-110 ring-3 ring-slate-900 shadow-md'
                          : 'hover:scale-105 border border-slate-300 shadow-2xs'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={lang === 'id' ? col.nameId : col.nameEn}
                      aria-label={col.nameId}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            col.hex === '#ffffff' || col.hex === '#fef08a' || col.hex === '#ccff00' || col.hex === '#bbf7d0'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Color Name with Voice Sound */}
              <div className="mt-1 flex items-center justify-between gap-1.5 bg-emerald-50/90 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-center">
                <div className="flex items-center gap-1.5 truncate">
                  <div
                    className="w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span className="text-[11px] font-black text-emerald-950 truncate">
                    {selectedColorName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => speakText(selectedColorName, lang)}
                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer shrink-0"
                  title="Dengarkan Suara Warna"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODE 2: FREE CANVAS DRAWING ================= */}
      {mode === 'free' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Main Free Drawing Tools Bar (Compact single row) */}
          <div className="bg-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-1.5 shrink-0 mb-1">
            {/* Tool Selection */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setTool('brush');
                  SFX.bloop();
                }}
                className={`p-1.5 sm:p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'brush'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Kuas Ceria"
              >
                <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Kuas' : 'Brush'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('rainbow');
                  SFX.ding();
                }}
                className={`p-1.5 sm:p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'rainbow'
                    ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Kuas Pelangi"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Pelangi' : 'Rainbow'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('glitter');
                  SFX.ding();
                }}
                className={`p-1.5 sm:p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'glitter'
                    ? 'bg-amber-400 text-amber-950 shadow-2xs ring-2 ring-amber-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Kuas Bintang Berkilau"
              >
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-yellow-500" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Bintang' : 'Glitter'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('eraser');
                  SFX.bloop();
                }}
                className={`p-1.5 sm:p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'eraser'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Penghapus"
              >
                <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Hapus' : 'Eraser'}</span>
              </button>

              <button
                onClick={() => {
                  setTool('sticker');
                  SFX.pop();
                }}
                className={`p-1.5 sm:p-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                  tool === 'sticker'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Stempel Stiker"
              >
                <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Stiker' : 'Sticker'}</span>
              </button>
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl">
              {[
                { size: 8, label: 'Halus' },
                { size: 16, label: 'Sedang' },
                { size: 26, label: 'Tebal' },
              ].map((s) => (
                <button
                  key={s.size}
                  onClick={() => {
                    setBrushSize(s.size);
                    SFX.bloop();
                  }}
                  className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-[10.5px] sm:text-xs font-black cursor-pointer transition-all min-h-[30px] flex items-center justify-center ${
                    brushSize === s.size ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Canvas Actions: Undo, Clear, Save */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Batal Coretan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleFillCanvasBackground}
                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-amber-100 text-amber-800 font-bold text-[11px] cursor-pointer transition-colors hidden sm:inline"
                title="Warnai Latar Belakang Kanvas"
              >
                {lang === 'id' ? 'Warna Latar' : 'Fill BG'}
              </button>

              <button
                onClick={handleClearCanvas}
                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-700 font-bold text-[11px] cursor-pointer transition-colors"
                title="Bersihkan Kanvas"
              >
                {lang === 'id' ? 'Bersih' : 'Clear'}
              </button>

              <button
                onClick={handleSaveArtwork}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                title="Simpan ke Galeri"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Simpan' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* Sticker Bar if Tool is Sticker */}
          {tool === 'sticker' && (
            <div className="bg-amber-50 border border-amber-200 p-1.5 rounded-2xl mb-1 shrink-0">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] font-black text-amber-900">
                  {lang === 'id' ? 'Pilih Stiker:' : 'Stickers:'}
                </span>
                <span className="text-[9.5px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md">
                  ↔ Geser Stiker
                </span>
              </div>
              <SlideScrollContainer
                showScrollbar={true}
                showChevrons={true}
                gradientColor="from-amber-50"
              >
                {currentStickerPack.stickers.map((stk) => (
                  <button
                    key={stk}
                    onClick={() => {
                      setSelectedSticker(stk);
                      SFX.pop();
                    }}
                    className={`text-xl sm:text-2xl p-1.5 rounded-xl cursor-pointer transition-transform shrink-0 ${
                      selectedSticker === stk ? 'scale-120 bg-amber-200 ring-2 ring-amber-500 shadow-2xs' : 'hover:scale-110'
                    }`}
                  >
                    {stk}
                  </button>
                ))}
              </SlideScrollContainer>
            </div>
          )}

          {/* Color Bar if Brush */}
          {tool !== 'sticker' && tool !== 'eraser' && (
            <div className="bg-white px-2 py-1.5 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0 mb-1">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] font-black text-slate-700">
                  {lang === 'id' ? 'Warna Kuas:' : 'Brush Color:'}
                </span>
                <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                  ↔ Geser Pilihan Warna
                </span>
              </div>
              <SlideScrollContainer
                showScrollbar={true}
                showChevrons={true}
                gradientColor="from-white"
              >
                {currentPalette.colors.map((col) => (
                  <button
                    key={col.hex}
                    onClick={() => handleSelectColor(col.hex, col.nameId, col.nameEn)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 cursor-pointer transition-transform ${
                      selectedColor === col.hex ? 'scale-115 ring-3 ring-slate-900 shadow-xs' : 'hover:scale-105 border border-slate-200'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    aria-label={col.nameId}
                    title={lang === 'id' ? col.nameId : col.nameEn}
                  />
                ))}
              </SlideScrollContainer>
            </div>
          )}

          {/* Interactive Responsive Canvas */}
          <div
            ref={canvasContainerRef}
            className="flex-1 bg-white rounded-3xl border-2 sm:border-3 border-slate-300 shadow-sm overflow-hidden relative touch-none select-none min-h-[260px] w-full"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-full block cursor-crosshair bg-white touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>
      )}

      {/* ================= KATALOG 30+ GAMBAR MODAL ================= */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-emerald-400 overflow-hidden">
            {/* Header */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 sm:w-6 sm:h-6" />
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    {lang === 'id' ? 'Pilih Gambar Mewarnai (30+ Koleksi)' : 'Coloring Book Catalog'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-emerald-100">
                    {lang === 'id' ? 'Ketuk gambar mana saja untuk mulai mewarnai!' : 'Tap any picture to start coloring!'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="p-1 rounded-xl bg-black/20 hover:bg-black/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Categories inside Catalog */}
            <div className="p-2 sm:p-3 bg-slate-50 border-b border-slate-200">
              <SlideScrollContainer showScrollbar={true} showChevrons={true} gradientColor="from-slate-50">
                {COLORING_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      SFX.pop();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{cat.emoji} </span>
                    <span>{lang === 'id' ? cat.nameId : cat.nameEn}</span>
                  </button>
                ))}
              </SlideScrollContainer>
            </div>

            {/* Grid of Pages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredPages.map((page, idx) => {
                  const isDone = (pageColors[page.id] && Object.keys(pageColors[page.id]).length === page.parts.length);
                  const isSelected = selectedPageIndex === idx;
                  const isDaily = page.id === dailyChallengePage.id;

                  return (
                    <button
                      key={page.id}
                      onClick={() => {
                        setSelectedPageIndex(idx);
                        setIsCatalogOpen(false);
                        SFX.fanfare();
                      }}
                      className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-102 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                          : 'bg-slate-50/80 hover:bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-4xl sm:text-5xl my-1 relative">
                        {page.emoji}
                        {isDone && (
                          <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
                            ✓
                          </span>
                        )}
                        {isDaily && (
                          <span className="absolute -bottom-1 -left-2 bg-amber-500 text-white text-[9px] px-1 rounded-md font-black flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </div>
                      <div className="w-full truncate">
                        <p className="font-black text-xs sm:text-sm text-slate-800 truncate">
                          {lang === 'id' ? page.nameId : page.nameEn}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {page.parts.length} {lang === 'id' ? 'bagian warna' : 'parts'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs cursor-pointer"
              >
                {lang === 'id' ? 'Tutup Katalog' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= GALERI KARYAKU MODAL ================= */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border-4 border-amber-300 overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <h3 className="font-black text-base sm:text-lg">
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
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {savedArtworks.map((art) => (
                    <div
                      key={art.id}
                      className="bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col"
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

      {/* ================= MODAL CONTOH DESAIN PEMBESAR ================= */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border-4 border-emerald-400 flex flex-col items-center text-center">
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[11px] sm:text-xs font-black uppercase text-emerald-800 tracking-wider bg-emerald-100 px-2.5 py-0.5 rounded-full">
                🎨 {lang === 'id' ? 'Contoh Desain Mewarnai' : 'Coloring Design Sample'}
              </span>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gambar Besar Contoh Desain yang Sudah Diwarnai */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 bg-emerald-50/70 rounded-2xl p-3 border-2 border-emerald-200 flex items-center justify-center my-2 shadow-inner">
              <svg viewBox={activePage.viewBox} className="w-full h-full filter drop-shadow-md">
                {activePage.parts.map((part) => (
                  <path
                    key={part.id}
                    d={part.d}
                    fill={getSampleColorForPart(activePage.id, part.id)}
                    stroke="#1e293b"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
            </div>

            {/* Judul di Bawah Gambar Contoh */}
            <h4 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {lang === 'id' ? activePage.nameId : activePage.nameEn}
            </h4>
            <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
              {lang === 'id'
                ? 'Contoh kombinasi warna yang sudah jadi. Si kecil bisa mewarnai sendiri atau meniru contoh ini!'
                : 'Finished design idea. Your child can color freely or copy this sample!'}
            </p>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleApplySampleColors}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>{lang === 'id' ? 'Tiru Warna Ini' : 'Use These Colors'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
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

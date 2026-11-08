import React, { useState, useMemo } from 'react';
import { X, Volume2, Sparkles, Search } from 'lucide-react';
import { ANIMALS, FRUITS, VEGGIES, PLANTS, VEHICLES, SHAPE_ITEMS, GameItem, ALL_ITEMS } from '../data/items';
import { ItemIcon } from './ItemIcon';
import { SFX, playAnimalSound, speakText, hasAnimalSound } from '../utils/audio';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'id' | 'en';
}

const CATEGORIES = [
  { id: 'animals', labelId: 'Hewan', labelEn: 'Animals', emoji: '🐾', items: ANIMALS },
  { id: 'fruits', labelId: 'Buah', labelEn: 'Fruits', emoji: '🍎', items: FRUITS },
  { id: 'veggies', labelId: 'Sayur', labelEn: 'Sayuran', emoji: '🥕', items: VEGGIES },
  { id: 'plants', labelId: 'Tumbuhan', labelEn: 'Tumbuhan & Bunga', emoji: '🌻', items: PLANTS },
  { id: 'vehicles', labelId: 'Kendaraan', labelEn: 'Kendaraan', emoji: '🚗', items: VEHICLES },
  { id: 'shapes', labelId: 'Bentuk Lucu', labelEn: 'Shapes & Objects', emoji: '⭐', items: SHAPE_ITEMS },
];

export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = CATEGORIES[activeTab] || CATEGORIES[0];

  // Filter items in current tab based on search query (hook must run unconditionally)
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentCategory.items;
    return currentCategory.items.filter(
      (item) =>
        item.nameId.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q)
    );
  }, [currentCategory, searchQuery]);

  if (!isOpen) return null;

  const handleItemClick = (item: GameItem) => {
    setSelectedItem(item);
    SFX.bloop();

    if (hasAnimalSound(item.emoji)) {
      playAnimalSound(item.emoji, () => {
        const text =
          lang === 'id'
            ? `${item.nameId}. ${item.factId || ''}`
            : `${item.nameEn}. ${item.factEn || ''}`;
        speakText(text, lang);
      });
    } else {
      const text =
        lang === 'id'
          ? `${item.nameId}. ${item.factId || ''}`
          : `${item.nameEn}. ${item.factEn || ''}`;
      speakText(text, lang);
    }
  };

  const handleSpeakDetail = () => {
    if (!selectedItem) return;
    if (hasAnimalSound(selectedItem.emoji)) {
      playAnimalSound(selectedItem.emoji, () => {
        const text =
          lang === 'id'
            ? `${selectedItem.nameId}. ${selectedItem.factId || ''}`
            : `${selectedItem.nameEn}. ${selectedItem.factEn || ''}`;
        speakText(text, lang);
      });
    } else {
      const text =
        lang === 'id'
          ? `${selectedItem.nameId}. ${selectedItem.factId || ''}`
          : `${selectedItem.nameEn}. ${selectedItem.factEn || ''}`;
      speakText(text, lang);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-3.5 sm:p-5 md:p-6 shadow-2xl relative border-4 border-emerald-300 my-auto text-slate-800 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 text-xl sm:text-2xl font-bold shadow-xs shrink-0">
              📚
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {lang === 'id' ? 'Pustaka Ceria' : 'Learning Library'}
                </h3>
                <span className="text-[10px] sm:text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {ALL_ITEMS.length} {lang === 'id' ? 'Item' : 'Items'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium line-clamp-1">
                {lang === 'id'
                  ? 'Katalog lengkap 505 materi edukasi anak'
                  : 'Complete 505 encyclopedia for kids'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Search Bar & Category Tabs */}
        <div className="py-2.5 space-y-2 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'id'
                  ? `Cari di antara ${currentCategory.items.length} ${currentCategory.labelId.toLowerCase()}...`
                  : `Search ${currentCategory.items.length} ${currentCategory.labelEn.toLowerCase()}...`
              }
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 text-xs md:text-sm font-bold text-slate-800 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Tab Strip */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(idx);
                  setSearchQuery('');
                  SFX.bloop();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs md:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === idx
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{lang === 'id' ? cat.labelId : cat.labelEn}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === idx ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.items.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid with Zero Book Placeholders */}
        <div className="flex-1 overflow-y-auto pr-1 py-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-sm font-bold">
                {lang === 'id'
                  ? `Tidak ada hasil pencarian "${searchQuery}"`
                  : `No results for "${searchQuery}"`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {filteredItems.map((item, idx) => (
                <button
                  key={`${item.nameId}-${idx}`}
                  onClick={() => handleItemClick(item)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-white to-slate-50/80 hover:to-emerald-50 border-2 border-slate-200/80 hover:border-emerald-400 transition-all hover:scale-104 active:scale-95 shadow-xs cursor-pointer group min-h-[96px]"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-3xl md:text-4xl mb-1 transition-transform group-hover:scale-110">
                    <ItemIcon
                      name={item.nameId}
                      emoji={item.emoji}
                      category={item.category}
                      size="2.6rem"
                    />
                  </div>
                  <div className="text-xs font-black text-slate-800 text-center leading-tight truncate w-full">
                    {lang === 'id' ? item.nameId : item.nameEn}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold truncate w-full text-center">
                    {lang === 'id' ? item.nameEn : item.nameId}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Item Detail Popover */}
        {selectedItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl relative border-4 border-emerald-300 text-center animate-scale-up">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center text-6xl bg-emerald-50 rounded-full border-2 border-emerald-200 shadow-inner">
                <ItemIcon
                  name={selectedItem.nameId}
                  emoji={selectedItem.emoji}
                  category={selectedItem.category}
                  size="4.5rem"
                />
              </div>

              <h4 className="text-2xl font-black text-slate-900 mb-0.5">
                {lang === 'id' ? selectedItem.nameId : selectedItem.nameEn}
              </h4>
              <p className="text-sm font-bold text-emerald-700 mb-3">
                {lang === 'id' ? selectedItem.nameEn : selectedItem.nameId}
              </p>

              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-950 font-medium text-left mb-4 leading-relaxed">
                <div className="font-bold text-amber-900 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{lang === 'id' ? 'Tahukah Kamu?' : 'Did you know?'}</span>
                </div>
                <p>{lang === 'id' ? selectedItem.factId : selectedItem.factEn}</p>
              </div>

              <button
                onClick={handleSpeakDetail}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:translate-y-0.5 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Volume2 className="w-5 h-5" />
                <span>{lang === 'id' ? 'Dengarkan Suara' : 'Hear Sound'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

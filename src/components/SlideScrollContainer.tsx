import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  showScrollbar?: boolean;
  showChevrons?: boolean;
  showHintBadge?: boolean;
  hintText?: string;
  gradientColor?: string; // e.g. 'from-white' or 'from-slate-100' or 'from-slate-50'
}

/**
 * SlideScrollContainer
 * Memastikan semua komponen yang memiliki daftar/tombol horizontal ke samping
 * terlihat jelas sebagai fitur yang bisa di-slide/geser (memiliki visual affordance,
 * gradasi tepi, chevron geser, dan indikator scroll yang jelas).
 */
export const SlideScrollContainer: React.FC<SlideScrollContainerProps> = ({
  children,
  className = '',
  innerClassName = '',
  showScrollbar = true,
  showChevrons = true,
  showHintBadge = false,
  hintText,
  gradientColor = 'from-white',
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const overflow = el.scrollWidth > el.clientWidth + 4;
    setHasOverflow(overflow);
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    // Recheck after layout stabilizes
    const timer = setTimeout(checkScroll, 120);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll, children]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = Math.round(el.clientWidth * 0.65) || 160;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`relative group w-full ${className}`}>
      {/* Tombol & Gradasi Geser Kiri */}
      {hasOverflow && canScrollLeft && (
        <div
          className={`absolute left-0 inset-y-0 z-10 flex items-center bg-gradient-to-r ${gradientColor} to-transparent pr-4 pl-0.5 pointer-events-none transition-opacity duration-200`}
        >
          {showChevrons && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="pointer-events-auto w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              title="Geser ke kiri"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-slate-800" />
            </button>
          )}
        </div>
      )}

      {/* Kontainer Scroll Horizontal */}
      <div
        ref={scrollRef}
        className={`w-full flex items-center gap-1.5 ${
          showScrollbar ? 'slide-scrollbar pb-1.5' : 'overflow-x-auto no-scrollbar'
        } ${innerClassName}`}
      >
        {children}
      </div>

      {/* Tombol & Gradasi Geser Kanan (Visual Cue: Terlihat Ada Konten Lanjutan yang Bisa Di-Slide) */}
      {hasOverflow && canScrollRight && (
        <div
          className={`absolute right-0 inset-y-0 z-10 flex items-center justify-end bg-gradient-to-l ${gradientColor} to-transparent pl-4 pr-0.5 pointer-events-none transition-opacity duration-200`}
        >
          {showChevrons ? (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="pointer-events-auto w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-600/90 text-white shadow-md border border-indigo-400 flex items-center justify-center hover:bg-indigo-700 active:scale-95 animate-slide-hint transition-all cursor-pointer"
              title="Geser ke kanan untuk melihat lainnya"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          ) : (
            <div className="w-3 h-full pointer-events-none" />
          )}
        </div>
      )}

      {/* Badge Hint: ↔ Geser (jika diaktifkan) */}
      {hasOverflow && showHintBadge && (
        <div className="flex items-center justify-center mt-1">
          <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-700/80 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
            <span>↔</span>
            <span>{hintText || 'Bisa Digeser Kesamping'}</span>
          </span>
        </div>
      )}
    </div>
  );
};

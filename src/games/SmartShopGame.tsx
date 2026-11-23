import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ShoppingBasket, Eye, Check, Plus, Minus } from 'lucide-react';
import { SFX, speakText, stopSpeaking } from '../utils/audio';

interface SmartShopGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

interface ShopProduct {
  id: string;
  emoji: string;
  nameId: string;
  nameEn: string;
}

interface OrderLine {
  product: ShopProduct;
  qty: number;
}

const SHOP_PRODUCTS: ShopProduct[] = [
  { id: 'apple', emoji: '🍎', nameId: 'Apel', nameEn: 'Apple' },
  { id: 'banana', emoji: '🍌', nameId: 'Pisang', nameEn: 'Banana' },
  { id: 'carrot', emoji: '🥕', nameId: 'Wortel', nameEn: 'Carrot' },
  { id: 'milk', emoji: '🥛', nameId: 'Susu', nameEn: 'Milk' },
  { id: 'bread', emoji: '🍞', nameId: 'Roti', nameEn: 'Bread' },
  { id: 'cheese', emoji: '🧀', nameId: 'Keju', nameEn: 'Cheese' },
  { id: 'strawberry', emoji: '🍓', nameId: 'Stroberi', nameEn: 'Strawberry' },
  { id: 'egg', emoji: '🥚', nameId: 'Telur', nameEn: 'Egg' },
];

export const SmartShopGame: React.FC<SmartShopGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const totalRounds = 3;
  const memorizeSeconds = level === 0 ? 5 : level === 1 ? 6 : 7;

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'MEMORIZE' | 'SHOPPING' | 'ROUND_WON'>('MEMORIZE');
  const [secondsLeft, setSecondsLeft] = useState(memorizeSeconds);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [shelf, setShelf] = useState<ShopProduct[]>([]);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [peeksUsed, setPeeksUsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showPeekOverlay, setShowPeekOverlay] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildRound = (targetRound: number) => {
    const numOrderItems = level === 0 ? 2 : level === 1 ? 3 : 3 + (targetRound >= 2 ? 1 : 0);
    const maxQty = level === 0 ? 2 : 3;
    const shelfCount = level === 0 ? 4 : level === 1 ? 6 : 8;

    const shuffledProducts = [...SHOP_PRODUCTS].sort(() => Math.random() - 0.5);
    const shelfItems = shuffledProducts.slice(0, shelfCount);
    const orderProducts = shelfItems.slice(0, numOrderItems);

    const newOrder: OrderLine[] = orderProducts.map((product) => ({
      product,
      qty: Math.floor(Math.random() * maxQty) + 1,
    }));

    setOrder(newOrder);
    setShelf([...shelfItems].sort(() => Math.random() - 0.5));
    setBasket({});
    setSecondsLeft(memorizeSeconds);
    setPhase('MEMORIZE');
    setShowPeekOverlay(false);
    setFeedback('');

    const spokenList = newOrder
      .map((line) => `${line.qty} ${lang === 'id' ? line.product.nameId : line.product.nameEn}`)
      .join(', ');
    speakText(
      lang === 'id'
        ? `Ayo ingat pesanan belanjaanmu: ${spokenList}`
        : `Remember your shopping order: ${spokenList}`,
      lang
    );
  };

  useEffect(() => {
    setRound(0);
    setMistakes(0);
    setPeeksUsed(0);
    buildRound(0);
  }, [level]);

  useEffect(() => {
    if (phase !== 'MEMORIZE') return;
    if (secondsLeft <= 0) {
      SFX.bloop();
      setPhase('SHOPPING');
      return;
    }

    const countdown = setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearTimeout(countdown);
  }, [phase, secondsLeft]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeaking();
    };
  }, []);

  const updateBasketQty = (productId: string, delta: number) => {
    if (phase !== 'SHOPPING') return;
    SFX.bloop();
    setFeedback('');
    setBasket((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(5, current + delta));
      const updated = { ...prev };
      if (next === 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  };

  const handlePeekOrder = () => {
    if (phase !== 'SHOPPING' || showPeekOverlay) return;
    SFX.bloop();
    setPeeksUsed((p) => p + 1);
    setShowPeekOverlay(true);
    timerRef.current = setTimeout(() => {
      setShowPeekOverlay(false);
    }, 2500);
  };

  const handleCheckBasket = () => {
    if (phase !== 'SHOPPING') return;
    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    // Check extra / wrong items
    for (const [id, qty] of Object.entries(basket)) {
      const targetLine = order.find((o) => o.product.id === id);
      if (!targetLine) {
        const wrongProd = SHOP_PRODUCTS.find((p) => p.id === id);
        const prodName = lang === 'id' ? wrongProd?.nameId : wrongProd?.nameEn;
        SFX.no();
        setMistakes((m) => m + 1);
        const msg =
          lang === 'id'
            ? `Oops! ${prodName} tidak ada di pesanan!`
            : `Oops! ${prodName} was not on the list!`;
        setFeedback(msg);
        speakText(msg, lang);
        return;
      }
      if (qty > targetLine.qty) {
        const prodName = lang === 'id' ? targetLine.product.nameId : targetLine.product.nameEn;
        SFX.no();
        setMistakes((m) => m + 1);
        const msg =
          lang === 'id'
            ? `${prodName} kebanyakan! Cukup ${targetLine.qty} saja.`
            : `Too many ${prodName}! You only need ${targetLine.qty}.`;
        setFeedback(msg);
        speakText(msg, lang);
        return;
      }
    }

    // Check missing items or insufficient qty
    for (const line of order) {
      const inBasket = basket[line.product.id] || 0;
      if (inBasket < line.qty) {
        const prodName = lang === 'id' ? line.product.nameId : line.product.nameEn;
        SFX.no();
        setMistakes((m) => m + 1);
        const msg =
          lang === 'id'
            ? `Kurang ${line.qty - inBasket} ${prodName} lagi di keranjang!`
            : `Need ${line.qty - inBasket} more ${prodName}!`;
        setFeedback(msg);
        speakText(msg, lang);
        return;
      }
    }

    // Exact match!
    SFX.ding();
    setPhase('ROUND_WON');
    const praise =
      lang === 'id'
        ? `🎉 Hebat, ${displayName}! Belanjaan tepat sekali!`
        : `🎉 Awesome, ${displayName}! Exact order!`;
    setFeedback(praise);
    speakText(lang === 'id' ? `Hebat sekali, ${displayName}!` : `Great job, ${displayName}!`, lang);

    timerRef.current = setTimeout(() => {
      if (round + 1 >= totalRounds) {
        const stars = mistakes === 0 && peeksUsed <= 1 ? 3 : mistakes <= 2 ? 2 : 1;
        onWin(
          stars,
          lang === 'id'
            ? `Belanja pintar selesai ${totalRounds} putaran!`
            : `Completed all ${totalRounds} shopping orders!`
        );
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        buildRound(nextRound);
      }
    }, 1400);
  };

  const totalBasketItems = Object.values(basket).reduce((acc, v) => acc + v, 0);

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-2xl phone-landscape:max-w-4xl mx-auto px-3 sm:px-4 py-2 phone-landscape:py-1.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2 phone-landscape:py-1.5 mb-2 bg-white/90 backdrop-blur-md px-3.5 sm:px-4 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 phone-landscape:w-8 phone-landscape:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 phone-landscape:w-4 phone-landscape:h-4" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
          <span>🛒</span>
          <span className="truncate">{lang === 'id' ? 'Belanja Pintar' : 'Smart Shop'}</span>
        </div>

        <div className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
          {lang === 'id' ? `Pesanan ${round + 1}/${totalRounds}` : `Order ${round + 1}/${totalRounds}`}
        </div>
      </div>

      {/* MEMORIZE PHASE */}
      {phase === 'MEMORIZE' && (
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          <div className="w-full max-w-md bg-white rounded-3xl border-3 border-amber-200 shadow-md p-5 sm:p-6 text-center">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              {lang === 'id'
                ? `Ingat Pesanan dalam ${secondsLeft} detik`
                : `Remember the Order (${secondsLeft}s)`}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-4">
              {lang === 'id' ? 'Daftar Belanja Koki Cilik' : 'Little Chef Shopping List'}
            </h2>

            {/* Countdown progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${(secondsLeft / memorizeSeconds) * 100}%` }}
              />
            </div>

            <div className="space-y-2.5 mb-5">
              {order.map((line) => (
                <div
                  key={line.product.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none">{line.product.emoji}</span>
                    <span className="font-black text-base text-slate-900">
                      {lang === 'id' ? line.product.nameId : line.product.nameEn}
                    </span>
                  </div>
                  <span className="text-lg font-black text-indigo-700 tabular-nums">
                    {line.qty}×
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                SFX.bloop();
                setPhase('SHOPPING');
              }}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              {lang === 'id' ? 'Sudah Ingat! Mulai Belanja 🛒' : 'Ready! Start Shopping 🛒'}
            </button>
          </div>
        </div>
      )}

      {/* SHOPPING & ROUND_WON PHASE */}
      {phase !== 'MEMORIZE' && (
        <div className="flex-1 flex flex-col justify-between gap-2.5 py-1">
          {/* Status & Peek Bar */}
          <div className="flex items-center justify-between gap-2 bg-white/85 px-3.5 py-2 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800">
              <ShoppingBasket className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="tabular-nums">
                {lang === 'id' ? `Keranjang: ${totalBasketItems} barang` : `Basket: ${totalBasketItems} items`}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePeekOrder}
              disabled={phase !== 'SHOPPING' || showPeekOverlay}
              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Intip Daftar' : 'Peek List'}</span>
            </button>
          </div>

          {/* Temporary Peek Card */}
          {showPeekOverlay && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-center gap-3 animate-scale-up">
              {order.map((line) => (
                <span key={line.product.id} className="text-sm font-black text-slate-900 tabular-nums">
                  {line.qty}× {line.product.emoji} {lang === 'id' ? line.product.nameId : line.product.nameEn}
                </span>
              ))}
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="flex justify-center">
              <span
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black text-center animate-scale-up ${
                  phase === 'ROUND_WON'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {feedback}
              </span>
            </div>
          )}

          {/* Grocery Shelf Grid */}
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
              {shelf.map((prod) => {
                const count = basket[prod.id] || 0;
                return (
                  <div
                    key={prod.id}
                    className={`rounded-2xl border-2 p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all bg-white shadow-xs ${
                      count > 0 ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => updateBasketQty(prod.id, 1)}
                      disabled={phase !== 'SHOPPING'}
                      className="flex flex-col items-center cursor-pointer w-full py-1 active:scale-95"
                    >
                      <span className="text-4xl sm:text-5xl phone-landscape:text-3xl leading-none">
                        {prod.emoji}
                      </span>
                      <span className="font-black text-xs sm:text-sm text-slate-900 mt-1.5">
                        {lang === 'id' ? prod.nameId : prod.nameEn}
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-2 w-full mt-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => updateBasketQty(prod.id, -1)}
                        disabled={count === 0 || phase !== 'SHOPPING'}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-35 flex items-center justify-center text-slate-700 cursor-pointer"
                        aria-label="Kurangi"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="font-black text-base text-slate-900 tabular-nums">
                        {count}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateBasketQty(prod.id, 1)}
                        disabled={count >= 5 || phase !== 'SHOPPING'}
                        className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center cursor-pointer"
                        aria-label="Tambah"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            onClick={handleCheckBasket}
            disabled={phase !== 'SHOPPING' || totalBasketItems === 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Check className="w-5 h-5" />
            <span>{lang === 'id' ? 'Cek & Bayar Belanjaan!' : 'Check & Checkout Basket!'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

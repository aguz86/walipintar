import React from 'react';
import { CUSTOM_ITEM_SVGS } from '../data/customSvg';

interface ItemIconProps {
  name: string;
  emoji?: string;
  category?: 'animals' | 'plants' | 'fruitveg' | 'fruits' | 'veggies' | 'vehicles' | 'colors' | 'shapes' | string;
  className?: string;
  size?: number | string;
}

// Complete visual mapping for varieties so NO item ever shows as a blank book (📖)
const VARIETY_FALLBACKS: Record<string, string> = {
  // --- BUAH TROPIS & VARIETAS ---
  "Pisang Raja": "🍌",
  "Pisang Ambon": "🍌",
  "Pisang Kepok": "🍌",
  "Pisang Mas": "🍌",
  "Pisang Tanduk": "🍌",
  "Pisang Susu": "🍌",
  "Pisang Barangan": "🍌",
  "Pisang Lilin": "🍌",
  "Mangga Arumanis": "🥭",
  "Mangga Gedong Gincu": "🥭",
  "Mangga Harum Manis": "🥭",
  "Jeruk Bali": "🍊",
  "Jeruk Keprok": "🍊",
  "Jeruk Siam": "🍊",
  "Jeruk Mandarin": "🍊",
  "Jeruk Nipis": "🍋",
  "Semangka Kuning": "🍉",
  "Melon Madu": "🍈",
  "Anggur Hijau": "🍇",
  "Pir Hijau": "🍐",
  "Alpukat Mentega": "🥑",
  "Kelapa Muda": "🥥",
  "Kelapa Hijau": "🥥",
  "Kelengkeng": "🍈",
  "Leci": "🍒",
  "Srikaya": "🥝",
  "Cempedak": "🥭",
  "Kesemek": "🍑",
  "Bengkuang": "🥔",
  "Sukun": "🍈",
  "Kersen": "🍒",
  "Murbei": "🫐",
  "Ciplukan": "🍒",
  "Bacang": "🥭",
  "Kuini": "🥭",
  "Delima": "🍎",
  "Aprikot": "🍑",
  "Plum": "🫐",
  "Kurma": "🫒",
  "Ara": "🫐",
  "Jambu Mete": "🥜",
  "Rambai": "🍇",
  "Terap": "🍈",
  "Buni": "🍇",
  "Kokosan": "🍈",
  "Gowok": "🫐",
  "Mundu": "🍊",
  "Kepundung": "🍇",
  "Cermai": "🍏",
  "Sawo": "🥔",
  "Duku": "🍈",
  "Sirsak": "🍐",
  "Markisa": "🍊",
  "Kemang": "🥭",
  "Kecapi": "🍑",
  "Menteng": "🍇",
  "Matoa": "🫒",
  "Buah Merah": "🌶️",
  "Bisbul": "🍑",
  "Lobi-lobi": "🍒",
  "Keledang": "🥭",
  "Lai": "Durian",
  "Rukam": "🍒",
  "Asam Jawa": "🫘",
  "Mengkudu": "🍈",
  "Kawista": "🥥",
  "Gandaria": "🥭",
  "Kapulasan": "Rambutan",
  "Kepel": "🥔",
  "Jambu Kristal": "🍐",
  "Langsat": "🍈",
  "Kedondong": "🥝",

  // --- SAYUR & HERBAL ---
  "Kacang Panjang": "🫛",
  "Labu Siam": "🍐",
  "Labu Kuning": "🎃",
  "Kembang Kol": "🥦",
  "Pare": "🥒",
  "Lobak": "🥕",
  "Cabai Rawit": "🌶️",
  "Cabai Merah": "🌶️",
  "Cabai Hijau": "🫑",
  "Selada": "🥬",
  "Selada Air": "🥬",
  "Selada Merah": "🥬",
  "Pakcoy": "🥬",
  "Sawi Putih": "🥬",
  "Sawi Hijau": "🥬",
  "Caisim": "🥬",
  "Kailan": "🥬",
  "Daun Singkong": "🍃",
  "Daun Pepaya": "🍃",
  "Daun Katuk": "🍃",
  "Daun Kelor": "🍃",
  "Daun Bawang": "🌱",
  "Seledri": "🌿",
  "Kemangi": "🌿",
  "Daun Pandan": "🍃",
  "Daun Salam": "🍃",
  "Daun Mint": "🌿",
  "Jahe": "🥔",
  "Jahe Merah": "🥔",
  "Kunyit": "🥔",
  "Lengkuas": "🥔",
  "Temulawak": "🥔",
  "Serai": "🌾",
  "Petai": "🫛",
  "Jengkol": "🌰",
  "Ubi Ungu": "🍠",
  "Ubi Cilembu": "🍠",
  "Talas": "🥔",
  "Garut": "🥔",
  "Gembili": "🥔",
  "Ganyong": "🥔",
  "Kentang Hitam": "🥔",
  "Kacang Merah": "🫘",
  "Kacang Hijau": "🫘",
  "Kacang Polong": "🫛",
  "Kedelai": "🫘",
  "Jamur Tiram": "🍄",
  "Jamur Kuping": "🍄",
  "Rebung": "🎋",
  "Jagung Manis": "🌽",
  "Jagung Muda": "🌽",
  "Kecipir": "🫛",
  "Kapri": "🫛",
  "Okra": "🫛",
  "Genjer": "🥬",
  "Kecombrang": "🌺",
  "Kenikir": "🌿",
  "Pucuk Labu": "🍃",
  "Daun Melinjo": "🍃",
  "Melinjo": "🌰",
  "Kluwih": "🍈",
  "Nangka Muda": "🍈",
  "Pepaya Muda": "🍈",
  "Bunga Pepaya": "🌼",
  "Bunga Turi": "🌸",
  "Timun Suri": "🍈",
  "Waluh": "🎃",
  "Leunca": "🫐",
  "Rimbang": "🫐",
  "Terong Ungu": "Terong",
  "Terong Belanda": "🍅",
  "Paprika Merah": "🫑",
  "Paprika Kuning": "🫑",
  "Bawang Bombai": "🧅",
  "Bayam Merah": "Bayam",
  "Kucai": "🌱",
  "Daun Kari": "🍃",

  // --- TUMBUHAN, POHON & BUNGA ---
  "Pohon Jambu": "🌳",
  "Pohon Rambutan": "🌳",
  "Pohon Kelapa": "🌴",
  "Bougenville": "🌺",
  "Kenanga": "🌼",
  "Cempaka": "🌼",
  "Kemuning": "🌼",
  "Alamanda": "🌻",
  "Soka": "🌺",
  "Kana": "🌺",
  "Dahlia": "🌸",
  "Krisan": "🌼",
  "Aster": "🌸",
  "Sedap Malam": "🪷",
  "Lili": "🪷",
  "Gladiol": "🌸",
  "Teratai Biru": "🪷",
  "Eceng Gondok": "🪷",
  "Jati": "🌳",
  "Mahoni": "🌳",
  "Beringin": "🌳",
  "Asam": "🌳",
  "Trembesi": "🌳",
  "Flamboyan": "🌺",
  "Angsana": "🌳",
  "Pinus": "🌲",
  "Cemara Udang": "🌲",
  "Bakau": "🌴",
  "Mangrove": "🌴",
  "Nipah": "🌴",
  "Sagu": "🌴",
  "Aren": "🌴",
  "Kelapa Sawit": "🌴",
  "Karet": "🌳",
  "Kopi": "☕",
  "Teh": "🍵",
  "Kakao": "🍫",
  "Cengkih": "🌱",
  "Pala": "🌰",
  "Lada": "🫐",
  "Kayu Manis": "🪵",
  "Vanili": "🌱",
  "Tebu": "🎋",
  "Tembakau": "🍃",
  "Kapas": "☁️",
  "Sorgum": "🌾",
  "Pandan": "🍃",
  "Sirih": "🍃",
  "Serai Wangi": "🌾",
  "Kumis Kucing": "🌿",
  "Sambiloto": "🌿",
  "Meniran": "🌿",
  "Putri Malu": "🌸",
  "Lidah Mertua": "🪴",
  "Pakis": "🌿",
  "Suplir": "🌿",
  "Lumut": "🟩",
  "Paku Tiang": "🌴",
  "Palem": "🌴",
  "Rotan": "🎋",
  "Bambu Kuning": "🎋",
  "Bambu Petung": "🎋",
  "Rumput Gajah": "🌾",
  "Alang-alang": "🌾",
  "Rumput Teki": "🌾",
  "Kiambang": "🪷",
  "Anyelir": "🌸",
  "Sri Rejeki": "🪴",
  "Bunga Kertas": "🌺",
  "Kembang Telang": "🫐",
  "Bunga Telekan": "🌼",

  // --- KENDARAAN ---
  "Andong": "Delman",
  "Dokar": "Delman",
  "Bendi": "Delman",
  "Sado": "Delman",
  "Gerobak": "🪵",
  "Sepeda Ontel": "🚲",
  "Bemo": "Bajaj",
  "Kereta Kelinci": "🚂",
  "Sepeda Listrik": "🚲",
  "Motor Listrik": "🛵",
  "Mobil Listrik": "🚗",
  "Kapal Phinisi": "⛵",
  "Perahu Jukung": "🛶",
  "Perahu Bidar": "🛶",
  "Getek": "🪵",
  "Rakit": "🪵",
  "Tongkang": "🚢",
  "Kapal Selam": "🛳️",
  "Kapal Perang": "🚢",
  "Kapal Pesiar": "🚢",
  "Kapal Tanker": "🚢",
  "Pesawat Tempur": "✈️",
  "Pesawat Kargo": "✈️",
  "Balon Udara": "🎈",
  "KRL Commuter": "🚆",
  "TransJakarta": "🚌",
  "Bus Sekolah": "🚌",
  "Bus Tingkat": "🚍",
  "Truk Sampah": "🚛",
  "Truk Molen": "🚚",
  "Truk Tangki": "🚛",
  "Truk Kontainer": "🚛",
  "Mobil Boks": "🚐",
  "Buldoser": "🚜",
  "Ekskavator": "🚜",
  "Derek": "🏗️",
  "Crane": "🏗️",
  "Pedati": "🐂",
  "Cikar": "🐂",
  "Helikopter SAR": "🚁",
  "Kereta Bandara": "🚆",
  "Mobil Derek": "🛻",
};

// Helper to test if a string is a valid emoji (and not plain alphabetic word text like "Durian" or "Bayam")
export const isActualEmoji = (str?: string): boolean => {
  if (!str) return false;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed === '~' || trimmed.includes('~')) return false;
  // If it has Latin letters A-Z, it's a word, NOT an emoji!
  if (/[a-zA-Z]/.test(trimmed)) return false;
  return true;
};

export const ItemIcon: React.FC<ItemIconProps> = ({
  name,
  emoji,
  category,
  className = '',
  size,
}) => {
  // Strip parentheses and labels like "(Lingkaran)", "(Persegi)", etc.
  const cleanName = name ? name.replace(/\s*\([^)]*\)/g, '').trim() : '';

  // 1. Try to find custom SVG illustration:
  // a) Direct match on full name
  // b) Match on cleanName (e.g. "Donat" from "Donat (Lingkaran)")
  // c) Match on emoji if emoji holds an SVG key
  // d) Match via variety fallback mapping
  let customSvg = CUSTOM_ITEM_SVGS[name] || CUSTOM_ITEM_SVGS[cleanName];

  if (!customSvg && emoji && CUSTOM_ITEM_SVGS[emoji]) {
    customSvg = CUSTOM_ITEM_SVGS[emoji];
  }

  const varietyTarget = VARIETY_FALLBACKS[name] || VARIETY_FALLBACKS[cleanName];
  if (!customSvg && varietyTarget && CUSTOM_ITEM_SVGS[varietyTarget]) {
    customSvg = CUSTOM_ITEM_SVGS[varietyTarget];
  }

  if (customSvg) {
    const style: React.CSSProperties = size
      ? { width: size, height: size, display: 'inline-block' }
      : { width: '1em', height: '1em', display: 'inline-block' };

    return (
      <span
        className={`inline-flex items-center justify-center align-middle shrink-0 ${className}`}
        style={style}
        role="img"
        aria-label={name}
        dangerouslySetInnerHTML={{ __html: customSvg }}
      />
    );
  }

  // 2. Check if direct emoji is a VALID emoji symbol (never Latin text!)
  if (isActualEmoji(emoji)) {
    return (
      <span
        className={`inline-block select-none leading-none align-middle ${className}`}
        style={size ? { fontSize: size } : undefined}
        role="img"
        aria-label={name}
      >
        {emoji}
      </span>
    );
  }

  // 3. Known variety fallback emoji
  if (varietyTarget && isActualEmoji(varietyTarget)) {
    return (
      <span
        className={`inline-block select-none leading-none align-middle ${className}`}
        style={size ? { fontSize: size } : undefined}
        role="img"
        aria-label={name}
      >
        {varietyTarget}
      </span>
    );
  }

  // 4. Default category visual icon (NEVER a plain text name or boring book)
  let defaultEmoji = '🌱';
  if (category === 'animals') defaultEmoji = '🐾';
  else if (category === 'fruits' || category === 'fruitveg') defaultEmoji = '🍎';
  else if (category === 'veggies') defaultEmoji = '🥕';
  else if (category === 'plants') defaultEmoji = '🌻';
  else if (category === 'vehicles') defaultEmoji = '🚗';
  else if (category === 'colors') defaultEmoji = '🎨';
  else if (category === 'shapes') defaultEmoji = '⭐';

  return (
    <span
      className={`inline-block select-none leading-none align-middle ${className}`}
      style={size ? { fontSize: size } : undefined}
      role="img"
      aria-label={name}
    >
      {defaultEmoji}
    </span>
  );
};


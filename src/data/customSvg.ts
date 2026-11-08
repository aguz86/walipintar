/**
 * Custom SVG illustrations for items that lack standard emojis
 * or previously showed as fallback book cards ("📖").
 * Each SVG is designed with clean, colorful, child-friendly vector artwork.
 */
export const CUSTOM_ITEM_SVGS: Record<string, string> = {
  // --- BUAH TROPIS INDONESIA ---
  "Durian": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Durian body -->
    <ellipse cx="36" cy="40" rx="24" ry="26" fill="#8cb026" stroke="#4a6b10" stroke-width="2"/>
    <!-- Thorns/duri -->
    <path d="M 36 12 L 32 17 L 40 17 Z M 22 17 L 18 23 L 26 23 Z M 50 17 L 46 23 L 54 23 Z
             M 12 28 L 7 34 L 16 36 Z M 60 28 L 56 36 L 65 34 Z
             M 10 44 L 6 50 L 15 52 Z M 62 44 L 57 52 L 66 50 Z
             M 18 58 L 15 65 L 24 64 Z M 54 58 L 48 64 L 57 65 Z
             M 36 67 L 33 71 L 39 71 Z" fill="#6d8a1d"/>
    <!-- Segment line & creamy flesh peek -->
    <path d="M 36 18 Q 30 40 36 64" stroke="#4a6b10" stroke-width="2.5" stroke-dasharray="3 3"/>
    <ellipse cx="32" cy="38" rx="8" ry="12" fill="#ffd147" stroke="#e0a316" stroke-width="1.5"/>
    <ellipse cx="40" cy="42" rx="7" ry="11" fill="#ffe066" stroke="#e0a316" stroke-width="1.5"/>
    <!-- Stem/tangkai -->
    <path d="M 36 14 C 36 8 40 4 43 3" stroke="#5c3b1e" stroke-width="4.5" stroke-linecap="round"/>
  </svg>`,

  "Rambutan": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Hairs/rambut -->
    <g stroke="#3ba538" stroke-width="2.5" stroke-linecap="round">
      <path d="M 36 16 C 36 8 30 6 26 4"/>
      <path d="M 46 19 C 52 14 56 12 60 8"/>
      <path d="M 24 22 C 17 18 12 16 7 12"/>
      <path d="M 18 36 C 10 36 6 32 2 30"/>
      <path d="M 54 36 C 62 36 66 32 70 30"/>
      <path d="M 22 50 C 15 54 10 58 5 62"/>
      <path d="M 50 50 C 58 54 62 58 67 62"/>
      <path d="M 36 56 C 36 64 42 66 46 68"/>
    </g>
    <!-- Red body -->
    <circle cx="36" cy="36" r="22" fill="#e52d27" stroke="#b31217" stroke-width="2"/>
    <!-- Surface texture dots -->
    <circle cx="30" cy="30" r="3" fill="#ff6b6b"/>
    <circle cx="44" cy="32" r="3" fill="#ff6b6b"/>
    <circle cx="34" cy="44" r="3.5" fill="#ff6b6b"/>
    <!-- Yellow/green hair tips on body -->
    <path d="M 30 20 Q 28 26 34 26" stroke="#f6d365" stroke-width="2" stroke-linecap="round"/>
    <path d="M 42 22 Q 46 28 40 30" stroke="#f6d365" stroke-width="2" stroke-linecap="round"/>
    <path d="M 26 38 Q 24 44 30 46" stroke="#f6d365" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  "Pepaya": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Papaya outer peel -->
    <ellipse cx="36" cy="38" rx="22" ry="28" fill="#e67e22" stroke="#27ae60" stroke-width="3"/>
    <!-- Inside orange cavity -->
    <ellipse cx="36" cy="40" rx="14" ry="20" fill="#f39c12"/>
    <ellipse cx="36" cy="40" rx="9" ry="14" fill="#e67e22"/>
    <!-- Black seeds -->
    <g fill="#2c3e50">
      <circle cx="36" cy="33" r="2.2"/>
      <circle cx="33" cy="37" r="2.2"/>
      <circle cx="39" cy="37" r="2.2"/>
      <circle cx="36" cy="41" r="2.2"/>
      <circle cx="33" cy="45" r="2.2"/>
      <circle cx="39" cy="45" r="2.2"/>
      <circle cx="36" cy="49" r="2.2"/>
    </g>
    <!-- Stem -->
    <path d="M 36 10 L 36 4" stroke="#27ae60" stroke-width="4" stroke-linecap="round"/>
  </svg>`,

  "Salak": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Teardrop shape -->
    <path d="M 36 10 C 22 24 16 38 18 48 C 20 60 30 66 36 66 C 42 66 52 60 54 48 C 56 38 50 24 36 10 Z"
          fill="#5a3825" stroke="#3a2012" stroke-width="2"/>
    <!-- Snake scales pattern -->
    <g stroke="#7b4e31" stroke-width="1.5">
      <path d="M 24 30 Q 36 34 48 30"/>
      <path d="M 20 40 Q 36 45 52 40"/>
      <path d="M 20 50 Q 36 55 52 50"/>
      <path d="M 26 58 Q 36 62 46 58"/>
    </g>
    <!-- Tip stem -->
    <circle cx="36" cy="10" r="3" fill="#3a2012"/>
  </svg>`,

  "Manggis": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Purple round body -->
    <circle cx="36" cy="40" r="24" fill="#4a154b" stroke="#2b0d2c" stroke-width="2"/>
    <!-- Sheen -->
    <path d="M 22 30 C 22 24 30 20 36 20" stroke="#8e44ad" stroke-width="3" stroke-linecap="round"/>
    <!-- Green thick calyx/kelopak (4 leaves) -->
    <ellipse cx="26" cy="20" rx="9" ry="6" transform="rotate(-20 26 20)" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/>
    <ellipse cx="46" cy="20" rx="9" ry="6" transform="rotate(20 46 20)" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/>
    <ellipse cx="36" cy="23" rx="10" ry="6" fill="#66bb6a" stroke="#2e7d32" stroke-width="1.5"/>
    <!-- Thick stem -->
    <path d="M 36 20 C 36 12 33 8 31 5" stroke="#558b2f" stroke-width="4.5" stroke-linecap="round"/>
  </svg>`,

  "Belimbing": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Starfruit 5-pointed star slice -->
    <path d="M 36 8 L 41 24 L 57 20 L 47 33 L 61 44 L 45 46 L 43 62 L 34 50 L 23 58 L 27 43 L 13 36 L 27 28 Z"
          fill="#ffd54f" stroke="#f57f17" stroke-width="2" stroke-linejoin="round"/>
    <!-- Inner star facet lines -->
    <circle cx="36" cy="36" r="6" fill="#fff9c4" stroke="#fbc02d" stroke-width="1.5"/>
    <circle cx="36" cy="36" r="2.5" fill="#f57f17"/>
    <!-- Edge ridges -->
    <path d="M 36 8 L 36 30 M 57 20 L 40 33 M 61 44 L 41 38 M 43 62 L 37 42 M 23 58 L 33 41 M 13 36 L 31 34"
          stroke="#fbc02d" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  "Buah Naga": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Pink oval body -->
    <ellipse cx="36" cy="38" rx="20" ry="25" fill="#d81b60" stroke="#880e4f" stroke-width="2"/>
    <!-- Green tipped wavy scales -->
    <path d="M 36 10 C 33 16 39 18 36 24" stroke="#43a047" stroke-width="3" stroke-linecap="round"/>
    <path d="M 20 25 C 14 30 18 36 24 36" stroke="#43a047" stroke-width="3" stroke-linecap="round"/>
    <path d="M 52 25 C 58 30 54 36 48 36" stroke="#43a047" stroke-width="3" stroke-linecap="round"/>
    <path d="M 18 45 C 12 50 18 55 24 53" stroke="#43a047" stroke-width="3" stroke-linecap="round"/>
    <path d="M 54 45 C 60 50 54 55 48 53" stroke="#43a047" stroke-width="3" stroke-linecap="round"/>
    <path d="M 36 60 C 33 64 39 67 36 70" stroke="#43a047" stroke-width="3" stroke-linecap="round"/>
    <!-- Central peek of white flesh with black seeds -->
    <circle cx="36" cy="38" r="8" fill="#ffffff" stroke="#c2185b" stroke-width="1.5"/>
    <circle cx="34" cy="36" r="1" fill="#000"/>
    <circle cx="38" cy="37" r="1" fill="#000"/>
    <circle cx="35" cy="40" r="1" fill="#000"/>
    <circle cx="37" cy="41" r="1" fill="#000"/>
  </svg>`,

  "Nangka": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Jackfruit large oval with bumpy skin -->
    <ellipse cx="36" cy="40" rx="22" ry="28" fill="#8d9440" stroke="#556b2f" stroke-width="2"/>
    <!-- Texture dots for tiny spines -->
    <g fill="#556b2f">
      <circle cx="28" cy="24" r="1.5"/><circle cx="36" cy="22" r="1.5"/><circle cx="44" cy="24" r="1.5"/>
      <circle cx="22" cy="32" r="1.5"/><circle cx="32" cy="32" r="1.5"/><circle cx="42" cy="32" r="1.5"/><circle cx="50" cy="32" r="1.5"/>
      <circle cx="26" cy="42" r="1.5"/><circle cx="36" cy="42" r="1.5"/><circle cx="46" cy="42" r="1.5"/>
      <circle cx="24" cy="52" r="1.5"/><circle cx="34" cy="52" r="1.5"/><circle cx="44" cy="52" r="1.5"/>
      <circle cx="32" cy="62" r="1.5"/><circle cx="40" cy="62" r="1.5"/>
    </g>
    <!-- Slice showing golden bulb -->
    <ellipse cx="36" cy="40" rx="9" ry="12" fill="#ffb300" stroke="#ff8f00" stroke-width="1.5"/>
    <ellipse cx="36" cy="40" rx="4" ry="6" fill="#8d6e63"/>
    <!-- Stem -->
    <path d="M 36 12 L 36 4" stroke="#4e342e" stroke-width="4" stroke-linecap="round"/>
  </svg>`,

  "Jambu Biji": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Guava round shape -->
    <circle cx="36" cy="40" r="24" fill="#8bc34a" stroke="#558b2f" stroke-width="2"/>
    <!-- Pink inside slice -->
    <circle cx="36" cy="40" r="14" fill="#f48fb1" stroke="#ec407a" stroke-width="1.5"/>
    <!-- Small seeds -->
    <circle cx="33" cy="37" r="1.2" fill="#fff9c4"/>
    <circle cx="39" cy="37" r="1.2" fill="#fff9c4"/>
    <circle cx="34" cy="43" r="1.2" fill="#fff9c4"/>
    <circle cx="38" cy="43" r="1.2" fill="#fff9c4"/>
    <!-- Stem & leaf -->
    <path d="M 36 16 L 36 8" stroke="#5d4037" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="44" cy="12" rx="7" ry="4" transform="rotate(-15 44 12)" fill="#4caf50"/>
  </svg>`,

  "Jambu Air": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Bell shape -->
    <path d="M 36 14 C 30 18 20 28 18 44 C 16 56 26 64 36 64 C 46 64 56 56 54 44 C 52 28 42 18 36 14 Z"
          fill="#e53935" stroke="#b71c1c" stroke-width="2"/>
    <!-- Bottom indentation -->
    <path d="M 30 64 Q 36 58 42 64" stroke="#b71c1c" stroke-width="2"/>
    <!-- Glossy highlight -->
    <path d="M 26 30 C 24 38 24 46 26 52" stroke="#ff8a80" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Stem -->
    <path d="M 36 14 L 36 6" stroke="#4e342e" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  // --- SAYUR MAYUR INDONESIA ---
  "Bayam": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Bunch of spinach leaves -->
    <g fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5">
      <path d="M 36 42 C 20 32 16 16 36 8 C 56 16 52 32 36 42 Z"/>
      <path d="M 26 48 C 10 40 8 26 22 22 C 32 26 34 38 26 48 Z" fill="#388e3c"/>
      <path d="M 46 48 C 62 40 64 26 50 22 C 40 26 38 38 46 48 Z" fill="#388e3c"/>
    </g>
    <!-- Leaf veins -->
    <path d="M 36 38 L 36 14 M 36 26 L 28 20 M 36 24 L 44 18" stroke="#81c784" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Stems bundle -->
    <path d="M 36 40 L 36 66 M 33 42 L 31 66 M 39 42 L 41 66" stroke="#43a047" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Red ribbon tie -->
    <rect x="29" y="52" width="14" height="4" rx="2" fill="#e53935"/>
  </svg>`,

  "Kangkung": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Water spinach slender spear-shaped leaves -->
    <g fill="#43a047" stroke="#2e7d32" stroke-width="1.5">
      <path d="M 36 38 C 28 26 26 12 36 4 C 46 12 44 26 36 38 Z"/>
      <path d="M 28 42 C 16 32 12 20 22 14 C 28 20 30 32 28 42 Z"/>
      <path d="M 44 42 C 56 32 60 20 50 14 C 44 20 42 32 44 42 Z"/>
    </g>
    <!-- Hollow stems -->
    <path d="M 36 36 L 36 68 M 32 40 L 29 68 M 40 40 L 43 68" stroke="#66bb6a" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="36" cy="67" rx="6" ry="2" fill="#81c784"/>
  </svg>`,

  "Kol": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Round cabbage head with overlapping leaves -->
    <circle cx="36" cy="38" r="26" fill="#a5d6a7" stroke="#2e7d32" stroke-width="2"/>
    <path d="M 14 30 C 22 20 40 18 52 26 C 60 32 58 46 50 56" stroke="#388e3c" stroke-width="2.5" fill="none"/>
    <path d="M 20 48 C 30 58 48 56 56 42" stroke="#388e3c" stroke-width="2.5" fill="none"/>
    <path d="M 24 24 Q 36 36 44 32" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <path d="M 30 42 Q 38 46 46 40" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  "Terong": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Purple curved eggplant -->
    <path d="M 36 20 C 44 24 54 36 52 50 C 50 62 38 66 30 64 C 20 62 16 48 20 36 C 24 26 30 20 36 20 Z"
          fill="#4a148c" stroke="#311b92" stroke-width="2"/>
    <!-- Shine highlight -->
    <path d="M 44 34 C 48 40 48 48 46 54" stroke="#ba68c8" stroke-width="3" stroke-linecap="round"/>
    <!-- Green calyx cap -->
    <path d="M 28 20 L 32 26 L 36 18 L 40 26 L 44 20 L 40 14 L 32 14 Z" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/>
    <path d="M 36 14 C 36 8 38 4 41 3" stroke="#2e7d32" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`,

  "Buncis": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Pod 1 -->
    <path d="M 24 10 C 22 26 26 44 32 62" stroke="#43a047" stroke-width="6" stroke-linecap="round"/>
    <!-- Pod 2 -->
    <path d="M 38 12 C 34 30 36 48 44 64" stroke="#4caf50" stroke-width="6" stroke-linecap="round"/>
    <!-- Pod 3 -->
    <path d="M 48 16 C 46 32 48 46 52 58" stroke="#2e7d32" stroke-width="5" stroke-linecap="round"/>
    <!-- Bumps -->
    <circle cx="25" cy="28" r="2" fill="#81c784"/>
    <circle cx="36" cy="34" r="2" fill="#a5d6a7"/>
  </svg>`,

  "Singkong": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Brown root tuber -->
    <path d="M 14 50 C 20 36 34 26 56 16 C 60 22 56 30 48 40 C 38 52 24 60 14 50 Z"
          fill="#5d4037" stroke="#3e2723" stroke-width="2"/>
    <!-- Cut slice showing white flesh inside -->
    <ellipse cx="22" cy="46" rx="9" ry="12" transform="rotate(-35 22 46)" fill="#fffde7" stroke="#8d6e63" stroke-width="2"/>
    <circle cx="22" cy="46" r="2" fill="#5d4037"/>
    <!-- Root hairs -->
    <path d="M 52 18 L 62 14 M 40 46 L 46 54" stroke="#8d6e63" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  "Tauge": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Sprout 1 -->
    <path d="M 28 62 C 26 48 30 36 32 24" stroke="#f1f8e9" stroke-width="4" stroke-linecap="round"/>
    <circle cx="32" cy="20" r="5" fill="#cddc39" stroke="#827717" stroke-width="1.5"/>
    <!-- Sprout 2 -->
    <path d="M 44 64 C 42 50 38 34 42 20" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="43" cy="16" r="5.5" fill="#d4e157" stroke="#827717" stroke-width="1.5"/>
    <!-- Root tails -->
    <path d="M 28 62 L 26 68 M 44 64 L 46 70" stroke="#aed581" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  // --- BUNGA & TUMBUHAN KHAS INDONESIA ---
  "Melati": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Pure white jasmine petals -->
    <g fill="#ffffff" stroke="#c8e6c9" stroke-width="1.5">
      <ellipse cx="36" cy="20" rx="7" ry="14"/>
      <ellipse cx="50" cy="30" rx="7" ry="14" transform="rotate(72 50 30)"/>
      <ellipse cx="44" cy="50" rx="7" ry="14" transform="rotate(144 44 50)"/>
      <ellipse cx="28" cy="50" rx="7" ry="14" transform="rotate(216 28 50)"/>
      <ellipse cx="22" cy="30" rx="7" ry="14" transform="rotate(288 22 30)"/>
    </g>
    <!-- Yellow fragrant center -->
    <circle cx="36" cy="36" r="6" fill="#fdd835" stroke="#f57f17" stroke-width="1.5"/>
    <circle cx="36" cy="36" r="2" fill="#fff59d"/>
    <!-- Green sepals/stem -->
    <path d="M 36 50 C 36 58 40 66 42 70" stroke="#388e3c" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="46" cy="60" rx="7" ry="3" transform="rotate(25 46 60)" fill="#4caf50"/>
  </svg>`,

  "Anggrek": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Indonesian Moon Orchid / Anggrek Bulan -->
    <!-- 3 outer sepals -->
    <ellipse cx="36" cy="18" rx="8" ry="14" fill="#f3e5f5" stroke="#ab47bc" stroke-width="1.5"/>
    <ellipse cx="20" cy="46" rx="8" ry="14" transform="rotate(35 20 46)" fill="#f3e5f5" stroke="#ab47bc" stroke-width="1.5"/>
    <ellipse cx="52" cy="46" rx="8" ry="14" transform="rotate(-35 52 46)" fill="#f3e5f5" stroke="#ab47bc" stroke-width="1.5"/>
    <!-- 2 broad lateral petals -->
    <ellipse cx="22" cy="28" rx="13" ry="11" fill="#e1bee7" stroke="#8e24aa" stroke-width="1.5"/>
    <ellipse cx="50" cy="28" rx="13" ry="11" fill="#e1bee7" stroke="#8e24aa" stroke-width="1.5"/>
    <!-- Lip / labellum -->
    <path d="M 36 34 C 30 40 30 48 36 52 C 42 48 42 40 36 34 Z" fill="#ffeb3b" stroke="#f57f17" stroke-width="1.5"/>
    <circle cx="36" cy="42" r="3" fill="#e91e63"/>
  </svg>`,

  "Kamboja": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Balinese Frangipani / Kamboja 5 spiral petals -->
    <g stroke="#fbc02d" stroke-width="1">
      <path d="M 36 36 C 36 20 46 12 50 16 C 54 22 46 32 36 36 Z" fill="#ffffff"/>
      <path d="M 36 36 C 50 32 60 40 58 46 C 54 52 42 46 36 36 Z" fill="#ffffff"/>
      <path d="M 36 36 C 42 50 36 62 30 60 C 24 58 28 46 36 36 Z" fill="#ffffff"/>
      <path d="M 36 36 C 22 42 12 34 14 28 C 18 22 28 28 36 36 Z" fill="#ffffff"/>
      <path d="M 36 36 C 28 22 34 12 40 14 C 44 18 40 28 36 36 Z" fill="#ffffff"/>
    </g>
    <!-- Radiant gold-yellow center -->
    <circle cx="36" cy="36" r="9" fill="#ffeb3b"/>
    <circle cx="36" cy="36" r="4" fill="#ff9800"/>
  </svg>`,

  "Rafflesia": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Giant Rafflesia arnoldii 5 thick spotted red petals -->
    <g fill="#c62828" stroke="#8e0000" stroke-width="2">
      <ellipse cx="36" cy="18" rx="12" ry="10"/>
      <ellipse cx="54" cy="30" rx="12" ry="10" transform="rotate(36 54 30)"/>
      <ellipse cx="48" cy="52" rx="12" ry="10" transform="rotate(72 48 52)"/>
      <ellipse cx="24" cy="52" rx="12" ry="10" transform="rotate(-72 24 52)"/>
      <ellipse cx="18" cy="30" rx="12" ry="10" transform="rotate(-36 18 30)"/>
    </g>
    <!-- White wart spots on petals -->
    <g fill="#ffebee">
      <circle cx="36" cy="16" r="2.5"/><circle cx="32" cy="20" r="2"/><circle cx="40" cy="20" r="2"/>
      <circle cx="54" cy="28" r="2.5"/><circle cx="48" cy="52" r="2.5"/>
      <circle cx="24" cy="52" r="2.5"/><circle cx="18" cy="28" r="2.5"/>
    </g>
    <!-- Central crater bowl -->
    <circle cx="36" cy="36" r="14" fill="#b71c1c" stroke="#4a0000" stroke-width="2"/>
    <circle cx="36" cy="36" r="8" fill="#4a0000"/>
    <circle cx="36" cy="36" r="3" fill="#ff8f00"/>
  </svg>`,

  "Bunga Bangkai": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Titan Arum / Amorphophallus titanum -->
    <!-- Ruffled maroon spathe -->
    <path d="M 36 24 C 20 28 14 44 20 58 C 28 66 44 66 52 58 C 58 44 52 28 36 24 Z"
          fill="#4a148c" stroke="#311b92" stroke-width="2"/>
    <!-- Tall yellow-green central spadix -->
    <path d="M 36 6 C 33 16 33 36 34 46 L 38 46 C 39 36 39 16 36 6 Z"
          fill="#c0ca33" stroke="#827717" stroke-width="1.5"/>
    <!-- Ruffled edge folds -->
    <path d="M 22 36 Q 28 32 34 38 M 38 38 Q 44 32 50 36" stroke="#7b1fa2" stroke-width="2"/>
  </svg>`,

  "Edelweis": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Mountain Edelweiss white woolly star -->
    <g fill="#f5f5f5" stroke="#bdbdbd" stroke-width="1.2">
      <ellipse cx="36" cy="18" rx="6" ry="12"/>
      <ellipse cx="48" cy="24" rx="6" ry="12" transform="rotate(45 48 24)"/>
      <ellipse cx="54" cy="36" rx="6" ry="12" transform="rotate(90 54 36)"/>
      <ellipse cx="48" cy="48" rx="6" ry="12" transform="rotate(135 48 48)"/>
      <ellipse cx="36" cy="54" rx="6" ry="12" transform="rotate(180 36 54)"/>
      <ellipse cx="24" cy="48" rx="6" ry="12" transform="rotate(225 24 48)"/>
      <ellipse cx="18" cy="36" rx="6" ry="12" transform="rotate(270 18 36)"/>
      <ellipse cx="24" cy="24" rx="6" ry="12" transform="rotate(315 24 24)"/>
    </g>
    <!-- Yellow woolly florets center -->
    <circle cx="36" cy="36" r="7" fill="#fbc02d" stroke="#f57f17" stroke-width="1"/>
    <circle cx="34" cy="34" r="1.5" fill="#fff59d"/>
    <circle cx="38" cy="35" r="1.5" fill="#fff59d"/>
    <circle cx="35" cy="38" r="1.5" fill="#fff59d"/>
  </svg>`,

  "Pohon Mangga": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Trunk -->
    <path d="M 33 44 L 32 68 L 40 68 L 39 44 Z" fill="#5d4037" stroke="#3e2723" stroke-width="2"/>
    <!-- Foliage canopy -->
    <circle cx="36" cy="30" r="20" fill="#2e7d32"/>
    <circle cx="26" cy="34" r="14" fill="#388e3c"/>
    <circle cx="46" cy="34" r="14" fill="#388e3c"/>
    <circle cx="36" cy="20" r="15" fill="#43a047"/>
    <!-- Hanging ripe mangoes -->
    <circle cx="28" cy="32" r="3.5" fill="#ffb300" stroke="#f57f17" stroke-width="1"/>
    <circle cx="42" cy="30" r="3.5" fill="#ffb300" stroke="#f57f17" stroke-width="1"/>
    <circle cx="35" cy="40" r="3.5" fill="#ffb300" stroke="#f57f17" stroke-width="1"/>
  </svg>`,

  "Pohon Pisang": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Trunk / batang pelepah -->
    <path d="M 34 32 L 32 68 L 40 68 L 38 32 Z" fill="#7cb342" stroke="#558b2f" stroke-width="2"/>
    <!-- Arching broad banana leaves -->
    <path d="M 36 32 C 24 24 10 26 4 36 C 12 36 24 38 36 34" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/>
    <path d="M 36 32 C 48 24 62 26 68 36 C 60 36 48 38 36 34" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/>
    <path d="M 36 30 C 30 16 20 8 10 12 C 18 18 28 26 36 30" fill="#66bb6a" stroke="#2e7d32" stroke-width="1.5"/>
    <path d="M 36 30 C 42 16 52 8 62 12 C 54 18 44 26 36 30" fill="#66bb6a" stroke="#2e7d32" stroke-width="1.5"/>
    <!-- Banana bunch hanging -->
    <circle cx="38" cy="42" r="2.5" fill="#fdd835"/>
    <circle cx="35" cy="44" r="2.5" fill="#fdd835"/>
    <circle cx="39" cy="46" r="2.5" fill="#fdd835"/>
    <!-- Jantung pisang (purple bud) -->
    <path d="M 38 48 C 36 54 40 56 38 60 C 36 56 40 54 38 48 Z" fill="#880e4f"/>
  </svg>`,

  "Lidah Buaya": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Terracotta pot -->
    <path d="M 26 52 L 28 68 L 44 68 L 46 52 Z" fill="#d84315" stroke="#bf360c" stroke-width="2"/>
    <!-- Fleshy pointed succulent aloe leaves -->
    <path d="M 36 52 C 34 38 32 20 36 10 C 40 20 38 38 36 52 Z" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/>
    <path d="M 34 52 C 26 42 16 32 12 26 C 22 34 30 44 34 52 Z" fill="#388e3c" stroke="#1b5e20" stroke-width="1.5"/>
    <path d="M 38 52 C 46 42 56 32 60 26 C 50 34 42 44 38 52 Z" fill="#388e3c" stroke="#1b5e20" stroke-width="1.5"/>
    <!-- White edge thorns -->
    <circle cx="33" cy="22" r="1" fill="#fff"/>
    <circle cx="39" cy="24" r="1" fill="#fff"/>
    <circle cx="24" cy="36" r="1" fill="#fff"/>
    <circle cx="48" cy="36" r="1" fill="#fff"/>
  </svg>`,

  // --- KENDARAAN INDONESIA ---
  "Becak": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Rear cyclist wheel -->
    <circle cx="18" cy="54" r="12" fill="#e0e0e0" stroke="#37474f" stroke-width="3"/>
    <circle cx="18" cy="54" r="3" fill="#37474f"/>
    <!-- Front passenger twin wheels -->
    <circle cx="56" cy="54" r="12" fill="#e0e0e0" stroke="#37474f" stroke-width="3"/>
    <circle cx="56" cy="54" r="3" fill="#37474f"/>
    <!-- Bicycle rear frame, saddle, pedal -->
    <path d="M 18 54 L 26 38 L 34 54 M 26 38 L 22 36" stroke="#d32f2f" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="21" cy="35" rx="4" ry="2" fill="#212121"/>
    <!-- Connecting beam to front cart -->
    <path d="M 26 38 L 44 48 L 56 54" stroke="#d32f2f" stroke-width="3"/>
    <!-- Passenger hood / canopy -->
    <path d="M 36 48 L 38 28 C 42 22 56 22 62 30 L 64 48 Z" fill="#1976d2" stroke="#0d47a1" stroke-width="2"/>
    <!-- Passenger seat -->
    <rect x="42" y="38" width="16" height="10" rx="3" fill="#ffb300"/>
    <!-- Front mudguard -->
    <path d="M 48 44 Q 56 38 64 44" stroke="#d32f2f" stroke-width="3" fill="none"/>
  </svg>`,

  "Delman": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Large wooden spoke wheel -->
    <circle cx="48" cy="52" r="14" fill="#fff3e0" stroke="#5d4037" stroke-width="3"/>
    <line x1="48" y1="38" x2="48" y2="66" stroke="#5d4037" stroke-width="2"/>
    <line x1="34" y1="52" x2="62" y2="52" stroke="#5d4037" stroke-width="2"/>
    <!-- Carriage body -->
    <rect x="36" y="32" width="26" height="18" rx="4" fill="#b71c1c" stroke="#7f0000" stroke-width="2"/>
    <!-- Canopy roof -->
    <path d="M 32 30 C 40 22 58 22 66 30" stroke="#fbc02d" stroke-width="4" stroke-linecap="round"/>
    <!-- Shaft to horse -->
    <path d="M 36 46 L 16 42" stroke="#5d4037" stroke-width="3"/>
    <!-- Horse silhouette in front -->
    <ellipse cx="14" cy="40" rx="8" ry="10" fill="#795548"/>
    <circle cx="12" cy="28" r="6" fill="#795548"/>
  </svg>`,

  "Bajaj": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Orange iconic 3-wheeler body -->
    <path d="M 16 54 L 16 34 C 16 26 24 20 36 20 L 52 20 C 58 20 62 26 62 34 L 62 54 Z"
          fill="#ff6f00" stroke="#e65100" stroke-width="2"/>
    <!-- Black canvas roof -->
    <path d="M 14 34 C 14 22 24 16 38 16 L 54 16 C 62 16 64 22 64 34 Z" fill="#212121"/>
    <!-- Windshield -->
    <rect x="44" y="24" width="14" height="12" rx="2" fill="#e0f7fa" stroke="#00838f" stroke-width="1.5"/>
    <!-- Side passenger door cutout -->
    <path d="M 22 34 L 38 34 L 38 52 L 22 52 Z" fill="#212121" opacity="0.6"/>
    <!-- Front wheel -->
    <circle cx="54" cy="56" r="8" fill="#424242" stroke="#212121" stroke-width="2"/>
    <circle cx="54" cy="56" r="3" fill="#e0e0e0"/>
    <!-- Rear wheel -->
    <circle cx="22" cy="56" r="8" fill="#424242" stroke="#212121" stroke-width="2"/>
    <circle cx="22" cy="56" r="3" fill="#e0e0e0"/>
    <!-- Headlight -->
    <circle cx="62" cy="42" r="3" fill="#ffeb3b" stroke="#f57f17" stroke-width="1"/>
  </svg>`,

  "Odong-odong": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Colorful kiddie train carriage -->
    <rect x="12" y="32" width="48" height="22" rx="6" fill="#e91e63" stroke="#880e4f" stroke-width="2"/>
    <!-- Carnival scalloped awning -->
    <path d="M 10 32 Q 18 22 26 32 Q 34 22 42 32 Q 50 22 58 32 Q 62 22 64 32"
          fill="#ffeb3b" stroke="#f57f17" stroke-width="2"/>
    <!-- Roof lights -->
    <circle cx="22" cy="20" r="3" fill="#00e676"/>
    <circle cx="36" cy="18" r="3.5" fill="#00e5ff"/>
    <circle cx="50" cy="20" r="3" fill="#ff9100"/>
    <!-- Wheels -->
    <circle cx="22" cy="56" r="7" fill="#212121" stroke="#f57f17" stroke-width="2"/>
    <circle cx="50" cy="56" r="7" fill="#212121" stroke="#f57f17" stroke-width="2"/>
    <!-- Smiling front face -->
    <circle cx="48" cy="40" r="2" fill="#fff"/>
    <path d="M 46 46 Q 50 50 54 46" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  "Ojek": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Motorbike frame -->
    <circle cx="18" cy="54" r="10" fill="#424242" stroke="#212121" stroke-width="3"/>
    <circle cx="54" cy="54" r="10" fill="#424242" stroke="#212121" stroke-width="3"/>
    <path d="M 18 54 L 32 46 L 46 46 L 54 54" stroke="#00c853" stroke-width="4" stroke-linecap="round"/>
    <path d="M 46 46 L 50 32 L 44 32" stroke="#212121" stroke-width="3" stroke-linecap="round"/>
    <!-- Green ojek jacket rider -->
    <circle cx="36" cy="22" r="7" fill="#00e676" stroke="#004d40" stroke-width="2"/>
    <!-- Helmet visor -->
    <path d="M 38 20 Q 42 24 38 28" stroke="#212121" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Seat -->
    <rect x="24" y="42" width="18" height="4" rx="2" fill="#212121"/>
  </svg>`,

  "Whoosh": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Sleek High Speed Train Nose -->
    <path d="M 64 46 C 54 46 40 46 12 46 C 8 46 8 38 14 36 L 44 34 C 54 34 60 40 64 46 Z"
          fill="#f5f5f5" stroke="#9e9e9e" stroke-width="1.5"/>
    <!-- Red Whoosh iconic racing swoosh stripe -->
    <path d="M 12 42 C 28 42 48 40 62 44" stroke="#d50000" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Aerodynamic dark cockpit windshield -->
    <path d="M 48 35 L 58 40 L 52 40 Z" fill="#212121"/>
    <!-- Rail track -->
    <line x1="8" y1="52" x2="66" y2="52" stroke="#37474f" stroke-width="2.5"/>
  </svg>`,

  // --- OBJEK BENTUK DI SEKITAR KITA (SHAPES & OBJECTS) ---
  "Ketupat": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Diamond woven pouch -->
    <path d="M 36 10 L 60 36 L 36 62 L 12 36 Z" fill="#8bc34a" stroke="#33691e" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Weaving lines -->
    <line x1="24" y1="22" x2="48" y2="50" stroke="#558b2f" stroke-width="2"/>
    <line x1="36" y1="10" x2="36" y2="62" stroke="#558b2f" stroke-width="2"/>
    <line x1="48" y1="22" x2="24" y2="50" stroke="#558b2f" stroke-width="2"/>
    <line x1="12" y1="36" x2="60" y2="36" stroke="#558b2f" stroke-width="2"/>
    <!-- Coconut leaf tails/janur -->
    <path d="M 36 62 Q 30 70 26 72 M 36 62 Q 42 70 46 72" stroke="#7cb342" stroke-width="3" stroke-linecap="round"/>
    <path d="M 36 10 Q 36 4 40 2" stroke="#7cb342" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  "Nasi Tumpeng": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Banana leaf base tray (Tampah) -->
    <ellipse cx="36" cy="60" rx="30" ry="8" fill="#388e3c" stroke="#1b5e20" stroke-width="2"/>
    <!-- Golden cone of turmeric rice -->
    <path d="M 36 10 L 14 58 C 24 64 48 64 58 58 Z" fill="#fbc02d" stroke="#f57f17" stroke-width="2"/>
    <path d="M 36 10 L 36 60" stroke="#f57f17" stroke-width="1.5" stroke-dasharray="2 2"/>
    <!-- Banana leaf tip crown (Takir) -->
    <path d="M 36 10 L 33 4 L 39 4 Z" fill="#2e7d32"/>
    <!-- Side garnish (egg slices, cucumber) -->
    <circle cx="22" cy="58" r="4" fill="#e53935"/>
    <circle cx="50" cy="58" r="4" fill="#4caf50"/>
    <circle cx="36" cy="59" r="4.5" fill="#fff59d" stroke="#fbc02d" stroke-width="1"/>
  </svg>`,

  "Donat": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Dough circle -->
    <circle cx="36" cy="36" r="26" fill="#d7ccc8" stroke="#8d6e63" stroke-width="2.5"/>
    <!-- Pink strawberry glaze -->
    <circle cx="36" cy="36" r="23" fill="#f48fb1"/>
    <!-- Donut center hole -->
    <circle cx="36" cy="36" r="9" fill="#ffffff" stroke="#8d6e63" stroke-width="2.5"/>
    <!-- Rainbow sprinkles -->
    <rect x="22" y="24" width="4" height="2" rx="1" fill="#ffeb3b" transform="rotate(20 22 24)"/>
    <rect x="44" y="22" width="4" height="2" rx="1" fill="#00e676" transform="rotate(-30 44 22)"/>
    <rect x="48" y="38" width="4" height="2" rx="1" fill="#29b6f6" transform="rotate(45 48 38)"/>
    <rect x="24" y="44" width="4" height="2" rx="1" fill="#ab47bc" transform="rotate(15 24 44)"/>
    <rect x="36" y="50" width="4" height="2" rx="1" fill="#ff7043"/>
    <rect x="33" y="18" width="4" height="2" rx="1" fill="#ffffff"/>
  </svg>`,

  "Roda Sepeda": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Outer tire rubber -->
    <circle cx="36" cy="36" r="28" fill="#424242" stroke="#212121" stroke-width="3"/>
    <!-- Inner silver rim -->
    <circle cx="36" cy="36" r="22" fill="#e0f7fa" stroke="#b0bec5" stroke-width="2"/>
    <!-- Spokes (jari-jari roda) -->
    <line x1="36" y1="14" x2="36" y2="58" stroke="#78909c" stroke-width="1.8"/>
    <line x1="14" y1="36" x2="58" y2="36" stroke="#78909c" stroke-width="1.8"/>
    <line x1="20" y1="20" x2="52" y2="52" stroke="#78909c" stroke-width="1.8"/>
    <line x1="52" y1="20" x2="20" y2="52" stroke="#78909c" stroke-width="1.8"/>
    <!-- Center axle hub -->
    <circle cx="36" cy="36" r="6" fill="#37474f" stroke="#cfd8dc" stroke-width="2"/>
  </svg>`,

  "Papan Tulis": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Wooden frame -->
    <rect x="6" y="16" width="60" height="40" rx="4" fill="#8d6e63" stroke="#5d4037" stroke-width="2"/>
    <!-- Green chalkboard surface -->
    <rect x="10" y="20" width="52" height="32" rx="2" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/>
    <!-- ABC math chalk drawings -->
    <text x="16" y="36" fill="#ffffff" font-size="12" font-family="sans-serif" font-weight="bold">ABC</text>
    <text x="16" y="48" fill="#ffeb3b" font-size="10" font-family="sans-serif" font-weight="bold">1+2=3</text>
    <!-- Chalk stick and eraser on ledge -->
    <rect x="42" y="47" width="8" height="3" rx="1" fill="#f5f5f5"/>
    <rect x="52" y="46" width="6" height="4" rx="1" fill="#d7ccc8"/>
  </svg>`,

  "Tenda Kemah": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Triangular camping tent -->
    <path d="M 36 12 L 8 60 L 64 60 Z" fill="#ff7043" stroke="#d84315" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Tent opening flap (inner triangle) -->
    <path d="M 36 12 L 24 60 L 48 60 Z" fill="#ffb74d" stroke="#f57c00" stroke-width="1.5"/>
    <path d="M 36 12 L 36 60" stroke="#bf360c" stroke-width="2"/>
    <path d="M 36 38 L 24 60 M 36 38 L 48 60" stroke="#bf360c" stroke-width="1.5"/>
    <!-- Pegs on ground -->
    <line x1="8" y1="60" x2="4" y2="64" stroke="#5d4037" stroke-width="3" stroke-linecap="round"/>
    <line x1="64" y1="60" x2="68" y2="64" stroke="#5d4037" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  "Bintang Laut": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 5-armed starfish -->
    <path d="M 36 8 C 38 18 42 24 50 24 C 60 24 66 32 60 40 C 54 48 50 48 52 58 C 54 68 44 70 36 62 C 28 70 18 68 20 58 C 22 48 18 48 12 40 C 6 32 12 24 22 24 C 30 24 34 18 36 8 Z"
          fill="#ff8a65" stroke="#e64a19" stroke-width="2" stroke-linejoin="round"/>
    <!-- Cute friendly face -->
    <circle cx="32" cy="38" r="2.5" fill="#212121"/>
    <circle cx="40" cy="38" r="2.5" fill="#212121"/>
    <path d="M 33 44 Q 36 47 39 44" stroke="#212121" stroke-width="2" stroke-linecap="round"/>
    <!-- Texture dots -->
    <circle cx="36" cy="20" r="1.5" fill="#ffe0b2"/>
    <circle cx="52" cy="32" r="1.5" fill="#ffe0b2"/>
    <circle cx="46" cy="54" r="1.5" fill="#ffe0b2"/>
    <circle cx="26" cy="54" r="1.5" fill="#ffe0b2"/>
    <circle cx="20" cy="32" r="1.5" fill="#ffe0b2"/>
  </svg>`,

  "Sarang Lebah": `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Honeycomb hexagons -->
    <path d="M 36 10 L 48 17 L 48 31 L 36 38 L 24 31 L 24 17 Z" fill="#ffd54f" stroke="#f57f17" stroke-width="2"/>
    <path d="M 18 29 L 30 36 L 30 50 L 18 57 L 6 50 L 6 36 Z" fill="#ffe082" stroke="#f57f17" stroke-width="2"/>
    <path d="M 54 29 L 66 36 L 66 50 L 54 57 L 42 50 L 42 36 Z" fill="#ffe082" stroke="#f57f17" stroke-width="2"/>
    <path d="M 36 48 L 48 55 L 48 69 L 36 76 L 24 69 L 24 55 Z" fill="#ffca28" stroke="#f57f17" stroke-width="2"/>
    <!-- Honey drop -->
    <circle cx="36" cy="24" r="4" fill="#ff6f00"/>
  </svg>`,
};

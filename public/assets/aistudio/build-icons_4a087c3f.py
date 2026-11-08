#!/usr/bin/env python3
"""
build-icons.py - ubah SVG OpenMoji menjadi satu file JavaScript offline (icons-data.js).

Persiapan (sekali saja):
  git clone --depth 1 https://github.com/hfg-gmuend/openmoji.git      # atau: npm install openmoji
  -> SVG ada di  openmoji/color/svg/<HEXCODE>.svg
  -> metadata di openmoji/data/openmoji.json

Cari kandidat hexcode untuk sebuah kata (ganti 'durian' dengan kata lain):
  python build-icons.py --search durian --meta openmoji/data/openmoji.json

Bangun icons-data.js:
  python build-icons.py --svg-dir openmoji/color/svg --map openmoji-map.json --out icons-data.js
  # opsi: --format uri  (SVG di-URL-encode, biasanya ~25% lebih kecil dari Base64)

Hasil:
  const _OM = { "1F34C": "data:image/svg+xml;base64,..." };      // tiap ikon hanya ditulis SEKALI
  const OpenMojiData = { "Pisang Ambon": _OM["1F34C"], ... };     // nama -> ikon (berbagi data)
  const OpenMojiMeta = { "Bayam": {"q":"approx"} };               // ikon "mirip" (diberi tanda ≈)
  const OpenMojiFallback = { "Durian": "card" };                  // tanpa ikon -> kartu bacaan / emoji
"""
import argparse
import base64
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote


def minify(svg: str) -> str:
    """Buang xml header, komentar, dan spasi berlebih supaya file kecil."""
    svg = re.sub(r'<\?xml[^>]*\?>|<!DOCTYPE[^>]*>', '', svg)
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'\s+', ' ', svg)
    svg = re.sub(r'>\s+<', '><', svg)
    return svg.strip()


def to_data_uri(svg: str, fmt: str) -> str:
    if fmt == 'b64':
        return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')
    return 'data:image/svg+xml,' + quote(svg, safe="/:=;,-_.!~*'()")


def hex_candidates(hexcode: str):
    """Nama file OpenMoji kadang memakai -FE0F, kadang tidak; coba semua kemungkinan."""
    h = hexcode.strip().upper().replace(' ', '-')
    bare = h.replace('-FE0F', '')
    return list(dict.fromkeys([h, bare, bare + '-FE0F']))


def search(meta_path: str, term: str) -> None:
    data = json.loads(Path(meta_path).read_text(encoding='utf-8'))
    t = term.lower()
    n = 0
    for e in data:
        hay = ' '.join(str(e.get(k, '')) for k in ('annotation', 'tags', 'openmoji_tags', 'group', 'subgroups')).lower()
        if t in hay:
            print(f"{str(e.get('hexcode')):<30} {e.get('emoji', '')}  {e.get('annotation', '')}  [{e.get('group', '')}]")
            n += 1
    print(f'{n} hasil untuk "{term}". Salin hexcode ke "hex" di openmoji-map.json.')


def build(a) -> None:
    items = json.loads(Path(a.map).read_text(encoding='utf-8'))['items']
    svg_dir = Path(a.svg_dir)
    if not svg_dir.is_dir():
        sys.exit(f'Folder SVG tidak ditemukan: {svg_dir}')
    index = {f.stem.upper(): f for f in svg_dir.glob('*.svg')}

    icons, names, meta, fallback, missing = {}, {}, {}, {}, []
    for name, it in items.items():
        hx = it.get('hex')
        if hx and not it.get('skip'):
            key = next((c for c in hex_candidates(hx) if c in index), None)
            if key:
                if key not in icons:
                    icons[key] = to_data_uri(minify(index[key].read_text(encoding='utf-8')), a.format)
                names[name] = key
                if it.get('quality') == 'approx':
                    meta[name] = {'q': 'approx'}
                continue
            missing.append((name, hx))
        fallback[name] = it.get('fallback', 'card')

    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    out = [
        '/* Dihasilkan oleh build-icons.py. Ikon: OpenMoji (https://openmoji.org), lisensi CC BY-SA 4.0. */',
        'const _OM=' + j(icons) + ';',
        'const OpenMojiData={' + ','.join(f'{j(n)}:_OM[{j(k)}]' for n, k in names.items()) + '};',
        'const OpenMojiMeta=' + j(meta) + ';',
        'const OpenMojiFallback=' + j(fallback) + ';',
    ]
    text = '\n'.join(out) + '\n'
    Path(a.out).write_text(text, encoding='utf-8')

    kb = len(text.encode('utf-8')) / 1024
    print(f'Total item peta      : {len(items)}')
    print(f'Punya ikon           : {len(names)}  ({len(icons)} file SVG unik)')
    print(f'Kartu bacaan/emoji   : {len(fallback)}')
    print(f'Ukuran {a.out:<14}: {kb:.0f} KB')
    if missing:
        print(f'\nPERINGATAN - hex ada di peta tetapi file SVG tidak ditemukan ({len(missing)}):')
        for n, h in missing:
            print(f'  {n:<24} {h}')
    if kb > 800:
        print('\nCatatan: file > 800 KB. Pakai --format uri, kurangi ikon, atau andalkan kartu bacaan.')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description='OpenMoji SVG -> icons-data.js')
    p.add_argument('--svg-dir', help='folder berisi SVG OpenMoji (color/svg)')
    p.add_argument('--map', default='openmoji-map.json')
    p.add_argument('--out', default='icons-data.js')
    p.add_argument('--format', choices=['b64', 'uri'], default='b64')
    p.add_argument('--search', help='kata kunci pencarian hexcode')
    p.add_argument('--meta', help='path ke openmoji/data/openmoji.json (untuk --search)')
    a = p.parse_args()
    if a.search:
        if not a.meta:
            sys.exit('--search butuh --meta path/ke/openmoji.json')
        search(a.meta, a.search)
    else:
        if not a.svg_dir:
            sys.exit('Isi --svg-dir (folder color/svg)')
        build(a)

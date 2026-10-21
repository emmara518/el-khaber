/**
 * Curated OFL Arabic font registry for the Arabic Typography Arsenal.
 *
 * These fonts are bundled under `.opencode/arabic/fonts/` for OFFLINE,
 * deterministic agent use (wordmark/SVG generation via `lib/shape.mjs`).
 * They are tooling assets — NOT app dependencies. Only copy a font into an
 * app (or load it from Google Fonts CDN) when a real UI decision requires it.
 *
 * License: SIL Open Font License 1.1 for every entry (see fonts/OFL-*.txt).
 * OFL permits embedding, subsetting, bundling and commercial use, but the
 * fonts must stay under OFL (do not relicense; keep copyright notices).
 */
import fs from 'node:fs';
import path from 'node:path';

export const FONTS_DIR = path.join(import.meta.dirname, '..', 'fonts');

export const FONT_LICENSE = 'OFL-1.1';
export const FONT_SOURCE_GOOGLE = 'https://github.com/google/fonts';

/**
 * key -> metadata. `axes` lists supported variation axes (tag, min, max, default).
 */
export const FONTS = {
  amiri: {
    family: 'Amiri',
    file: 'Amiri-Regular.ttf',
    style: 'Classical Naskh — calligraphic book face, revival of Bulaq Press metal type',
    useFor: ['calligraphic headings', 'quotes', 'editorial display', 'Quranic-style verse'],
    weights: [400],
    license: FONT_LICENSE,
    source: `${FONT_SOURCE_GOOGLE}/tree/main/ofl/amiri (upstream: https://github.com/aliftype/amiri)`,
  },
  'amiri-bold': {
    family: 'Amiri',
    file: 'Amiri-Bold.ttf',
    style: 'Classical Naskh, bold — strong calligraphic display',
    useFor: ['bold calligraphic headings', 'hero words', 'emphasis'],
    weights: [700],
    license: FONT_LICENSE,
    source: `${FONT_SOURCE_GOOGLE}/tree/main/ofl/amiri (upstream: https://github.com/aliftype/amiri)`,
  },
  'aref-ruqaa': {
    family: 'Aref Ruqaa',
    file: 'ArefRuqaa-Regular.ttf',
    style: 'Ruqaa calligraphy — casual, handwritten classical style',
    useFor: ['calligraphic accents', 'badges', 'ornamental labels', 'warm display words'],
    weights: [400],
    license: FONT_LICENSE,
    source: `${FONT_SOURCE_GOOGLE}/tree/main/ofl/arefruqaa (upstream: https://github.com/aliftype/aref-ruqaa)`,
  },
  'aref-ruqaa-bold': {
    family: 'Aref Ruqaa',
    file: 'ArefRuqaa-Bold.ttf',
    style: 'Ruqaa calligraphy, bold',
    useFor: ['bold calligraphic accents', 'stickers', 'emphasis words'],
    weights: [700],
    license: FONT_LICENSE,
    source: `${FONT_SOURCE_GOOGLE}/tree/main/ofl/arefruqaa (upstream: https://github.com/aliftype/aref-ruqaa)`,
  },
  'reem-kufi': {
    family: 'Reem Kufi',
    file: 'ReemKufi-Variable.ttf',
    style: 'Modern geometric Kufi display — grid-based, wordmark-oriented',
    useFor: ['wordmarks', 'logos', 'geometric headings', 'brand words'],
    weights: 'variable 100–900 (wght axis)',
    axes: [{ tag: 'wght', min: 100, max: 900, default: 400 }],
    license: FONT_LICENSE,
    source: `${FONT_SOURCE_GOOGLE}/tree/main/ofl/reemkufi (upstream: https://github.com/aliftype/reem-kufi)`,
  },
  lalezar: {
    family: 'Lalezar',
    file: 'Lalezar-Regular.ttf',
    style: 'Heavy display — bold poster face with Arabic coverage',
    useFor: ['poster headings', 'hero display', 'high-impact words'],
    weights: [400],
    license: FONT_LICENSE,
    source: `${FONT_SOURCE_GOOGLE}/tree/main/ofl/lalezar`,
  },
};

export function listFonts() {
  return Object.entries(FONTS).map(([key, meta]) => ({ key, ...meta }));
}

export function getFont(key) {
  const meta = FONTS[key];
  if (!meta) {
    throw new Error(
      `Unknown font "${key}". Available: ${Object.keys(FONTS).join(', ')} (see --list-fonts)`,
    );
  }
  const filePath = path.join(FONTS_DIR, meta.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Font file missing: ${filePath}`);
  }
  return { key, ...meta, filePath, bytes: fs.readFileSync(filePath) };
}

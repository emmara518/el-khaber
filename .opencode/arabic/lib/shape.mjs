/**
 * HarfBuzz shaping core: logical Arabic text + OFL font -> positioned glyph paths.
 *
 * This is what makes generated SVG wordmarks typographically CORRECT:
 * joining, ligatures, marks and RTL order are resolved by HarfBuzz
 * (the same engine browsers use), not by naive per-character layout.
 *
 * Units: shaping happens in font design units; `sizePx` only converts to
 * pixels at the end (scale = sizePx / upm).
 */
import * as hb from 'harfbuzzjs';
import { getFont } from './fonts.mjs';

const RTL_STRONG =
  /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LTR_STRONG = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;

export function detectDirection(text) {
  const hasRTL = RTL_STRONG.test(text);
  const hasLTR = LTR_STRONG.test(text);
  if (hasRTL && hasLTR) return 'mixed';
  if (hasRTL) return 'rtl';
  return 'ltr';
}

const faceCache = new Map();

function getFace(fontKey) {
  if (!faceCache.has(fontKey)) {
    const { bytes } = getFont(fontKey);
    const blob = new hb.Blob(bytes);
    const face = new hb.Face(blob);
    faceCache.set(fontKey, face);
  }
  return faceCache.get(fontKey);
}

function parseFeatures(featureArg) {
  if (!featureArg) return [];
  return String(featureArg)
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((s) => hb.Feature.fromString(s))
    .filter(Boolean);
}

/**
 * Shape one text run.
 * @returns { glyphs: [{gid, d, x, y}], direction, upm, widthUnits, bboxUnits, warnings[] }
 * x/y and bbox are in font design units (y-up). Glyph path `d` is in design
 * units at the font's natural scale (1 unit = 1 design unit) — scale by
 * sizePx/upm for pixels.
 */
export function shapeRun({ text, fontKey, features = '', weight = null, direction = 'auto' }) {
  if (!text) throw new Error('shapeRun: text must not be empty');
  const fontMeta = getFont(fontKey);
  const face = getFace(fontKey);
  const font = new hb.Font(face);

  if (weight != null) {
    const v = hb.Variation.fromString(`wght=${weight}`);
    if (!v) throw new Error(`Invalid weight "${weight}" for variable font ${fontKey}`);
    font.setVariations([v]);
  }

  let dir = direction === 'auto' ? detectDirection(text) : direction;
  const warnings = [];
  if (dir === 'mixed') {
    warnings.push(
      'Mixed RTL+Latin text detected: shaping as a single run. ' +
        'For mixed-direction lines, shape each directional run separately and compose manually.',
    );
    dir = RTL_STRONG.test(text[0]) || /^\s*[\u0590-\u08FF\uFB50-\uFEFF]/.test(text) ? 'rtl' : 'ltr';
  }

  const buffer = new hb.Buffer();
  buffer.addText(text);
  if (dir === 'rtl') {
    buffer.setDirection(hb.Direction.RTL);
    buffer.setScript('Arab');
    buffer.setLanguage('ar');
  } else {
    buffer.guessSegmentProperties();
  }

  hb.shape(font, buffer, parseFeatures(features));

  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  const glyphs = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity; // font units, y-up
  let maxY = -Infinity;

  // HarfBuzz returns shaped glyphs in VISUAL order (for RTL buffers that is
  // reverse-logical: last character first). Lay out in buffer order,
  // left-to-right, for both directions — exactly like hb-view does.
  // (Do NOT advance-then-place for RTL; that mirrors the word.)
  let pen = 0;
  for (let i = 0; i < infos.length; i++) {
    const pos = positions[i];
    const x = pen + pos.xOffset;
    const y = pos.yOffset;
    glyphs.push(placeGlyph(font, infos[i].codepoint, x, y));
    pen += pos.xAdvance;
  }

  for (const g of glyphs) {
    const ext = font.glyphExtents(g.gid);
    if (ext) {
      // NOTE: hb extents use y-up coords and height is NEGATIVE
      // (bottom = top + height). See hb_glyph_extents_t docs.
      const top = g.y + ext.yBearing;
      const bottom = top + ext.height;
      minX = Math.min(minX, g.x + ext.xBearing);
      maxX = Math.max(maxX, g.x + ext.xBearing + ext.width);
      maxY = Math.max(maxY, top);
      minY = Math.min(minY, bottom);
    } else {
      minX = Math.min(minX, g.x);
      maxX = Math.max(maxX, g.x);
      minY = Math.min(minY, g.y);
      maxY = Math.max(maxY, g.y);
    }
  }
  if (!glyphs.length) {
    minX = maxX = minY = maxY = 0;
  }

  return {
    glyphs,
    direction: dir,
    upm: face.upem,
    family: fontMeta.family,
    widthUnits: maxX - minX,
    bboxUnits: { minX, maxX, minY, maxY },
    warnings,
  };
}

function placeGlyph(font, gid, x, y) {
  let d = '';
  try {
    d = font.glyphToPath(gid) || '';
  } catch {
    d = '';
  }
  return { gid, d, x, y };
}

/** Advance width of one glyph (design units) — used for kashida justification. */
export function glyphAdvanceUnits({ fontKey, codepoint, weight = null }) {
  const face = getFace(fontKey);
  const font = new hb.Font(face);
  if (weight != null) {
    const v = hb.Variation.fromString(`wght=${weight}`);
    if (v) font.setVariations([v]);
  }
  const gid = font.nominalGlyph(codepoint);
  if (gid == null) return null;
  return { gid, advance: font.glyphHAdvance(gid) };
}

export const TATWEEL = 0x0640;

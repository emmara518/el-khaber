#!/usr/bin/env node
/**
 * kashida-text.mjs — principled kashida (tatweel) placement for Arabic text.
 *
 * Engine: vendored aliftype/kashida-js (Apache-2.0, "The Big Kashida Secret"
 * rule set by Dr. Khaled Hosny): max ONE kashida position per word by default,
 * positions chosen by typographic priority (lower number = more preferable).
 *
 *   node kashida-text.mjs --text "بسم الله"                      # 1 kashida/word
 *   node kashida-text.mjs --text "..." --count 3                 # decorative stretch
 *   node kashida-text.mjs --text "..." --points                  # JSON inspection
 *   node kashida-text.mjs --text "line1" --text "line2" --justify --font amiri --size 48
 *
 * Capabilities served: modify_kashida, stretch_glyph (text level).
 * NOTE: kashida belongs in DISPLAY compositions (headings/wordmark SVG input),
 * never in stored UI strings, URLs, or identifiers.
 */
import { shapeRun, glyphAdvanceUnits, TATWEEL } from '../lib/shape.mjs';
import {
  findKashidaPoints,
  insertKashidas,
  makeKashidaString,
  Kashida,
} from '../vendor/kashida/kashida.js';

function usage(exit = 0) {
  console.log(`kashida-text.mjs — principled kashida placement
Usage:
  node kashida-text.mjs --text "..." [options]

Options:
  --text STR        Input text (repeatable for --justify; required)
  --count N         Kashidas per word, best points first (default: 1)
  --all             Insert at EVERY valid point (overrides --count; decorative only)
  --points          Print insertion points as JSON instead of transformed text
  --justify         Unify line widths with kashidas (needs --font/--size)
  --target-px N     Justify target width in px (default: widest input line)
  --font KEY        Font for width measurement (default: amiri)
  --size PX         Size for width measurement (default: 48)
  --weight N        Variable-font weight for measurement
`);
  process.exit(exit);
}

function parseArgs(argv) {
  const args = { text: [] };
  const flags = new Set(['all', 'points', 'justify', 'help']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-/g, '');
    if (key === 'text') args.text.push(argv[++i]);
    else if (flags.has(key)) args[key] = true;
    else args[key] = argv[++i];
  }
  return args;
}

/** Insert `count` kashidas into one word at its best points. */
function stretchWordCount(word, count) {
  const [, points] = findKashidaPoints(word);
  if (!points.length || count <= 0) return word;
  const ranked = [...points].sort((a, b) => a.priority - b.priority || a.index - b.index);
  const entries = [];
  let remaining = count;
  let round = 0;
  while (remaining > 0 && round < 8) {
    for (const p of ranked) {
      if (remaining <= 0) break;
      entries.push(new Kashida(p.index, p.priority));
      remaining -= 1;
    }
    round += 1;
  }
  return insertKashidas(word, entries, true);
}

function transformText(text, { count, all }) {
  if (all) return makeKashidaString(text, 'simple', true, true);
  if (count === 1) return makeKashidaString(text, 'simple', true, false);
  return text.replace(/\S+/g, (w) => stretchWordCount(w, count));
}

function measurePx(text, fontKey, sizePx, weight) {
  const r = shapeRun({ text, fontKey, weight });
  return (r.widthUnits * sizePx) / r.upm;
}

/** Justify: distribute extra kashidas across a line to reach target width. */
function justifyLine(line, targetPx, fontKey, sizePx, weight) {
  const kInfo = glyphAdvanceUnits({ fontKey, codepoint: TATWEEL, weight });
  if (!kInfo) {
    return { line, added: 0, note: `font has no tatweel glyph; line unchanged` };
  }
  const base = shapeRun({ text: line, fontKey, weight });
  const basePx = (base.widthUnits * sizePx) / base.upm;
  const kPx = (kInfo.advance * sizePx) / base.upm;
  if (kPx <= 0) return { line, added: 0, note: 'zero kashida advance; line unchanged' };
  const need = Math.max(0, Math.round((targetPx - basePx) / kPx));
  if (need === 0) return { line, added: 0, note: 'already at/over target' };

  // Collect points across words: [{wordIdx, point}], global priority order.
  const words = line.split(/(\s+)/);
  const slots = [];
  words.forEach((w, wi) => {
    if (!w || /^\s+$/.test(w)) return;
    const [, points] = findKashidaPoints(w);
    for (const p of points) slots.push({ wi, point: p });
  });
  if (!slots.length) return { line, added: 0, note: 'no valid kashida points' };
  slots.sort((a, b) => a.point.priority - b.point.priority || a.wi - b.wi);

  // Round-robin allocation, cap 12 insertions per slot (word + point).
  const perWord = words.map(() => []);
  const perSlotCount = new Map();
  let remaining = need;
  let round = 0;
  while (remaining > 0 && round < 12) {
    for (const s of slots) {
      if (remaining <= 0) break;
      const key = `${s.wi}:${s.point.index}`;
      if ((perSlotCount.get(key) || 0) >= 12) continue;
      perSlotCount.set(key, (perSlotCount.get(key) || 0) + 1);
      perWord[s.wi].push(new Kashida(s.point.index, s.point.priority));
      remaining -= 1;
    }
    round += 1;
  }
  const out = words
    .map((w, wi) => (/^\s+$/.test(w) || !w ? w : insertKashidas(w, perWord[wi], true)))
    .join('');
  return {
    line: out,
    added: need - remaining,
    note: remaining > 0 ? `${remaining} kashidas could not be placed` : 'ok',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);
  if (!args.text.length) {
    console.error('error: --text is required');
    usage(1);
  }
  const fontKey = args.font || 'amiri';
  const sizePx = Number(args.size || 48);
  const weight = args.weight != null ? Number(args.weight) : null;

  if (args.points) {
    const out = args.text.map((t) => ({
      text: t,
      words: t
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => {
          const [clean, points] = findKashidaPoints(w);
          return {
            word: w,
            clean,
            points: points
              .map((p) => ({ index: p.index, priority: p.priority }))
              .sort((a, b) => a.priority - b.priority || a.index - b.index),
          };
        }),
    }));
    console.log(JSON.stringify(args.text.length === 1 ? out[0] : out, null, 2));
    return;
  }

  if (args.justify) {
    const widths = args.text.map((t) => measurePx(t, fontKey, sizePx, weight));
    const target = args['targetpx'] != null ? Number(args['targetpx']) : Math.max(...widths);
    const results = args.text.map((t, i) => ({
      input: t,
      baseWidthPx: +widths[i].toFixed(2),
      ...justifyLine(t, target, fontKey, sizePx, weight),
      targetPx: target,
    }));
    console.log(JSON.stringify(args.text.length === 1 ? results[0] : results, null, 2));
    return;
  }

  const count = args.count != null ? Number(args.count) : 1;
  if (!Number.isInteger(count) || count < 0 || count > 64) {
    console.error('error: --count must be an integer in [0, 64]');
    process.exit(1);
  }
  const lines = args.text.map((t) => transformText(t, { count, all: !!args.all }));
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});

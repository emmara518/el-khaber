#!/usr/bin/env node
/**
 * shape-text.mjs — Arabic text -> shaped, self-contained SVG (correct joining/ligatures/RTL).
 *
 *   node .opencode/arabic/scripts/shape-text.mjs --text "الخبير" --font amiri --size 96 --out wordmark.svg
 *
 * Capabilities served: generate_wordmark, export_svg, compose_arabic,
 * generate_text_variations (vary --font/--weight/--stretch), stretch_glyph (--stretch).
 *
 * DESIGN RULE: output is vector artwork for logos / decorative headings /
 * hero words. Ordinary UI text stays real HTML text — never bulk-convert UI
 * strings with this tool.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shapeRun } from '../lib/shape.mjs';
import { listFonts } from '../lib/fonts.mjs';
import { findKashidaPoints, insertKashidas, Kashida } from '../vendor/kashida/kashida.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function usage(exit = 0) {
  console.log(`shape-text.mjs — Arabic text to shaped SVG
Usage:
  node shape-text.mjs --text "..." [options]

Options:
  --text STR        Text to render (required)
  --font KEY        Font key (default: amiri). See --list-fonts
  --size PX         Cap size in px (default: 96)
  --weight N        Variable-font weight, e.g. 700 (only for variable fonts)
  --fill COLOR      Fill color (default: #10213a). Use "currentColor" for themable assets
  --out PATH        Output SVG path (default: stdout)
  --pad FRAC        Padding as fraction of size (default: 0.08)
  --title STR       Accessible <title> (default: the text itself)
  --features STR    HarfBuzz features, e.g. "kern,liga" (default: font defaults)
  --stretch N       Kashida elongation: N extra tatweels per word at best points (default: 0)
  --metrics         Print JSON metrics (width px, bbox, direction) to stderr
  --list-fonts      List curated fonts and exit
`);
  process.exit(exit);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'list-fonts' || key === 'metrics' || key === 'help') {
      args[key] = true;
    } else {
      args[key] = argv[++i];
    }
  }
  return args;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Distribute N kashida insertions across a word's points (best point first, cap 8/point). */
function stretchWord(word, count) {
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

function applyStretch(text, count) {
  if (!count || count <= 0) return text;
  return text.replace(/\S+/g, (w) => stretchWord(w, count));
}

function buildSvg({ glyphs, bboxUnits, upm, sizePx, fill, padFrac, title, direction }) {
  const f = sizePx / upm;
  const { minX, maxX, minY, maxY } = bboxUnits;
  const pad = padFrac * sizePx;
  const w = (maxX - minX) * f;
  const h = (maxY - minY) * f;
  const vx = minX * f - pad;
  const vy = -maxY * f - pad;

  const paths = glyphs
    .filter((g) => g.d)
    .map((g) => {
      const tx = (g.x * f).toFixed(2);
      const ty = (-g.y * f).toFixed(2);
      return `    <path d="${g.d}" transform="translate(${tx} ${ty}) scale(${f.toFixed(4)} ${(-f).toFixed(4)})"/>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx.toFixed(2)} ${vy.toFixed(2)} ${(w + pad * 2).toFixed(2)} ${(h + pad * 2).toFixed(2)}" role="img" aria-label="${escapeXml(title)}" direction="${direction}">
  <title>${escapeXml(title)}</title>
  <g fill="${escapeXml(fill)}">
${paths}
  </g>
</svg>
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);

  if (args['list-fonts']) {
    for (const f of listFonts()) {
      console.log(
        `${f.key}\n  family : ${f.family}\n  style  : ${f.style}\n  file   : ${f.file}\n  license: ${f.license}\n  useFor : ${f.useFor.join(', ')}\n`,
      );
    }
    return;
  }

  const text = args.text;
  if (!text) {
    console.error('error: --text is required');
    usage(1);
  }
  const fontKey = args.font || 'amiri';
  const sizePx = Number(args.size || 96);
  if (!Number.isFinite(sizePx) || sizePx <= 0 || sizePx > 4096) {
    console.error('error: --size must be a number in (0, 4096]');
    process.exit(1);
  }
  const weight = args.weight != null ? Number(args.weight) : null;
  const stretch = args.stretch != null ? Number(args.stretch) : 0;
  if (!Number.isInteger(stretch) || stretch < 0 || stretch > 64) {
    console.error('error: --stretch must be an integer in [0, 64]');
    process.exit(1);
  }
  const fill = args.fill || '#10213a';
  const padFrac = args.pad != null ? Number(args.pad) : 0.08;
  const title = args.title || text;

  const shapedText = applyStretch(text, stretch);
  let result;
  try {
    result = shapeRun({ text: shapedText, fontKey, features: args.features || '', weight });
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }

  const svg = buildSvg({
    glyphs: result.glyphs,
    bboxUnits: result.bboxUnits,
    upm: result.upm,
    sizePx,
    fill,
    padFrac,
    title,
    direction: result.direction,
  });

  if (args.metrics) {
    const f = sizePx / result.upm;
    console.error(
      JSON.stringify(
        {
          font: fontKey,
          family: result.family,
          direction: result.direction,
          sizePx,
          widthPx: +(result.widthUnits * f).toFixed(2),
          glyphs: result.glyphs.length,
          stretch,
          warnings: result.warnings,
        },
        null,
        2,
      ),
    );
    for (const w of result.warnings) console.error(`warning: ${w}`);
  }

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, svg, 'utf8');
    console.error(`wrote ${outPath}`);
  } else {
    process.stdout.write(svg);
  }
}

main().catch((err) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * lint-arabic.mjs — static Arabic typography / RTL QA for UI source code.
 *
 *   node .opencode/arabic/scripts/lint-arabic.mjs [--root apps] [--json] [--strict]
 *
 * Capabilities served: check_arabic_typography, check_rtl, validate_arabic_ui.
 *
 * Zero dependencies. Exit 1 on errors (or on warnings with --strict).
 */
import fs from 'node:fs';
import path from 'node:path';

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const PRESENTATION_FORMS = /[\uFB50-\uFDFF\uFE70-\uFEFF]/;
const TATWEEL = /\u0640/;
const BIDI_OVERRIDE = /[\u202A-\u202E]/;

const ARABIC_FONT_HINT =
  /arab|amiri|ruqaa|kufi|naskh|cairo|tajawal|plex|noto|scheherazade|lateef|lalezar|rakkas|reem|aref|gulzar|vazir|katibeh|jomhuria|marhey|baloo|segoe|tahoma|arial|system-ui|sans-serif/i;

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'build',
  '.git',
  'coverage',
  '.opencode',
  'ios',
  'android',
]);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.svg']);

function usage(exit = 0) {
  console.log(`lint-arabic.mjs — Arabic typography / RTL static QA
Usage:
  node lint-arabic.mjs [--root DIR]... [--json] [--strict] [--quiet]

Options:
  --root DIR   Directory to scan (repeatable; default: apps packages)
  --json       Machine-readable JSON output
  --strict     Exit 1 on warnings as well as errors
  --quiet      Only print findings (no summary)
`);
  process.exit(exit);
}

function parseArgs(argv) {
  const args = { root: [], json: false, strict: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root.push(argv[++i]);
    else if (a === '--json') args.json = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--help') usage(0);
  }
  if (!args.root.length) args.root = ['apps', 'packages'];
  return args;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function finding(file, line, rule, severity, message, hint = '') {
  return { file, line, rule, severity, message, hint };
}

function lintFile(file, src) {
  const out = [];
  const lines = src.split('\n');
  const ext = path.extname(file);
  const base = path.basename(file);
  const hasArabic = ARABIC.test(src);

  lines.forEach((raw, idx) => {
    const line = idx + 1;
    const text = raw;

    // 1. Presentation forms (compatibility block) — breaks shaping & search.
    if (PRESENTATION_FORMS.test(text)) {
      out.push(
        finding(
          file,
          line,
          'ar-isolated-forms',
          'error',
          'Arabic presentation-form characters (U+FB50–FEFF) — use logical characters and let the shaper join them.',
          'Replace with base letters, e.g. ﷲ → الله.',
        ),
      );
    }

    // 2. Manual kashida in UI source.
    if (
      TATWEEL.test(text) &&
      (ext === '.tsx' || ext === '.ts' || ext === '.jsx' || ext === '.js')
    ) {
      out.push(
        finding(
          file,
          line,
          'ar-manual-kashida',
          'warning',
          'Hardcoded tatweel U+0640 in UI source — breaks search/copy and justification.',
          'Generate stretched display text with kashida-text.mjs; keep UI strings clean.',
        ),
      );
    }

    // 3. Deprecated bidi overrides.
    if (BIDI_OVERRIDE.test(text)) {
      out.push(
        finding(
          file,
          line,
          'ar-bidi-override',
          'warning',
          'Deprecated bidi control (U+202A–U+202E) — prefer <bdi>/isolates or proper dir attributes.',
          '',
        ),
      );
    }

    // 4. letter-spacing.
    const lsCss = text.match(/letter-spacing\s*:\s*([^;!}]+)/i);
    const lsJsx = text.match(/letterSpacing\s*:\s*['"]?([^,'"}]+)/);
    const lsVal = (lsCss && lsCss[1].trim()) || (lsJsx && lsJsx[1].trim());
    if (lsVal && !/^(0|0px|0em|normal)$/i.test(lsVal)) {
      const sev = hasArabic && ext !== '.css' ? 'error' : 'warning';
      out.push(
        finding(
          file,
          line,
          'ar-letter-spacing',
          sev,
          `Non-zero letter-spacing (${lsVal})${hasArabic ? ' in a file containing Arabic' : ''} — breaks Arabic joining.`,
          'Scope letter-spacing to Latin-only selectors (:lang(en), .ltr) and keep 0 for Arabic.',
        ),
      );
    }

    // 5. text-transform on Arabic-carrying files.
    const tt =
      text.match(/text-transform\s*:\s*(uppercase|lowercase|capitalize)/i) ||
      text.match(/textTransform\s*:\s*['"]?(uppercase|lowercase|capitalize)/);
    if (tt && hasArabic) {
      out.push(
        finding(
          file,
          line,
          'ar-text-transform',
          'warning',
          `text-transform:${tt[1]} in a file containing Arabic — no-op for Arabic, signals wrong assumptions.`,
          'Apply transforms only to Latin runs.',
        ),
      );
    }

    // 6. dir="ltr" wrapping Arabic.
    const dirLtr = text.match(/<([A-Za-z][\w-]*)[^>]*\bdir\s*=\s*["']ltr["'][^>]*>([^<]{0,300})/);
    if (dirLtr && ARABIC.test(dirLtr[2])) {
      out.push(
        finding(
          file,
          line,
          'ar-dir-mismatch',
          'error',
          `<${dirLtr[1]} dir="ltr"> contains Arabic text — glyphs will order incorrectly.`,
          'Use dir="rtl" (or dir="auto") for Arabic content.',
        ),
      );
    }

    // 7. font-family without Arabic-capable fallback (only when file carries Arabic).
    const ff =
      text.match(/font-family\s*:\s*([^;!}]+)/i) || text.match(/fontFamily\s*:\s*['"]([^'"]+)/);
    if (ff && hasArabic && !ARABIC_FONT_HINT.test(ff[1])) {
      const stack = ff[1].trim().replace(/['"]/g, '');
      // A lone CSS-wide keyword inherits the decision from its parent — nothing to judge here.
      if (!/^(inherit|initial|unset)$/i.test(stack)) {
        out.push(
          finding(
            file,
            line,
            'ar-font-stack',
            'warning',
            `font-family "${stack.slice(0, 80)}" has no Arabic-capable fallback.`,
            'Append an Arabic face (Amiri/Aref Ruqaa/Reem Kufi/Noto Arabic/Segoe UI/Tahoma) or system-ui.',
          ),
        );
      }
    }
  });

  // 8. SVG <text> with Arabic — font-dependent rendering risk.
  if (ext === '.svg') {
    const m = src.match(/<text\b[^>]*>([\s\S]{0,500}?)<\/text>/gi) || [];
    for (const block of m) {
      if (ARABIC.test(block)) {
        out.push(
          finding(
            file,
            1,
            'ar-svg-text',
            'warning',
            'Arabic inside SVG <text> depends on viewer fonts — may render unshaped.',
            'Convert display lettering to paths with shape-text.mjs; keep UI text as HTML.',
          ),
        );
        break;
      }
    }
  }

  // 9. Next.js root layout must keep lang="ar" dir="rtl".
  if (base === 'layout.tsx' && src.includes('<html')) {
    const htmlTag = src.match(/<html[^>]*>/)?.[0] || '';
    if (!/lang\s*=\s*["']ar["']/.test(htmlTag)) {
      out.push(
        finding(
          file,
          1,
          'ar-lang-missing',
          'error',
          '<html> is missing lang="ar".',
          'Restore lang="ar" dir="rtl" on <html>.',
        ),
      );
    }
    if (!/dir\s*=\s*["']rtl["']/.test(htmlTag)) {
      out.push(
        finding(
          file,
          1,
          'ar-dir-missing',
          'error',
          '<html> is missing dir="rtl".',
          'Restore lang="ar" dir="rtl" on <html>.',
        ),
      );
    }
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const files = args.root.flatMap((r) => walk(path.resolve(repoRoot, r)));
  const findings = files.flatMap((f) => {
    try {
      return lintFile(f, fs.readFileSync(f, 'utf8'));
    } catch {
      return [];
    }
  });

  const rel = (f) => path.relative(repoRoot, f).replace(/\\/g, '/');
  const errors = findings.filter((x) => x.severity === 'error').length;
  const warnings = findings.filter((x) => x.severity === 'warning').length;

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          files: files.length,
          errors,
          warnings,
          findings: findings.map((x) => ({ ...x, file: rel(x.file) })),
        },
        null,
        2,
      ),
    );
  } else {
    for (const x of findings) {
      console.log(
        `${rel(x.file)}:${x.line} [${x.severity}] ${x.rule}: ${x.message}${x.hint ? ` Hint: ${x.hint}` : ''}`,
      );
    }
    if (!args.quiet) {
      console.log(`\nscanned ${files.length} files — ${errors} error(s), ${warnings} warning(s)`);
    }
  }
  process.exit(errors > 0 || (args.strict && warnings > 0) ? 1 : 0);
}

main();

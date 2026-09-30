---
name: arabic-typography
description: Use for ANY Arabic visual/typography task in this repo: Arabic headings, display type, calligraphy, wordmarks/logos, decorative SVG lettering, ornaments, kashida/stretching, or Arabic RTL typography QA. Decides between real text, curated fonts, local SVG generation, manual pro tools, and validation. Load this skill before touching Arabic typography assets or styles.
---

# Arabic Typography & Calligraphy Arsenal

Arabic-first repo (`lang="ar" dir="rtl"`). Never break joining, RTL order, ligatures, or diacritics.

## 0. Classify the request first

| Type                  | Examples                                                   | Correct approach                                                        |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| A) Normal UI text     | buttons, labels, forms, nav, paragraphs, notifications     | Real selectable HTML text. No SVG. No letter-spacing.                   |
| B) Decorative heading | hero title, section display words                          | Real text + curated display font (§2), or SVG if special shaping needed |
| C) Calligraphy        | artistic panel, quote artwork                              | Local fonts + `shape-text.mjs` (§3), else Kaleam/manual (§5)            |
| D) Wordmark / logo    | brand word, app mark                                       | `shape-text.mjs` vector SVG (§3). Never raster.                         |
| E) Ornamental SVG     | separators, frames, honorific ligatures, geometric pattern | `catalog.json` ornament sources (§4) or `naqsh` letter art              |
| F) Typography QA      | review pass, RTL check, "why does this look broken"        | `lint-arabic.mjs` (§6) + visual check                                   |

**Text-vs-SVG rule:** buttons/labels/forms/nav/paragraphs/notifications and all
accessibility-critical content stay real text. SVG is only for logos, decorative
headings, calligraphic artwork, branded words, ornaments, hero visual type.

## 1. Reuse-first (mandatory order)

1. Existing project assets: search app `public/` / `src/assets` for a fitting SVG.
2. Existing components/fonts: `packages/ui-tokens/src/typography.ts`, app `globals.css` `--font-arabic`.
3. `.opencode/arabic/catalog.json` — curated fonts + ornament collections.
4. Generate only when 1–3 have nothing suitable.

## 2. Curated fonts (OFL-1.1, commercial OK)

Small set in `.opencode/arabic/fonts/` (+ full records in `catalog.json`):

- `amiri` / `amiri-bold` — classical Naskh calligraphic (headings, quotes)
- `aref-ruqaa` / `aref-ruqaa-bold` — Ruqaa calligraphy (accents, badges)
- `reem-kufi` — geometric Kufi display, variable wght 100–900 (wordmarks; use `--weight`)
- `lalezar` — heavy poster display (hero words)

For web UI use, prefer Google Fonts CDN/self-host of the same families; the
bundled files are for offline agent-side SVG generation. Do NOT add random fonts.

## 3. Local generation (deterministic, offline)

Run from repo root with `node`:

```sh
# C/D) wordmark or decorative heading -> self-contained SVG (correct HarfBuzz shaping)
node .opencode/arabic/scripts/shape-text.mjs --text "الخبير" --font reem-kufi --weight 700 --size 120 --fill currentColor --out /tmp/khabir-mark.svg --metrics

# variations: font / weight / stretch
node .opencode/arabic/scripts/shape-text.mjs --text "الخبير" --font amiri --stretch 2 --out /tmp/opt2.svg

# kashida: inspect points, stretch display words, justify lines
node .opencode/arabic/scripts/kashida-text.mjs --text "بسم الله الرحمن الرحيم" --points
node .opencode/arabic/scripts/kashida-text.mjs --text "سطر أول" --text "سطر ثان" --justify --font amiri --size 48
```

Rules: kashida/stretching only for display compositions, never stored UI strings.
One kashida position per word by default (Khatt rule); `--stretch`/`--count` stack
elongations for decorative effect. Check output visually (open the SVG / screenshot
via playwright) — kashida must look intentional, never random.

`naqsh` (npm dep, MIT review build) is available for decorative letter monograms:
`node -e "import('naqsh').then(m => console.log(m.renderAvatar('khabir',{root:'خبر',shape:'squircle'})))"`.
Use `rootStrategy:'letters'` or an explicit `root` for predictable output; it makes
avatar-style art, not wordmarks.

## 4. Ornaments (fetch on demand, respect licenses)

- Honorific ligatures (CC BY 4.0, attribution to BaAlwi Heritage): fetch single
  glyphs from `https://github.com/baalwi-id/arabic-honorific-ligatures/tree/main/svg` — copy only used glyphs.
- Bourgoin arabesque patterns: VERIFY repo license before use.
- Small UI ornaments: prefer the configured `iconify` MCP (`search_icons` → `get_icon_svg`, check set license).
- Never download copyrighted assets without clear permission.

## 5. Professional calligraphy (manual — no API exists)

**Kaleam** (kaleam.com, subscription): Thuluth/Diwani/Naskh/Persian/Ruqah with
full control + SVG/PDF export. **There is no public API and no MCP — do not invent
one.** Workflow: designer composes in browser → exports SVG → agent integrates the
file into app assets. Free alternative for drafts: arabiccalligraphy.app (browser,
12 OFL fonts, SVG export, no account). Never script these sites with fake APIs.

## 6. Validate every change

```sh
node .opencode/arabic/scripts/lint-arabic.mjs            # human report (exit 1 on errors)
node .opencode/arabic/scripts/lint-arabic.mjs --json     # machine-readable
```

Hard failures: presentation-form chars (use logical letters), `dir="ltr"` wrapping
Arabic, missing `lang="ar"`/`dir="rtl"` on `<html>`, non-zero `letter-spacing` on
Arabic files. Warnings: hardcoded tatweel in UI source (generate instead),
`text-transform` on Arabic, Latin-only font stacks, Arabic in SVG `<text>`
(convert display lettering to paths via §3), deprecated bidi overrides.
Then visually verify RTL rendering (playwright/browser screenshot) for UI changes.

## Capability map (conceptual → concrete)

- search_arabic_style / search_arabic_font → §2 + `catalog.json`
- generate_calligraphy → §3 local fonts; Kaleam/manual §5 when insufficient
- generate_text_variations → `shape-text.mjs` font/weight/stretch matrix; `naqsh` for monograms
- generate_wordmark / compose_arabic / export_svg → `shape-text.mjs`
- modify_letter_spacing → FORBIDDEN on Arabic; use kashida instead
- modify_kashida / stretch_glyph → `kashida-text.mjs`, `shape-text.mjs --stretch`
- get_ornament / get_arabic_svg_asset → §4 (+ `naqsh` letter SVGs)
- check_arabic_typography / check_rtl / validate_arabic_ui → `lint-arabic.mjs` + visual check

No custom MCP: local scripts (bash) + skill + existing MCPs (iconify/shadcn/animotion)
cover everything deterministically. Do not add MCP servers for these capabilities.

# 13 — Arabic Typography & Calligraphy Arsenal

Agent tooling for professional Arabic typography in this repo. Operational
rules live in `.opencode/skills/arabic-typography/SKILL.md` (OpenCode loads it
automatically for Arabic visual tasks). This document is the durable reference:
what was researched, what was installed, why, and how to use it.

## 1. Research conclusions (verified 2026-09-15)

| Tool                                  | Verdict                                     | Reason                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kaleam** (kaleam.com)               | Manual workflow only                        | Browser SaaS for Thuluth/Diwani/Naskh/Persian/Ruqah with SVG/PDF export. **No public API, no MCP exists.** Do not invent one. Designer composes → exports SVG → agent integrates.                                                                                                                                  |
| **Naqsh** (`dralkh/naqsh`)            | Installed (npm git dep, MIT, pinned commit) | Deterministic Arabic monogram/letter SVG generator, self-contained output, Node ≥22 OK (we run Node 24). Review build (pre-SDK): use `rootStrategy:'letters'` or explicit `root` for predictable output. Avatar-style art, not full wordmarks.                                                                     |
| **Kashida** (`aliftype/kashida-js`)   | Vendored (Apache-2.0)                       | By Khaled Hosny (Amiri/HarfBuzz). The maintained JS implementation of "The Big Kashida Secret" rule set. Not on npm → 4 files vendored under `.opencode/arabic/vendor/kashida/` with LICENSE. Only `SIMPLE` algorithm implemented upstream; priorities 1→7, lower = more preferable, one kashida/word default.     |
| `aiaf/kashida.js` (2017)              | Skipped                                     | Superseded by aliftype/kashida-js.                                                                                                                                                                                                                                                                                 |
| `@nagwa-limited/kashida-engine` (npm) | Skipped                                     | Justification helper tied to browser `canvas.measureText`; our HarfBuzz measurement is deterministic and offline.                                                                                                                                                                                                  |
| **harfbuzzjs** (npm, MIT, official)   | Installed                                   | Browser-grade shaping + `glyphToPath()` in Node. Powers local SVG wordmark generation with correct joining/ligatures/RTL.                                                                                                                                                                                          |
| **arabiccalligraphy.app**             | Manual draft tool                           | Free browser generator, 12 OFL fonts, HarfBuzz-correct, SVG export, no account. No API → manual use only.                                                                                                                                                                                                          |
| **Ornaments**                         | Cataloged, fetch-on-demand                  | `baalwi-id/arabic-honorific-ligatures` (CC BY 4.0, 61 SVG ligatures); Bourgoin `arabicart-patterns` (license must be verified per use); `atmorojo/ArabicCalligraphy` (CC BY 4.0 occasion pieces); iconify MCP for small UI ornaments (check per-set license). KFGQPC-derived assets skipped (restrictive license). |

No custom MCP was created: the capability layer is **skill + local scripts**,
invoked through OpenCode's built-in shell. This is deterministic, offline,
zero-context-overhead, and the simplest maintainable approach.

## 2. What was installed

```
.opencode/
  package.json                    # +harfbuzzjs ^1.6.1, +naqsh github:dralkh/naqsh#<pinned>
  arabic/
    catalog.json                  # machine-readable font/ornament/tool catalog
    fonts/                        # 4 curated OFL-1.1 families (+OFL-*.txt licenses)
      Amiri-Regular.ttf / Amiri-Bold.ttf
      ArefRuqaa-Regular.ttf / ArefRuqaa-Bold.ttf
      ReemKufi-Variable.ttf       # wght 100–900
      Lalezar-Regular.ttf
    lib/
      fonts.mjs                   # font registry + loader
      shape.mjs                   # HarfBuzz shaping core (RTL-correct layout)
    scripts/
      shape-text.mjs              # text -> shaped SVG wordmark/artwork
      kashida-text.mjs            # kashida points / stretch / line justification
      lint-arabic.mjs             # static Arabic typography + RTL QA (zero-dep)
    vendor/kashida/               # aliftype/kashida-js + LICENSE.txt + README.md
  skills/arabic-typography/SKILL.md
```

No application source files were modified. No secrets. No new MCP servers.
No app dependencies were added (tooling lives in `.opencode/`, gitignored `node_modules`).

## 3. Capability map

| Conceptual capability                                    | Concrete implementation                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| search_arabic_style / search_arabic_font                 | SKILL §2 + `catalog.json`                                            |
| generate_calligraphy                                     | `shape-text.mjs` (Amiri/Aref Ruqaa); Kaleam manual when insufficient |
| generate_text_variations                                 | `shape-text.mjs` font/weight/stretch matrix; `naqsh` monograms       |
| generate_wordmark / compose_arabic / export_svg          | `shape-text.mjs` → self-contained SVG (no font dependency)           |
| modify_letter_spacing                                    | Forbidden on Arabic — use kashida                                    |
| modify_kashida / stretch_glyph                           | `kashida-text.mjs`, `shape-text.mjs --stretch`                       |
| get_ornament / get_arabic_svg_asset                      | `catalog.json` ornaments; `naqsh` letter SVGs                        |
| check_arabic_typography / check_rtl / validate_arabic_ui | `lint-arabic.mjs` + visual (screenshot) verification                 |

## 4. Workflows

### New decorative Arabic SVG (wordmark / heading / hero word)

1. Classify (SKILL §0) — must be type B/C/D, never A.
2. Reuse check (SKILL §1).
3. Generate: `shape-text.mjs --text … --font … --out <tmp> --metrics`.
4. Visually verify (open SVG / screenshot): joining, ligatures, diacritics, baseline, kashida intent.
5. Integrate: place final SVG in the consuming app's `public/brand/` (create if needed), `fill="currentColor"` for theming.
6. Run `lint-arabic.mjs`.

### Typography QA pass

1. `node .opencode/arabic/scripts/lint-arabic.mjs` — fix all errors.
2. Screenshot key screens (playwright/browser MCP) at desktop + mobile; confirm RTL order, no broken shaping, no clipped diacritics.

### Pro calligraphy (Kaleam)

Human designs at kaleam.com → SVG/PDF export → handoff file → agent places it
in app assets and validates. Never automate Kaleam; never claim API access.

## 5. Font strategy (curated, not Google-Fonts-browsing)

Naskh calligraphic (Amiri), Ruqaa (Aref Ruqaa), geometric Kufi display (Reem Kufi),
heavy poster (Lalezar). All OFL-1.1, commercial use allowed, sources recorded in
`catalog.json`. Prefer this set; adding a family requires license + web-use +
vector-availability records in `catalog.json`.

## 6. Quality policy (enforced by linter + review)

Correct joining, RTL order, ligatures, diacritics, baseline; intentional kashida;
no `letter-spacing` on Arabic; no presentation-form chars; no hardcoded tatweel in
UI strings; no rasterized text where vector/text fits; real text for all
functional/accessibility-critical content.

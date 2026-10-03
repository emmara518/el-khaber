# ADR-0005: Brand colour contrast — WCAG AA text ratios (decision gate)

- **Status:** Proposed — **requires CTO / brand decision** (not resolved)
- **Date:** 2026-10-03
- **Deciders:** CTO / Brand owner
- **Related:** `packages/ui-tokens/src/color.ts`, `docs/04_UI_UX.md` §3,
  Phase G accessibility hardening

## Context

The Phase G accessibility audit measured the brand token palette against
WCAG 2.2 success criterion **1.4.3 (Contrast — Minimum)**. Three token
pairs used for **normal-size text** fall below the **4.5:1** AA threshold.
All other audited pairs pass comfortably (see table below).

Measured with the WCAG relative-luminance formula (sRGB):

| Token pair                                   | Ratio | AA normal (4.5) | AA large (3.0) |
| -------------------------------------------- | ----: | :-------------: | :------------: |
| `error.DEFAULT` (#D94A4A) on `surface.base`  | 4.18  | **fail**        | pass           |
| `surface.base` (#FFFFFF) on `error.DEFAULT`  | 4.18  | **fail**        | pass           |
| `success.DEFAULT` (#2E9B5F) on `surface.base`| 3.52  | **fail**        | pass           |
| `text.secondary` (#697586) on `surface.subtle`| 4.40 | **marginal**    | pass           |

Passing references (unchanged): `text.primary` on white **16.15**,
tab labels on navy **13.4–16.5**, `gold` on `navy` **7.94**, `navy` on
`goldSoft` **13.47**, `navy` on `success.soft` **14.98**.

## Affected surfaces (small / normal-size text only)

- **Error text** — inline form errors (`role=alert`), destructive button
  labels, the delete/error affordances.
- **Success text** — the verification badge label (`type.label`, 13px),
  inline success copy.
- **Secondary text on `surface.subtle`** — captions/hints on subtle
  backgrounds (marginal, 4.40 vs 4.5).

## WCAG concern

SC 1.4.3 requires ≥ 4.5:1 for normal text and ≥ 3:1 for large text
(≥ 24px, or ≥ 18.66px **bold**). The affected usages are 12–16px, i.e.
normal text, so they fail AA by a small margin (3.52–4.18). Status is
**never conveyed by colour alone** in the product (error carries wording +
`role=alert` + border; success carries label text), so no information is
lost to a low-vision user — but the pure contrast ratio still does not meet
AA.

## Options

1. **Darken the tokens** (e.g. `error.DEFAULT` → a darker red ≈ #B3261E,
   `success.DEFAULT` → a darker green ≈ #1F7A47) to reach ≥ 4.5:1 on white.
   *Impact:* touches every error/success usage product-wide; visual brand
   shift; requires regenerating any derived assets.
2. **Introduce a separate `*Text` token** (keep `error.DEFAULT`/`success.DEFAULT`
   for fills/borders/icons; add `error.text`/`success.text` dark enough for
   AA) and switch only text usages. *Impact:* smaller visual change; two
   tokens per semantic colour; needs discipline to use the right one.
3. **Accept as documented technical debt** — rely on the non-colour status
   cues; log as P2. *Impact:* no visual change; residual AA gap for the
   ratio itself.
4. **Increase affected text to "large" size** — generally not viable for
   inline errors/labels without harming layout.

## Decision

**Not taken here.** Per Phase H rules, brand-token changes require a brand
constitution update and an explicit CTO/brand decision; colour was **not**
silently changed. This ADR records the measurement and options only.

## Compatibility implications

- Options 1–2 are additive at the token layer; both require re-running the
  Phase G contrast measurement and the visual smoke.
- `packages/ui-tokens` is consumed by mobile, admin and landing; a token
  change ripples to all three.

## Status / release gate

- If release policy requires AA-passing contrast for all text → **RELEASE
  BLOCKER (Brand/CTO)**.
- Otherwise → **accepted technical debt (P2)**, tracked here, do not change
  tokens without this ADR being moved to *Accepted*.

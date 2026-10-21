/**
 * EL-KHABIR — Customer typography system (single source of truth).
 *
 * Two families, strictly scoped:
 *
 *  • DISPLAY — `Aref Graffiti` in the approved reference. It is used ONLY for
 *    major hero / brand headlines (never body, buttons, nav, forms, chat,
 *    metadata or dense data).
 *  • UI — `Alexandria` for everything else: headings, card titles, body,
 *    labels, buttons, navigation, status, numbers and data.
 *
 * ── FONT AVAILABILITY (2026-09-23) ─────────────────────────────────────
 *  `Alexandria` (OFL-1.1) is bundled in `src/assets/fonts/Alexandria/`.
 *  `Aref Graffiti` is NOT licensed for redistribution: it is absent from
 *  the Google Fonts OFL repository and third-party mirrors list no license,
 *  so it cannot legally be shipped. Per the master task ("never download
 *  random font copies and assume licensing"), the DISPLAY role is wired to
 *  the OFL-1.1 `Aref Ruqaa` (same designer family, already approved in the
 *  repo) as a documented provisional stand-in. Swap `fontFamily.display`
 *  and replace the file in `src/assets/fonts/ArefRuqaa/` when a licensed
 *  Aref Graffiti asset is supplied.
 * ───────────────────────────────────────────────────────────────────────
 *
 * Because each weight is a separate file, the weight is encoded in the
 * family name and presets deliberately do NOT set `fontWeight` (setting it
 * would trigger synthetic/faux bold on top of the real weight on Android).
 *
 * Arabic letter-spacing is never used — presets carry no `letterSpacing`.
 */

import type { TextStyle } from 'react-native';

/** Runtime family keys registered by `useAppFonts()` (see `./fonts`). */
export const fontFamily = {
  /** Provisional Aref Graffiti stand-in — display headlines only. */
  display: 'ArefRuqaa-Bold',
  displayRegular: 'ArefRuqaa-Regular',
  regular: 'Alexandria-Regular',
  medium: 'Alexandria-Medium',
  semibold: 'Alexandria-SemiBold',
  bold: 'Alexandria-Bold',
  extraBold: 'Alexandria-ExtraBold',
} as const;

export type FontFamilyKey = keyof typeof fontFamily;

/**
 * Semantic type ladder. Each preset is a partial `TextStyle` spread into a
 * component's style array — callers keep ownership of colour, alignment and
 * `writingDirection`.
 */
export const type = {
  /** Major hero / brand statement only (Aref Graffiti slot). */
  display: { fontFamily: fontFamily.display, fontSize: 27, lineHeight: 44 },
  /** Page-level title. */
  h1: { fontFamily: fontFamily.extraBold, fontSize: 26, lineHeight: 38 },
  /** Large heading / hero supporting headline. */
  h2: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 32 },
  /** Section heading. */
  h3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 28 },
  /** Card title. */
  cardTitle: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  /** Default body copy. */
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 24 },
  /** Emphasised body copy. */
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 24 },
  /** Small label / metadata. */
  label: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 20 },
  /** Button / CTA label. */
  button: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  /** Supporting / caption text. */
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  /** Bottom-navigation label. */
  navigation: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 16 },
  /** Numeric emphasis (ratings, counts, prices). */
  number: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24 },
} as const satisfies Record<string, TextStyle>;

export type TypeRole = keyof typeof type;

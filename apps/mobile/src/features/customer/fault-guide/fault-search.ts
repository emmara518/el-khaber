/**
 * Fault Guide text search — pure, deterministic, additive.
 *
 * Scope: searches the ALREADY-LOADED published symptoms (title + summary).
 * It is a text search only; it does not claim structured error-code
 * support. A code-like string is found only when it literally exists in
 * the published title/summary content.
 *
 * Arabic normalization (deliberately limited, documented):
 *   - removes tashkeel/tanween and Quranic marks (U+0610–U+061A,
 *     U+064B–U+065F, U+0670, U+06D6–U+06ED),
 *   - removes tatweel/kashida (U+0640),
 *   - unifies alef forms: آ أ إ ٱ → ا (U+0622/U+0623/U+0625/U+0671 → U+0627),
 *   - collapses whitespace and lowercases Latin letters (e.g. model names).
 *
 * NOT normalized on purpose (to avoid false positives):
 *   - ta marbuta ة ↔ ه, alef maqsura ى ↔ ي, Arabic-Indic digits ↔ ASCII.
 */

import type { FaultSymptom } from './fault-guide-types';

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g;

export function normalizeArabicForSearch(value: string): string {
  return value
    .replace(TASHKEEL, '')
    .replace(TATWEEL, '')
    .replace(ALEF_VARIANTS, '\u0627')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Every query token must appear in the haystack (order-independent). */
export function matchesArabicQuery(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeArabicForSearch(query);
  if (normalizedQuery.length === 0) return false;
  const normalizedHaystack = normalizeArabicForSearch(haystack);
  return normalizedQuery.split(' ').every((token) => normalizedHaystack.includes(token));
}

/**
 * Search across all appliances. Returns matches in the guide's original
 * order (no invented ranking). Empty/whitespace query → no results.
 */
export function searchFaultSymptoms(
  symptoms: ReadonlyArray<FaultSymptom>,
  query: string,
): ReadonlyArray<FaultSymptom> {
  if (normalizeArabicForSearch(query).length === 0) return [];
  return symptoms.filter((symptom) =>
    matchesArabicQuery(`${symptom.titleAr} ${symptom.summaryAr ?? ''}`, query),
  );
}

/**
 * Arabic display formatting for API timestamps/numbers (Task 10J).
 *
 * Real API data arrives as ISO-8601 timestamps; the existing screens
 * render Arabic-relative labels ("اليوم ٢:٠٥ م"). Formatting is a pure
 * adapter concern — presentation code never formats raw API values.
 * Uses Intl with an 'ar' locale (Arabic-Indic digits) and falls back to
 * a plain deterministic rendering when Intl is unavailable.
 */

const LOCALE = 'ar-EG';

function safeFormat(date: Date, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(LOCALE, options).format(date);
  } catch {
    // Deterministic fallback (no locale data available).
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

/** 12 → '١٢' (Arabic-Indic digits for display copy). */
export function toArabicDigits(value: number): string {
  return String(value)
    .split('')
    .map((ch) => (ch >= '0' && ch <= '9' ? ARABIC_DIGITS[Number(ch)] : ch))
    .join('');
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** '٢:٠٥ م' — clock time only. */
export function formatArTime(iso: string): string {
  return safeFormat(new Date(iso), { hour: 'numeric', minute: '2-digit' });
}

/** '٢٠ سبتمبر' — day + month name. */
export function formatArDate(iso: string): string {
  return safeFormat(new Date(iso), { day: 'numeric', month: 'long' });
}

/** 'اليوم ٢:٠٥ م' / 'غدًا ٩:٠٠ ص' / '٢٠ سبتمبر ٢:٠٥ م'. */
export function formatArDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  const time = formatArTime(iso);
  if (diffDays === 0) return `اليوم ${time}`;
  if (diffDays === 1) return `غدًا ${time}`;
  if (diffDays === -1) return `أمس ${time}`;
  return `${formatArDate(iso)} ${time}`;
}

/** Year component for "عضو منذ …" style copy. */
export function formatArYear(iso: string): string {
  const year = new Date(iso).getFullYear();
  if (Number.isNaN(year)) return '';
  return toArabicDigits(year);
}

/** Local-calendar "is this timestamp today?" (counter derivation). */
export function isToday(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

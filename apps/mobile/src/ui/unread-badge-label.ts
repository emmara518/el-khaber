/**
 * Pure unread-count label rule, kept out of the RN component so it is
 * unit-testable without a renderer: ASCII numerals with "99+" saturation by
 * default, or the caller's formatter (e.g. Arabic-Indic) when provided.
 */
export function unreadBadgeLabel(count: number, format?: (count: number) => string): string {
  if (format) return format(count);
  return count > 99 ? '99+' : String(count);
}

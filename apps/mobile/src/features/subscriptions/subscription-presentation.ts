/**
 * Arabic-first subscription presentation (WP-6B).
 *
 * Maps backend technical values to user-facing Arabic WITHOUT ever exposing
 * raw codes (currency codes, interval enums, entitlement codes, lifecycle
 * identifiers). Only values with an approved Arabic copy are mapped; unknown
 * values are OMITTED from the rendered string — never shown raw.
 *
 * Approved mappings (CTO WP-6B):
 *   currency  EGP → "جنيه مصري"
 *   interval  month/monthly → "شهري", year/yearly/annual → "سنوي"
 *
 * Entitlement codes have no Arabic copy exposed by the API and are therefore
 * never rendered (see the subscription screen).
 */

const CURRENCY_AR: Readonly<Record<string, string>> = {
  EGP: 'جنيه مصري',
};

const INTERVAL_AR: Readonly<Record<string, string>> = {
  month: 'شهري',
  monthly: 'شهري',
  year: 'سنوي',
  yearly: 'سنوي',
  annual: 'سنوي',
};

/** Arabic label for a currency code, or null when no approved copy exists. */
export function currencyLabelAr(currency: string): string | null {
  return CURRENCY_AR[currency.trim().toUpperCase()] ?? null;
}

/** Arabic label for a billing interval, or null when no approved copy exists. */
export function intervalLabelAr(interval: string): string | null {
  return INTERVAL_AR[interval.trim().toLowerCase()] ?? null;
}

/**
 * Arabic price line (e.g. "199 جنيه مصري · شهري"). Unmapped currency and
 * interval tokens are omitted entirely so raw codes never reach the UI.
 */
export function priceLineAr(price: number, currency: string, interval: string): string {
  const currencyAr = currencyLabelAr(currency);
  const intervalAr = intervalLabelAr(interval);
  const parts: string[] = [currencyAr !== null ? `${String(price)} ${currencyAr}` : String(price)];
  if (intervalAr !== null) parts.push(intervalAr);
  return parts.join(' · ');
}

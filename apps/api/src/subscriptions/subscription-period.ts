/**
 * Subscription billing period — SINGLE source of truth.
 *
 * PROVISIONAL (CTO ratification required): docs/08_SUBSCRIPTIONS.md does
 * not define a billing-period duration; the seeded plans use
 * `billingInterval = 'monthly'`. 30 days is a provisional engineering
 * default. Centralized here (remediation REM-004 follow-up) so the value
 * is defined exactly once and can be swapped for approved policy/config.
 */

/** Provisional period length in days pending CTO ratification. */
export const PROVISIONAL_PERIOD_DAYS = 30;

/** Computes the period end from a start instant. */
export function provisionalPeriodEnd(start: Date): Date {
  return new Date(start.getTime() + PROVISIONAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
}

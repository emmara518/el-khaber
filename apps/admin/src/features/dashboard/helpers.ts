/**
 * Pure display helpers for the admin console.
 */

import { STATUS_AR } from './constants';

export const roleCan = (role: string, allowed: ReadonlyArray<string>): boolean =>
  allowed.includes(role);

export function statusLabel(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '—';
  return STATUS_AR[value] ?? value;
}

export function formatCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn' }).format(value)
    : '—';
}

/** Arabic date with western numerals, fixed day/month/year ordering. */
export function formatDateAr(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

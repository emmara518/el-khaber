/**
 * EL-KHABIR — Password Reset Delivery Worker (pure contract logic).
 *
 * Framework-free, runtime-free helpers so the security/reachability rules
 * are unit-testable without the Cloudflare runtime. The Worker entrypoint
 * (`index.ts`) is the only place that talks to providers.
 *
 * This module MUST NOT import any Cloudflare or Node-only API.
 */

/** Incoming application contract (POST body). */
export interface DeliveryRequest {
  readonly purpose: 'password_reset';
  readonly contact: { phone?: string | null; email?: string | null };
  readonly token: string;
}

export type Channel = 'email';

export const MAX_BODY_BYTES = 4096;
export const RESET_PATH = '/reset-password';

/** Length-bounded, conservative email shape (deliverability is the provider's job). */
export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

/**
 * E.164-ish Egyptian/international mobile. Kept so phone-only payloads are
 * still SCHEMA-valid (the account model supports phone-only), but SMS
 * delivery is DEFERRED — routing never selects a phone channel.
 */
export function isValidPhone(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value.trim());
}

/**
 * UAT routing (email-only, CTO decision): a valid email is the ONLY
 * supported channel. A phone-only payload returns null → the Worker answers
 * with a generic unsupported-delivery result. SMS is DEFERRED — never routed.
 */
export function routeContact(contact: DeliveryRequest['contact']): Channel | null {
  if (contact !== null && typeof contact === 'object' && isValidEmail(contact.email)) {
    return 'email';
  }
  return null;
}

/** Parse + validate the incoming JSON against the fixed contract. */
export function parseDeliveryRequest(raw: string): { ok: true; value: DeliveryRequest } | { ok: false } {
  if (raw.length === 0 || raw.length > MAX_BODY_BYTES) {
    return { ok: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj['purpose'] !== 'password_reset') {
    return { ok: false };
  }
  // The API issues 48-byte base64url tokens (64 chars) via `generateOpaqueToken`.
  // Require the SAME shape here so a weak, guessable, or placeholder value
  // (e.g. a manual test string) can never be turned into a clickable reset
  // link, even if the Worker is called directly with a valid bearer token.
  const token = obj['token'];
  if (
    typeof token !== 'string' ||
    token.length < 20 ||
    token.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return { ok: false };
  }
  const contact = obj['contact'];
  if (contact === null || typeof contact !== 'object') {
    return { ok: false };
  }
  const c = contact as Record<string, unknown>;
  const email = typeof c['email'] === 'string' ? c['email'] : null;
  const phone = typeof c['phone'] === 'string' ? c['phone'] : null;
  if (!isValidEmail(email) && !isValidPhone(phone)) {
    return { ok: false };
  }
  return { ok: true, value: { purpose: 'password_reset', contact: { email, phone }, token } };
}

/**
 * Build the reset link from a FIXED, server-configured origin. The incoming
 * request can never influence the origin (no open redirect).
 */
export function buildResetLink(webOrigin: string, token: string): string {
  const origin = webOrigin.replace(/\/+$/, '');
  return `${origin}${RESET_PATH}?token=${encodeURIComponent(token)}`;
}

/**
 * Constant-time string comparison (no early exit on mismatch) for the
 * shared Worker bearer token.
 */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Extract the bearer token from an Authorization header value. */
export function bearerFrom(header: string | null): string | null {
  if (header === null) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match === null ? null : match[1].trim();
}

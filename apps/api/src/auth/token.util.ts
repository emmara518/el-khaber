/**
 * Opaque token generation and hashing. Tokens are produced with
 * `crypto.randomBytes` (CSPRNG) and stored only as a SHA-256 hash.
 * The raw token is returned to the caller exactly once.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6, §11; docs/10_ENGINEERING_RULES.md §24.
 */

import { createHash, randomBytes } from 'node:crypto';

export function generateOpaqueToken(byteLength = 48): string {
  return randomBytes(byteLength).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Zero-runtime-logic constants for the canonical API contract.
 * The companion TYPES live in `./generated/api-contract.ts` and are
 * generated from `docs/api/openapi.yaml` via `scripts/gen-types.ts`
 * (ADR-0003) — never hand-edited.
 *
 * Source of truth: docs/07_API.md §3, §19, §21.
 */

/** Roles as defined in docs/01_PROJECT.md §2 and docs/10_ENGINEERING_RULES.md §14. */
export const ROLE = {
  customer: 'customer',
  technician: 'technician',
  merchant: 'merchant',
} as const;

/** Account status enum. Source: docs/06_DATABASE.md §2. */
export const USER_STATUS = {
  active: 'active',
  suspended: 'suspended',
  pending: 'pending',
  deleted: 'deleted',
} as const;

/** Canonical error codes from docs/07_API.md §21. */
export const ERROR_CODE = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  ENTITLEMENT_REQUIRED: 'ENTITLEMENT_REQUIRED',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  UPLOAD_REJECTED: 'UPLOAD_REJECTED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Standard list metadata builder (docs/07_API.md §19).
 * `page`/`limit` are the server-normalized values (after the max-limit
 * clamp), `total` is the server-authoritative count, `totalPages` is
 * `ceil(total / limit)`, and `hasNext` reports whether another page
 * exists. Clients must never compute totals themselves.
 */
export function buildPageMeta(
  page: number,
  limit: number,
  total: number,
): { page: number; limit: number; total: number; totalPages: number; hasNext: boolean } {
  const safeLimit = Math.max(1, Math.floor(limit));
  const totalPages = Math.max(0, Math.ceil(total / safeLimit));
  return {
    page,
    limit: safeLimit,
    total,
    totalPages,
    hasNext: page < totalPages,
  };
}

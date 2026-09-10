/**
 * AUTO-GENERATED from docs/api/openapi.yaml via scripts/gen-types.ts
 * (ADR-0003). DO NOT EDIT — regenerate with:
 *
 *   pnpm gen:openapi && pnpm gen:types
 *
 * Contract source of truth: docs/07_API.md.
 */

/**
 * Opaque acceptance marker. Reveals nothing about account existence.
 */
export interface AcceptedDto {
  accepted: 'true';
}

/**
 * List metadata (docs/07_API.md §19). The server normalizes page/limit (max server-enforced limit: 100) and computes total/totalPages/hasNext. Clients must never derive totals themselves.
 */
export interface ApiMeta {
  hasNext?: boolean;
  limit?: number;
  page?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

/**
 * Authentication session. The refresh token is returned exactly once per issuance/rotation.
 */
export interface AuthSessionDto {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: AuthUserDto;
}

/**
 * Public user record. Never includes credentials.
 */
export interface AuthUserDto {
  createdAt: string;
  email: string | null;
  emailVerified: boolean;
  id: string;
  phone: string | null;
  phoneVerified: boolean;
  role: Role;
  status: UserStatus;
}

export type ErrorCode = 'AUTH_REQUIRED' | 'AUTH_INVALID' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'RATE_LIMITED' | 'SUBSCRIPTION_REQUIRED' | 'ENTITLEMENT_REQUIRED' | 'INVALID_STATE_TRANSITION' | 'UPLOAD_REJECTED' | 'INTERNAL_ERROR';

/**
 * Canonical error envelope (docs/07_API.md §3).
 */
export interface ErrorResponse {
  error: { code: ErrorCode; fields?: Record<string, string>; message: string };
}

/**
 * Liveness payload (process-level only, no dependency checks).
 */
export interface HealthDto {
  service: 'api';
  status: 'ok';
}

export type MeDto = AuthUserDto;

/**
 * Readiness payload with per-dependency check results.
 */
export interface ReadyDto {
  checks: { database: 'ok' };
  status: 'ready';
}

export type Role = 'customer' | 'technician' | 'merchant';

/**
 * PATCH /me payload (docs/07_API.md §5). Only shared contact fields are writable. Changing a contact channel resets that channel's verification flag.
 */
export interface UpdateMeDto {
  email?: string;
  phone?: string;
}

export type UserStatus = 'active' | 'suspended' | 'pending' | 'deleted';

// -----------------------------------------------------------------------------
// Structural envelopes. These are language-level generics and cannot be
// expressed in OpenAPI; their wire shape is documented in docs/07_API.md §3.
// -----------------------------------------------------------------------------

/** Standard success envelope. */
export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

/** Canonical error envelope. */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

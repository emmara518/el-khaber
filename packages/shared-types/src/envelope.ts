/**
 * Envelope and error codes are defined here as zero-runtime constants
 * because they are referenced by both the API and every client at the
 * type level. Domain DTOs will be added in later tasks via codegen.
 *
 * Source of truth: docs/07_API.md §3, §21.
 */

/** Roles as defined in docs/01_PROJECT.md §2 and docs/10_ENGINEERING_RULES.md §14. */
export const ROLE = {
  customer: 'customer',
  technician: 'technician',
  merchant: 'merchant',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Account status enum. Source: docs/06_DATABASE.md §2. */
export const USER_STATUS = {
  active: 'active',
  suspended: 'suspended',
  pending: 'pending',
  deleted: 'deleted',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

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

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/** Standard success envelope. */
export interface ApiSuccess<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasNext?: boolean;
  [key: string]: unknown;
}

/** Standard error envelope. */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// -----------------------------------------------------------------------------
// Auth DTOs (Task #002). Source: docs/07_API.md §4, §5.
// -----------------------------------------------------------------------------

/** Public user record. Never includes credentials. */
export interface AuthUserDto {
  id: string;
  role: Role;
  status: UserStatus;
  phone: string | null;
  email: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
}

/** Authentication session returned to the client. */
export interface AuthSessionDto {
  accessToken: string;
  /** Opaque refresh token. The client stores it in SecureStore / httpOnly cookie.
   *  The server never returns a refresh token after the raw value is set; on
   *  rotation the client receives a new pair. */
  refreshToken: string;
  expiresIn: number;
  user: AuthUserDto;
}

export type MeDto = AuthUserDto;


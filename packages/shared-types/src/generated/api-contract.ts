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
 * Active appliance category (customer-facing reference data).
 */
export interface ApplianceCategoryDto {
  iconUrl: string | null;
  id: string;
  imageUrl: string | null;
  nameAr: string;
  slug: string;
  sortOrder: number;
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
 * Published fault-guide content. Guidance is advisory ("قد يكون...") — never diagnostic certainty; safety notes and technician escalation are part of the content contract.
 */
export interface FaultDto {
  applianceCategoryId: string;
  guidanceAr: string;
  id: string;
  nameAr: string;
  safetyNoteAr: string | null;
  severityLevel: string | null;
  slug: string;
  summaryAr: string;
  updatedAt: string;
  whenToCallTechnicianAr: string | null;
}

/**
 * Published fault-guide list item (summary fields only).
 */
export interface FaultSummaryDto {
  applianceCategoryId: string;
  id: string;
  nameAr: string;
  severityLevel: string | null;
  slug: string;
  sortOrder: number;
  summaryAr: string;
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
 * Active service/specialty catalog entry.
 */
export interface ServiceDto {
  applianceCategoryId: string;
  descriptionAr: string | null;
  id: string;
  nameAr: string;
  slug: string;
}

export type TechnicianAvailabilityStatus = 'available' | 'busy' | 'unavailable';

/**
 * Public technician profile for discovery/detail. Only verified technicians are publicly visible. Excludes authentication data, private contact data, and internal moderation state.
 */
export interface TechnicianPublicDto {
  availabilityStatus: TechnicianAvailabilityStatus;
  avatarUrl: string | null;
  bio: string | null;
  completedServicesCount: number;
  displayName: string | null;
  experienceYears: number;
  id: string;
  ratingAverage: number | null;
  ratingCount: number;
  services: Array<TechnicianServiceDto>;
  verificationStatus: VerificationStatus;
}

/**
 * A service/specialty offered by a technician (active only).
 */
export interface TechnicianServiceDto {
  service: ServiceDto;
}

/**
 * PATCH /me payload (docs/07_API.md §5). Only shared contact fields are writable. Changing a contact channel resets that channel's verification flag.
 */
export interface UpdateMeDto {
  email?: string;
  phone?: string;
}

export type UserStatus = 'active' | 'suspended' | 'pending' | 'deleted';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

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

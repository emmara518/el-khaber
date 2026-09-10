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

/**
 * Customer request creation payload (docs/07_API.md §7). problem_title is OPTIONAL (Task 10B CTO decision 2) and supports the "other problem" case without inventing diagnostic conclusions. The request is created with status=pending, targeted at the chosen verified technician.
 */
export interface CreateServiceRequestDto {
  appliance_category_id: string;
  fault_id?: string;
  location_id: string;
  problem_description: string;
  problem_title?: string;
  scheduled_at?: string;
  service_id?: string;
  technician_id: string;
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

/**
 * Role-scoped request detail. The request location (job information) is included for the customer owner and the targeted/assigned technician. Status history is bounded and append-only.
 */
export interface ServiceRequestDto {
  acceptedAt: string | null;
  applianceCategoryId: string;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  faultId: string | null;
  history: Array<ServiceRequestStatusHistoryDto>;
  id: string;
  location: { addressText: string | null; city: string | null; label: string | null; latitude: number; longitude: number; region: string | null };
  problemDescription: string;
  problemTitle: string | null;
  scheduledAt: string | null;
  serviceId: string | null;
  startedAt: string | null;
  status: ServiceRequestStatus;
  technicianId: string | null;
  updatedAt: string;
}

export type ServiceRequestStatus = 'pending' | 'accepted' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Append-only status transition record (docs/07_API.md §13).
 */
export interface ServiceRequestStatusHistoryDto {
  changedByUserId: string | null;
  createdAt: string;
  fromStatus: ServiceRequestStatus | null;
  id: string;
  toStatus: ServiceRequestStatus;
}

/**
 * Role-scoped service-request list item.
 */
export interface ServiceRequestSummaryDto {
  applianceCategoryId: string;
  createdAt: string;
  faultId: string | null;
  id: string;
  problemDescription: string;
  problemTitle: string | null;
  scheduledAt: string | null;
  serviceId: string | null;
  status: ServiceRequestStatus;
  technicianId: string | null;
  updatedAt: string;
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

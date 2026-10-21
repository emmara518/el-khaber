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
 * Admin technician assignment result (WP-Admin-03).
 */
export interface AdminAssignResultDto {
  [key: string]: unknown;
}

/**
 * Admin manual grant result (subscription or entitlement grant).
 */
export interface AdminGrantResultDto {
  code?: string | null;
  entitlementId?: string | null;
  id: string;
  planId?: string | null;
  status?: string | null;
  userId: string;
}

/**
 * Admin merchant list item read model.
 */
export interface AdminMerchantDto {
  [key: string]: unknown;
}

/**
 * Admin metrics read model.
 */
export interface AdminMetricsDto {
  [key: string]: unknown;
}

/**
 * Admin operational notification creation result.
 */
export interface AdminNotificationResultDto {
  id: string;
  type: string;
  userId: string;
}

/**
 * Admin review list item read model.
 */
export interface AdminReviewDto {
  [key: string]: unknown;
}

/**
 * Admin review removal result.
 */
export interface AdminReviewRemoveResultDto {
  [key: string]: unknown;
}

/**
 * Admin service-request list item read model.
 */
export interface AdminServiceRequestDto {
  [key: string]: unknown;
}

/**
 * Admin service-request status override result.
 */
export interface AdminStatusOverrideResultDto {
  [key: string]: unknown;
}

/**
 * Admin technician list item read model.
 */
export interface AdminTechnicianDto {
  [key: string]: unknown;
}

/**
 * Admin user detail read model.
 */
export interface AdminUserDetailDto {
  [key: string]: unknown;
}

/**
 * Admin user list item read model.
 */
export interface AdminUserDto {
  [key: string]: unknown;
}

/**
 * Admin verification decision result.
 */
export interface AdminVerificationResultDto {
  [key: string]: unknown;
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
 * Audit log entry read model.
 */
export interface AuditLogDto {
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
  avatarUrl: string | null;
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
 * WP-01: profile-image upload result (POST /me/avatar, POST /technician/profile/avatar). `avatarUrl` is the server-issued stable public URL persisted on the caller's profile — never a storage key or client-supplied link.
 */
export interface AvatarUploadDto {
  avatarUrl: string;
}

/**
 * A conversation scoped to EITHER a service request (customer ↔ technician) OR a product (initiator ↔ merchant). Exactly one of serviceRequestId / productId is set; requestStatus is present only for service-request conversations.
 */
export interface ConversationDto {
  createdAt: string;
  id: string;
  productId: string | null;
  requestStatus: ServiceRequestStatus | null;
  serviceRequestId: string | null;
}

/**
 * A conversation the caller participates in (unified inbox). peerNameAr is the other party (real display/business name where available, generic role label otherwise — never invented); peerAvatarUrl is their public profile image (null when absent). lastMessageAr/lastMessageAt are the real latest message (null when none); unreadCount counts messages not sent by the caller and not yet read; contextTitleAr is the order title or product name.
 */
export interface ConversationSummaryDto {
  contextTitleAr: string | null;
  id: string;
  lastMessageAr: string | null;
  lastMessageAt: string | null;
  peerAvatarUrl: string | null;
  peerNameAr: string;
  productId: string | null;
  serviceRequestId: string | null;
  unreadCount: number;
  updatedAt: string;
}

/**
 * POST /merchant/products payload. Ownership is derived from the JWT. `slug` is optional — server-derived from nameAr (unique per merchant). price may be null; no currency/discount/tax semantics exist.
 */
export interface CreateMerchantProductDto {
  descriptionAr?: string;
  imageUrl?: string;
  nameAr: string;
  price?: number;
  slug?: string;
  status?: 'active' | 'suspended';
  stockQuantity?: number;
}

/**
 * POST /subscriptions payload: manual payment submission (Task 10I). MVP methods: instapay | vodafone_cash. The submission stays PENDING until ADMIN approval; user input is never authoritative. proof_storage_key is a typed reference reserved for the future media task.
 */
export interface CreatePaymentSubmissionDto {
  method: 'instapay' | 'vodafone_cash';
  plan_id: string;
  proof_storage_key?: string;
  transfer_reference: string;
}

/**
 * POST /service-requests/:id/review payload. Eligibility is documented: the request owner, after completion, one review per request. Tags must reference seeded/documented review tags.
 */
export interface CreateReviewDto {
  comment?: string;
  rating: number;
  tag_ids?: Array<string>;
}

/**
 * Customer request creation payload (docs/07_API.md §7). problem_title is OPTIONAL (Task 10B CTO decision 2) and supports the "other problem" case without inventing diagnostic conclusions. The request is created with status=pending, targeted at the chosen verified technician. scheduled_at is an OPTIONAL PREFERRED visit time (future, up to 14 days ahead): there is no availability engine and no booking is created — the technician confirms the visit by phone.
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

/**
 * POST /technician/services payload (attach a catalog service).
 */
export interface CreateTechnicianServiceDto {
  price_from?: number;
  service_id: string;
}

/**
 * The principal current subscription with its plan (null when none).
 */
export interface CurrentSubscriptionDto {
  cancelledAt: string | null;
  createdAt: string;
  currentPeriodEnd: string;
  currentPeriodStart: string;
  id: string;
  plan: { billingInterval: string; code: string; currency: string; id: string; isActive: boolean; nameAr: string; nameEn: string | null; price: number; role: 'customer' | 'technician' | 'merchant' };
  renewalEnabled: boolean;
  startedAt: string;
  status: 'active' | 'pending' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
}

export type ErrorCode = 'AUTH_REQUIRED' | 'AUTH_INVALID' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'RATE_LIMITED' | 'SUBSCRIPTION_REQUIRED' | 'ENTITLEMENT_REQUIRED' | 'INVALID_STATE_TRANSITION' | 'UPLOAD_REJECTED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';

/**
 * Canonical error envelope (docs/07_API.md §3).
 */
export interface ErrorResponse {
  error: { code: ErrorCode; fields?: Record<string, string>; message: string; requestId?: string };
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

/**
 * User-owned location (docs/07_API.md §8, docs/06_DATABASE.md §6). Coordinates are optional (label/address-only locations are valid).
 */
export interface LocationDto {
  addressText: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  id: string;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  updatedAt: string;
}

export type MeDto = AuthUserDto;

/**
 * GET /me/entitlements (docs/07 §15): effective entitlement codes.
 */
export interface MeEntitlementsDto {
  entitlements: Array<string>;
}

/**
 * GET /me/subscription: current subscription + effective entitlement codes.
 */
export interface MeSubscriptionDto {
  entitlements: Array<string>;
  subscription: CurrentSubscriptionDto | null;
}

/**
 * WP-01: store-logo upload result (POST /merchant/profile/logo). `logoUrl` is the server-issued stable public URL persisted on the caller's merchant profile — never a storage key or client-supplied link.
 */
export interface MerchantLogoUploadDto {
  logoUrl: string;
}

/**
 * A merchant-owned catalog product (status: active | suspended).
 */
export interface MerchantProductDto {
  createdAt: string;
  descriptionAr: string | null;
  id: string;
  imageUrl: string | null;
  merchantId: string;
  nameAr: string;
  price: number | null;
  slug: string;
  status: 'active' | 'suspended';
  stockQuantity: number | null;
  updatedAt: string;
}

/**
 * The authenticated merchant's own profile. verificationStatus is READ-ONLY (docs/09_ADMIN.md — admin is the verification authority). A missing profile returns 404 until the merchant PATCHes (onboarding).
 */
export interface MerchantProfileDto {
  bio: string | null;
  businessName: string | null;
  contactPhone: string | null;
  createdAt: string;
  id: string;
  locationId: string | null;
  logoUrl: string | null;
  updatedAt: string;
  verificationStatus: VerificationStatus;
}

/**
 * Chat message. Ordered newest-first for pagination; the client adapter may reverse for display. readAt exists in the model but no mark-read route is documented (deferred).
 */
export interface MessageDto {
  body: string;
  conversationId: string;
  createdAt: string;
  id: string;
  messageType: 'text';
  senderUserId: string;
}

/**
 * A persisted notification for the authenticated recipient. 	type is an open string until product trigger types are ratified; no delivery provider exists (persistence + read APIs only).
 */
export interface NotificationDto {
  bodyAr: string;
  createdAt: string;
  dataJson: Record<string, unknown> | null;
  id: string;
  readAt: string | null;
  titleAr: string;
  type: string;
}

/**
 * Own notification delivery preferences (WP-Notifications). Only the two USER-TOGGLABLE families exist as keys: requestStatus (maintenance request updates) and subscription (subscription + payment-review updates). Verification decisions + admin operational messages are MANDATORY and have no key. Absent row ≡ all true.
 */
export interface NotificationPreferencesDto {
  requestStatus: boolean;
  subscription: boolean;
}

export type PaymentApprovalResultDto = PaymentReviewResultDto;

/**
 * Admin-managed manual payment destination (method + account + display name).
 */
export interface PaymentMethodConfigDto {
  accountIdentifier: string;
  displayName: string;
  isEnabled: boolean;
  method: 'instapay' | 'vodafone_cash';
}

export type PaymentRejectResultDto = PaymentReviewResultDto;

/**
 * Admin approval/rejection result payload.
 */
export interface PaymentReviewResultDto {
  id: string;
  status: 'approved' | 'rejected';
  subscriptionId?: string | null;
}

/**
 * Manual payment submission (pending → approved | rejected by ADMIN only).
 */
export interface PaymentSubmissionDto {
  createdAt: string;
  id: string;
  method: 'instapay' | 'vodafone_cash';
  planId: string;
  proofStorageKey: string | null;
  reviewedAt: string | null;
  status: 'pending' | 'approved' | 'rejected';
  subscriptionId: string | null;
  transferReference: string;
  updatedAt: string;
  userId: string;
}

/**
 * Admin presigned download grant for a submission proof.
 */
export interface ProofDownloadUrlDto {
  downloadUrl: string;
  expiresInSeconds: number;
  storageKey: string;
  submissionId: string;
}

/**
 * Presigned PUT grant for a server-generated proof storage key.
 */
export interface ProofUploadUrlDto {
  expiresInSeconds: number;
  maxBytes: number;
  mimeType: string;
  requiredHeaders?: Record<string, string>;
  storageKey: string;
  submissionId: string;
  uploadUrl: string;
}

/**
 * Minimal public merchant identity attached to a store product. No contact/verification/internal fields are exposed.
 */
export interface PublicMerchantRefDto {
  businessNameAr: string | null;
}

/**
 * Publicly readable merchant product (store). Only ACTIVE products are exposed; suspended products are excluded from lists and 404 on detail. No merchant-management or inventory fields are exposed.
 */
export interface PublicProductDto {
  descriptionAr: string | null;
  id: string;
  imageUrl: string | null;
  merchant: PublicMerchantRefDto;
  nameAr: string;
  price: number | null;
  slug: string;
}

/**
 * Result of marking all own notifications read.
 */
export interface ReadAllResultDto {
  updated: number;
}

/**
 * Readiness payload with per-dependency check results.
 */
export interface ReadyDto {
  checks: { database: 'ok' };
  status: 'ready';
}

/**
 * Public review for technician discovery. Only documented public fields: no customer identifiers, no moderation state.
 */
export interface ReviewSummaryDto {
  comment: string | null;
  createdAt: string;
  id: string;
  rating: number;
  tags: Array<string>;
}

/**
 * Canonical review tag (docs/06 §14). The UUID is the canonical identifier; labels are configured product data, never hardcoded in clients.
 */
export interface ReviewTagDto {
  id: string;
  labelAr: string;
}

export type Role = 'customer' | 'technician' | 'merchant';

/**
 * POST /conversations/:id/messages payload. Text content only � attachment types require storage infrastructure (later task). The sender is derived from the verified JWT, never from the payload.
 */
export interface SendMessageDto {
  body: string;
}

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
  location: { addressText: string | null; city: string | null; label: string | null; latitude: number | null; longitude: number | null; region: string | null };
  problemDescription: string;
  problemTitle: string | null;
  scheduledAt: string | null;
  serviceId: string | null;
  startedAt: string | null;
  status: ServiceRequestStatus;
  technicianId: string | null;
  updatedAt: string;
}

/**
 * Attached photo metadata for a service request. Binaries live in private object storage; storage keys are never exposed to clients.
 */
export interface ServiceRequestMediaDto {
  createdAt: string;
  fileSize: number;
  id: string;
  mimeType: string;
}

/**
 * Presigned PUT grant for a server-generated service-request media key. The key lives under `request-media/{userId}/{requestId}/` and is never chosen by the client (Track B2).
 */
export interface ServiceRequestMediaUploadUrlDto {
  expiresInSeconds: number;
  maxBytes: number;
  mimeType: string;
  requestId: string;
  requiredHeaders?: Record<string, string>;
  storageKey: string;
  uploadUrl: string;
}

/**
 * Short-lived presigned download grant for one request photo.
 */
export interface ServiceRequestMediaUrlDto {
  downloadUrl: string;
  expiresInSeconds: number;
  mediaId: string;
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
 * Role-scoped service-request list item. Includes the job-location summary (label/addressText/city) so list views need no per-row detail fetch. The list is role-scoped, so the location is only returned to the request owner and the targeted/assigned technician.
 */
export interface ServiceRequestSummaryDto {
  applianceCategoryId: string;
  createdAt: string;
  faultId: string | null;
  id: string;
  location: { addressText: string | null; city: string | null; label: string | null };
  problemDescription: string;
  problemTitle: string | null;
  scheduledAt: string | null;
  serviceId: string | null;
  status: ServiceRequestStatus;
  technicianId: string | null;
  updatedAt: string;
}

/**
 * Active subscription plan (role-aware, docs/08 §3).
 */
export interface SubscriptionPlanDto {
  billingInterval: string;
  code: string;
  currency: string;
  id: string;
  isActive: boolean;
  nameAr: string;
  nameEn: string | null;
  price: number;
  role: 'customer' | 'technician' | 'merchant';
  sortOrder: number;
}

export type TechnicianAvailabilityStatus = 'available' | 'busy' | 'unavailable';

/**
 * Public technician profile for discovery/detail. Only verified technicians are publicly visible. Excludes authentication data, private contact data, and internal moderation state.
 */
export interface TechnicianPublicDto {
  areasAr: Array<string>;
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
 * Technician service area (label; coordinates optional).
 */
export interface TechnicianSelfAreaDto {
  labelAr: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Own technician profile. verificationStatus/ratings/counters are server-owned (admin is the verification authority); areas are label-based with OPTIONAL coordinates (label-only areas carry no geo and are excluded from radius filtering).
 */
export interface TechnicianSelfProfileDto {
  areas: Array<TechnicianSelfAreaDto>;
  availabilityStatus: TechnicianAvailabilityStatus;
  avatarUrl: string | null;
  bio: string | null;
  completedServicesCount: number;
  displayName: string | null;
  experienceYears: number;
  id: string;
  ratingAverage: number | null;
  ratingCount: number;
  services: Array<TechnicianSelfServiceDto>;
  verificationStatus: VerificationStatus;
}

/**
 * GET /technician/services item.
 */
export interface TechnicianSelfService {
  applianceCategoryId: string;
  isActive: boolean;
  nameAr: string;
  priceFrom: number | null;
  serviceId: string;
  slug: string;
}

/**
 * A catalog service attached by the technician.
 */
export interface TechnicianSelfServiceDto {
  applianceCategoryId: string;
  nameAr: string;
  priceFrom: number | null;
  serviceId: string;
  slug: string;
}

/**
 * A service/specialty offered by a technician (active only).
 */
export interface TechnicianServiceDto {
  service: ServiceDto;
}

/**
 * Server-derived technician request counters + rating metrics.
 */
export interface TechnicianStatsDto {
  completedCount: number;
  completedServicesCount: number;
  inProgressCount: number;
  onTheWayCount: number;
  pendingCount: number;
  ratingAverage: number | null;
  ratingCount: number;
}

/**
 * Server-authoritative unread notification count for the badge.
 */
export interface UnreadCountDto {
  unread: number;
}

/**
 * PATCH /me payload (docs/07_API.md §5). Only shared contact fields are writable. Changing a contact channel resets that channel's verification flag.
 */
export interface UpdateMeDto {
  email?: string;
  phone?: string;
}

/**
 * PATCH /merchant/products/:id payload — writable whitelist only. merchant ownership and product id are immutable; status is a validated active/suspended field (transitions unconstrained by the contract).
 */
export interface UpdateMerchantProductDto {
  descriptionAr?: string;
  imageUrl?: string;
  nameAr?: string;
  price?: number;
  slug?: string;
  status?: 'active' | 'suspended';
  stockQuantity?: number;
}

/**
 * PATCH /merchant/profile payload (onboarding persistence). Fields are optional; absent fields unchanged. verificationStatus is never writable. WP-01: store logos change exclusively through POST /merchant/profile/logo.
 */
export interface UpdateMerchantProfileDto {
  bio?: string;
  businessName?: string;
  contactPhone?: string;
  locationId?: string;
}

/**
 * PATCH /technician/profile payload. Editable: display_name, bio, experience_years, availability_status (available | unavailable only — technician-controlled, WP-4), areas (label + optional coordinates). verificationStatus/ratings/counters are NEVER writable. WP-01: profile photos change exclusively through POST /technician/profile/avatar.
 */
export interface UpdateTechnicianProfileDto {
  areas?: Array<{ label_ar: string; latitude?: number; longitude?: number }>;
  availability_status?: 'available' | 'unavailable';
  bio?: string;
  display_name?: string;
  experience_years?: number;
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
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

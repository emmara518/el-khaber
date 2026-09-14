/**
 * Bootstrap-only zod schemas. Domain schemas are added in later tasks
 * and must mirror the corresponding DTOs in @khabir/shared-types.
 *
 * Source of truth: docs/07_API.md.
 */

import { z } from 'zod';

/** Role enum mirrored from @khabir/shared-types ROLE. */
export const roleSchema = z.enum(['customer', 'technician', 'merchant']);

/** Pagination query. Server caps `limit`. Source: docs/07_API.md §19. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// -----------------------------------------------------------------------------
// Authentication schemas
// Source: docs/07_API.md §4 (Auth) and docs/10_ENGINEERING_RULES.md §24.
// -----------------------------------------------------------------------------

/** E.164-ish phone (7–15 digits, optional leading +). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/u, 'phone must be 7–15 digits, optional leading +');

/** RFC-5321 email. */
export const emailSchema = z.string().trim().toLowerCase().email();

/** Password: 10–128 chars, at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(10, 'password must be at least 10 characters')
  .max(128, 'password must be at most 128 characters')
  .regex(/[A-Za-z]/u, 'password must contain at least one letter')
  .regex(/[0-9]/u, 'password must contain at least one digit');

/** Register: at least one of phone/email. */
export const registerSchema = z
  .object({
    role: roleSchema,
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
  })
  .refine((v) => Boolean(v.phone) || Boolean(v.email), {
    message: 'phone or email is required',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** Login: identifier (phone or email) + password. */
export const loginSchema = z.object({
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Refresh: opaque refresh token. */
export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

/** Logout: opaque refresh token. */
export const logoutSchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

/** Forgot password: contact channel. */
export const forgotPasswordSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((v) => Boolean(v.phone) || Boolean(v.email), {
    message: 'phone or email is required',
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Reset password: token + new password. */
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(4096),
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// -----------------------------------------------------------------------------
// Current user (docs/07_API.md §5)
// -----------------------------------------------------------------------------

/**
 * PATCH /me — updates allowed shared account fields (contact channels only).
 * Role, status, verification flags, and credentials are NOT writable here;
 * zod strips any unknown keys, so they can never reach the service layer.
 * Source: docs/07_API.md §5, Task 10C.
 */
export const updateMeSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((v) => v.phone !== undefined || v.email !== undefined, {
    message: 'at least one of phone or email is required',
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

// -----------------------------------------------------------------------------
// Catalog / content list queries (Task 10E)
// Source: docs/07_API.md §6. Query parameter names follow the documented
// snake_case contract. All list queries compose with paginationSchema
// (server max limit: 100).
// -----------------------------------------------------------------------------

const uuidParam = z.string().uuid();

/** GET /faults — appliance_category_id, q, pagination. */
export const faultListQuerySchema = paginationSchema.extend({
  appliance_category_id: uuidParam.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type FaultListQuery = z.infer<typeof faultListQuerySchema>;

/** GET /services — appliance_category_id, q, pagination. */
export const serviceListQuerySchema = paginationSchema.extend({
  appliance_category_id: uuidParam.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>;

/**
 * GET /technicians — documented discovery filters (docs/07_API.md §6).
 * `sort` accepts only `rating` — a ranking signal explicitly documented
 * in docs/06_DATABASE.md §10. Geo params (lat/lng/radius) are documented
 * but NOT implemented: the schema has no technician location/service-area
 * model (reported DATABASE MODEL GAP — CTO decision required).
 */
export const technicianListQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  appliance_category_id: uuidParam.optional(),
  service_id: uuidParam.optional(),
  fault_id: uuidParam.optional(),
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  sort: z.literal('rating').optional(),
});
export type TechnicianListQuery = z.infer<typeof technicianListQuerySchema>;

// -----------------------------------------------------------------------------
// Service requests (Task 10F)
// Source: docs/07_API.md §7 (create payload, list, transitions), §22 (state
// chain). problem_title is OPTIONAL (Task 10B CTO decision 2).
// -----------------------------------------------------------------------------

/** Canonical service-request lifecycle (docs/07_API.md §22). */
export const serviceRequestStatusSchema = z.enum([
  'pending',
  'accepted',
  'on_the_way',
  'in_progress',
  'completed',
  'cancelled',
]);
export type ServiceRequestStatusValue = z.infer<typeof serviceRequestStatusSchema>;

/** POST /service-requests — customer creation payload. */
export const createServiceRequestSchema = z.object({
  technician_id: uuidParam,
  appliance_category_id: uuidParam,
  service_id: uuidParam.optional(),
  fault_id: uuidParam.optional(),
  problem_title: z.string().trim().min(1).max(255).optional(),
  problem_description: z.string().trim().min(1).max(5000),
  location_id: uuidParam,
  scheduled_at: z.coerce.date().optional(),
});
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;

/** GET /service-requests — role-scoped list with the documented status filter. */
export const serviceRequestListQuerySchema = paginationSchema.extend({
  status: serviceRequestStatusSchema.optional(),
});
export type ServiceRequestListQuery = z.infer<typeof serviceRequestListQuerySchema>;

// -----------------------------------------------------------------------------
// Merchant domain (Task 10G)
// Source: docs/07_API.md §17, docs/06_DATABASE.md §21. Writable profile
// fields are exactly the documented merchant_profile columns; verification
// status is READ-ONLY for merchants (admin is the authority — docs/09).
// -----------------------------------------------------------------------------

/** PATCH /merchant/profile — all fields optional; absent fields unchanged. */
export const merchantProfileUpdateSchema = z
  .object({
    businessName: z.string().trim().min(1).max(255).optional(),
    bio: z.string().trim().max(2000).optional(),
    logoUrl: z.string().trim().min(1).max(512).optional(),
    contactPhone: phoneSchema.optional(),
    locationId: uuidParam.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'at least one field is required',
  });
export type MerchantProfileUpdateInput = z.infer<typeof merchantProfileUpdateSchema>;

/** POST /merchant/products. `slug` is optional (server-derived when absent). */
export const merchantProductCreateSchema = z.object({
  nameAr: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(128).regex(/^[^\s]+$/u, 'slug must not contain whitespace').optional(),
  descriptionAr: z.string().trim().max(5000).optional(),
  price: z.number().min(0).max(999999.99).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  imageUrl: z.string().trim().min(1).max(512).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});
export type MerchantProductCreateInput = z.infer<typeof merchantProductCreateSchema>;

/**
 * PATCH /merchant/products/:id — writable whitelist. `status` is a
 * documented product field; transitions active↔suspended are unconstrained
 * by the contract (docs/06_DATABASE.md §21), so the server validates the
 * value rather than a transition graph.
 */
export const merchantProductUpdateSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(255).optional(),
    slug: z.string().trim().min(1).max(128).regex(/^[^\s]+$/u).optional(),
    descriptionAr: z.string().trim().max(5000).optional(),
    price: z.number().min(0).max(999999.99).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    imageUrl: z.string().trim().min(1).max(512).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'at least one field is required',
  });
export type MerchantProductUpdateInput = z.infer<typeof merchantProductUpdateSchema>;

// -----------------------------------------------------------------------------
// Locations (Task REM-001) — docs/07_API.md §8, docs/06_DATABASE.md §6.
// User-owned location records used by the service-request flow (a request
// requires an owned `location_id`). Coordinates are OPTIONAL: docs/06 §6 says
// "store exact coordinates only when required", and no map/geocoding provider
// is approved, so label/address-only locations are valid.
// -----------------------------------------------------------------------------

const locationBody = {
  label: z.string().trim().min(1).max(128),
  address_text: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(128).optional(),
  region: z.string().trim().max(128).optional(),
  country: z.string().trim().max(128).optional(),
  // Explicit JSON null must NOT coerce to 0 (z.coerce.number maps
  // null -> 0, which would silently store a wrong coordinate). Null is
  // normalized to omitted, consistent with the optional contract.
  latitude: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.coerce.number().min(-90).max(90).optional(),
  ),
  longitude: z.preprocess(
    (v) => (v === null ? undefined : v),
    z.coerce.number().min(-180).max(180).optional(),
  ),
};

/** POST /locations — create an owned location. */
export const createLocationSchema = z
  .object(locationBody)
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: 'latitude and longitude must be provided together',
  });
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

/** PATCH /locations/:id — partial update; absent fields unchanged. */
export const updateLocationSchema = z
  .object({
    label: locationBody.label.optional(),
    address_text: locationBody.address_text,
    city: locationBody.city,
    region: locationBody.region,
    country: locationBody.country,
    latitude: locationBody.latitude,
    longitude: locationBody.longitude,
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'at least one field is required' })
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: 'latitude and longitude must be provided together',
  });
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// -----------------------------------------------------------------------------
// Chat / Reviews / Notifications (Task 10H)
// Source: docs/07_API.md §10–§12. No realtime, no delivery providers, no
// invented message features (reactions/edits/typing) — HTTP persistence only.
// -----------------------------------------------------------------------------

/** POST /conversations/:id/messages — text-only until storage exists. */
export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** POST /service-requests/:id/review — rating 1..5, optional comment + seeded tags. */
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  tag_ids: z.array(uuidParam).max(10).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// -----------------------------------------------------------------------------
// Subscriptions + manual payments + admin grants (Task 10I)
// Source: docs/07_API.md §14–§15, docs/08_SUBSCRIPTIONS.md, CTO contract.
// MVP manual payment methods ONLY: instapay | vodafone_cash. Payment
// verification is ADMIN-authoritative; user input is never trusted.
// -----------------------------------------------------------------------------

export const paymentMethodSchema = z.enum(['instapay', 'vodafone_cash']);
export type PaymentMethodValue = z.infer<typeof paymentMethodSchema>;

/** POST /subscriptions — initiates activation via a manual payment submission. */
export const createPaymentSubmissionSchema = z.object({
  plan_id: uuidParam,
  method: paymentMethodSchema,
  transfer_reference: z.string().trim().min(4).max(100),
  // Typed reference reserved for the future proof-media task (optional until
  // approved storage exists). A generic pasted URL is NOT accepted here.
  proof_storage_key: z.string().trim().min(4).max(512).optional(),
});
export type CreatePaymentSubmissionInput = z.infer<typeof createPaymentSubmissionSchema>;

/** POST /subscriptions/:id/cancel — cancels RENEWAL (access until period end). */
export const cancelSubscriptionSchema = z.object({}).strict();

/** Admin: upsert the payment destination for one method. */
export const adminPaymentConfigUpsertSchema = z.object({
  account_identifier: z.string().trim().min(1).max(255),
  display_name: z.string().trim().min(1).max(255),
  is_enabled: z.boolean(),
});
export type AdminPaymentConfigUpsertInput = z.infer<typeof adminPaymentConfigUpsertSchema>;

/** Admin: manual subscription grant. */
export const adminGrantSubscriptionSchema = z.object({
  user_id: uuidParam,
  plan_id: uuidParam,
});
export type AdminGrantSubscriptionInput = z.infer<typeof adminGrantSubscriptionSchema>;

/** Admin: manual entitlement grant (documented codes only). */
export const adminGrantEntitlementSchema = z.object({
  user_id: uuidParam,
  entitlement_id: uuidParam,
});
export type AdminGrantEntitlementInput = z.infer<typeof adminGrantEntitlementSchema>;

/** Admin: operational notification to a user (recipient server-resolved). */
export const adminNotificationSchema = z.object({
  user_id: uuidParam,
  type: z.string().trim().min(1).max(64),
  title_ar: z.string().trim().min(1).max(255),
  body_ar: z.string().trim().min(1).max(2000),
  data_json: z.record(z.unknown()).optional(),
});
export type AdminNotificationInput = z.infer<typeof adminNotificationSchema>;

/** Admin: payment submission review list (?status=&page=&limit=). */
export const adminSubmissionListQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});
export type AdminSubmissionListQuery = z.infer<typeof adminSubmissionListQuerySchema>;

// -----------------------------------------------------------------------------
// Technician self-service (Task 10J-R1)
// Source: docs/07_API.md §16. Editable fields: displayName/bio/avatarUrl/
// experienceYears + area labels (coordinates optional — label-only areas are
// supported). verificationStatus, ratings, and counters are server-owned and
// NEVER client-writable (docs/09 §6 — admin is the verification authority).
// -----------------------------------------------------------------------------

const areaSchema = z.object({
  label_ar: z.string().trim().min(1).max(128),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const technicianProfileUpdateSchema = z
  .object({
    display_name: z.string().trim().min(1).max(255).optional(),
    bio: z.string().trim().max(2000).optional(),
    avatar_url: z.string().trim().min(1).max(512).optional(),
    experience_years: z.coerce.number().int().min(0).max(60).optional(),
    areas: z.array(areaSchema).max(10).optional(),
  })
  .refine(
    (v) =>
      v.display_name !== undefined ||
      v.bio !== undefined ||
      v.avatar_url !== undefined ||
      v.experience_years !== undefined ||
      v.areas !== undefined,
    { message: 'at least one field is required' },
  );
export type TechnicianProfileUpdateInput = z.infer<typeof technicianProfileUpdateSchema>;

/** POST /technician/services — attach a documented catalog service. */
export const technicianServiceAddSchema = z.object({
  service_id: uuidParam,
  price_from: z.number().min(0).max(999999.99).optional(),
});
export type TechnicianServiceAddInput = z.infer<typeof technicianServiceAddSchema>;

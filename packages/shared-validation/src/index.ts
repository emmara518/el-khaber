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

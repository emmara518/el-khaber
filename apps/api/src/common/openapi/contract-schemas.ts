/**
 * OpenAPI component schemas for the canonical contract (Task 10C).
 *
 * These mirror `@khabir/shared-types` — the shared contract package —
 * and docs/07_API.md §3–§5, §19, §21. They are the transitional source
 * for `components.schemas` until domain DTOs arrive via codegen
 * (ADR-0003). Endpoint paths are NEVER defined here; they are
 * discovered from the actual NestJS controllers.
 */

type JsonObject = Record<string, unknown>;

const REF = (name: string): JsonObject => ({ $ref: `#/components/schemas/${name}` });

export const CONTRACT_SCHEMAS: Record<string, JsonObject> = {
  Role: { type: 'string', enum: ['customer', 'technician', 'merchant'] },
  UserStatus: { type: 'string', enum: ['active', 'suspended', 'pending', 'deleted'] },
  ErrorCode: {
    type: 'string',
    enum: [
      'AUTH_REQUIRED',
      'AUTH_INVALID',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'CONFLICT',
      'RATE_LIMITED',
      'SUBSCRIPTION_REQUIRED',
      'ENTITLEMENT_REQUIRED',
      'INVALID_STATE_TRANSITION',
      'UPLOAD_REJECTED',
      'INTERNAL_ERROR',
    ],
  },
  ApiMeta: {
    type: 'object',
    description:
      'List metadata (docs/07_API.md §19). The server normalizes page/limit ' +
      '(max server-enforced limit: 100) and computes total/totalPages/hasNext. ' +
      'Clients must never derive totals themselves.',
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      total: { type: 'integer', minimum: 0 },
      totalPages: { type: 'integer', minimum: 0 },
      hasNext: { type: 'boolean' },
    },
    additionalProperties: true,
  },
  ErrorResponse: {
    type: 'object',
    description: 'Canonical error envelope (docs/07_API.md §3).',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: REF('ErrorCode'),
          message: { type: 'string' },
          fields: {
            type: 'object',
            description: 'Field-level validation details when applicable.',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['code', 'message'],
      },
    },
    required: ['error'],
  },
  AuthUserDto: {
    type: 'object',
    description: 'Public user record. Never includes credentials.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      role: REF('Role'),
      status: REF('UserStatus'),
      phone: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      phoneVerified: { type: 'boolean' },
      emailVerified: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'role',
      'status',
      'phone',
      'email',
      'phoneVerified',
      'emailVerified',
      'createdAt',
    ],
    additionalProperties: false,
  },
  MeDto: { description: 'Authenticated user profile (see AuthUserDto).', ...REF('AuthUserDto') },
  AuthSessionDto: {
    type: 'object',
    description:
      'Authentication session. The refresh token is returned exactly once per issuance/rotation.',
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      expiresIn: { type: 'integer', description: 'Access token TTL in seconds.' },
      user: REF('AuthUserDto'),
    },
    required: ['accessToken', 'refreshToken', 'expiresIn', 'user'],
    additionalProperties: false,
  },
  UpdateMeDto: {
    type: 'object',
    description:
      'PATCH /me payload (docs/07_API.md §5). Only shared contact fields are ' +
      'writable. Changing a contact channel resets that channel\'s verification flag.',
    properties: {
      phone: { type: 'string', pattern: '^\\+?[0-9]{7,15}$' },
      email: { type: 'string', format: 'email' },
    },
    additionalProperties: false,
  },
  AcceptedDto: {
    type: 'object',
    description: 'Opaque acceptance marker. Reveals nothing about account existence.',
    properties: { accepted: { type: 'boolean', enum: [true] } },
    required: ['accepted'],
    additionalProperties: false,
  },
  HealthDto: {
    type: 'object',
    description: 'Liveness payload (process-level only, no dependency checks).',
    properties: { status: { type: 'string', enum: ['ok'] }, service: { type: 'string', enum: ['api'] } },
    required: ['status', 'service'],
    additionalProperties: false,
  },
  ReadyDto: {
    type: 'object',
    description: 'Readiness payload with per-dependency check results.',
    properties: {
      status: { type: 'string', enum: ['ready'] },
      checks: {
        type: 'object',
        properties: { database: { type: 'string', enum: ['ok'] } },
        required: ['database'],
        additionalProperties: false,
      },
    },
    required: ['status', 'checks'],
    additionalProperties: false,
  },

  // ---------------------------------------------------------------------------
  // Catalog / content domain (Task 10E). Source: docs/07_API.md §6, §8.
  // ---------------------------------------------------------------------------

  ApplianceCategoryDto: {
    type: 'object',
    description: 'Active appliance category (customer-facing reference data).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      nameAr: { type: 'string' },
      slug: { type: 'string' },
      iconUrl: { type: 'string', nullable: true },
      imageUrl: { type: 'string', nullable: true },
      sortOrder: { type: 'integer' },
    },
    required: ['id', 'nameAr', 'slug', 'iconUrl', 'imageUrl', 'sortOrder'],
    additionalProperties: false,
  },
  FaultSummaryDto: {
    type: 'object',
    description: 'Published fault-guide list item (summary fields only).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      applianceCategoryId: { type: 'string', format: 'uuid' },
      nameAr: { type: 'string' },
      slug: { type: 'string' },
      severityLevel: { type: 'string', nullable: true },
      summaryAr: { type: 'string' },
      sortOrder: { type: 'integer' },
    },
    required: ['id', 'applianceCategoryId', 'nameAr', 'slug', 'severityLevel', 'summaryAr', 'sortOrder'],
    additionalProperties: false,
  },
  FaultDto: {
    type: 'object',
    description:
      'Published fault-guide content. Guidance is advisory ("قد يكون...") — ' +
      'never diagnostic certainty; safety notes and technician escalation ' +
      'are part of the content contract.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      applianceCategoryId: { type: 'string', format: 'uuid' },
      nameAr: { type: 'string' },
      slug: { type: 'string' },
      severityLevel: { type: 'string', nullable: true },
      summaryAr: { type: 'string' },
      guidanceAr: { type: 'string' },
      safetyNoteAr: { type: 'string', nullable: true },
      whenToCallTechnicianAr: { type: 'string', nullable: true },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'applianceCategoryId',
      'nameAr',
      'slug',
      'severityLevel',
      'summaryAr',
      'guidanceAr',
      'safetyNoteAr',
      'whenToCallTechnicianAr',
      'updatedAt',
    ],
    additionalProperties: false,
  },
  ServiceDto: {
    type: 'object',
    description: 'Active service/specialty catalog entry.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      applianceCategoryId: { type: 'string', format: 'uuid' },
      nameAr: { type: 'string' },
      slug: { type: 'string' },
      descriptionAr: { type: 'string', nullable: true },
    },
    required: ['id', 'applianceCategoryId', 'nameAr', 'slug', 'descriptionAr'],
    additionalProperties: false,
  },
  TechnicianServiceDto: {
    type: 'object',
    description: 'A service/specialty offered by a technician (active only).',
    properties: { service: REF('ServiceDto') },
    required: ['service'],
    additionalProperties: false,
  },
  TechnicianPublicDto: {
    type: 'object',
    description:
      'Public technician profile for discovery/detail. Only verified ' +
      'technicians are publicly visible. Excludes authentication data, ' +
      'private contact data, and internal moderation state.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      displayName: { type: 'string', nullable: true },
      bio: { type: 'string', nullable: true },
      avatarUrl: { type: 'string', nullable: true },
      verificationStatus: REF('VerificationStatus'),
      availabilityStatus: REF('TechnicianAvailabilityStatus'),
      experienceYears: { type: 'integer' },
      completedServicesCount: { type: 'integer' },
      ratingAverage: { type: 'number', nullable: true },
      ratingCount: { type: 'integer' },
      services: { type: 'array', items: REF('TechnicianServiceDto') },
    },
    required: [
      'id',
      'displayName',
      'bio',
      'avatarUrl',
      'verificationStatus',
      'availabilityStatus',
      'experienceYears',
      'completedServicesCount',
      'ratingAverage',
      'ratingCount',
      'services',
    ],
    additionalProperties: false,
  },
  VerificationStatus: {
    type: 'string',
    enum: ['pending', 'verified', 'rejected', 'suspended'],
  },
  TechnicianAvailabilityStatus: {
    type: 'string',
    enum: ['available', 'busy', 'unavailable'],
  },
};

/** Inline success-envelope wrapper: `{ data: <ref>, meta? }`. */
export function successEnvelope(dataRef: string): JsonObject {
  return {
    type: 'object',
    properties: {
      data: REF(dataRef),
      meta: REF('ApiMeta'),
    },
    required: ['data'],
  };
}

export { REF as schemaRef };

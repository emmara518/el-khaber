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

  // ---------------------------------------------------------------------------
  // Service requests (Task 10F). Source: docs/07_API.md §7, §22.
  // ---------------------------------------------------------------------------

  ServiceRequestStatus: {
    type: 'string',
    enum: ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'],
  },
  CreateServiceRequestDto: {
    type: 'object',
    description:
      'Customer request creation payload (docs/07_API.md §7). problem_title is ' +
      'OPTIONAL (Task 10B CTO decision 2) and supports the "other problem" case ' +
      'without inventing diagnostic conclusions. The request is created with ' +
      'status=pending, targeted at the chosen verified technician.',
    properties: {
      technician_id: { type: 'string', format: 'uuid' },
      appliance_category_id: { type: 'string', format: 'uuid' },
      service_id: { type: 'string', format: 'uuid' },
      fault_id: { type: 'string', format: 'uuid' },
      problem_title: { type: 'string', maxLength: 255 },
      problem_description: { type: 'string', minLength: 1, maxLength: 5000 },
      location_id: { type: 'string', format: 'uuid' },
      scheduled_at: { type: 'string', format: 'date-time' },
    },
    required: ['technician_id', 'appliance_category_id', 'problem_description', 'location_id'],
    additionalProperties: false,
  },
  ServiceRequestSummaryDto: {
    type: 'object',
    description: 'Role-scoped service-request list item.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: REF('ServiceRequestStatus'),
      problemTitle: { type: 'string', nullable: true },
      problemDescription: { type: 'string' },
      applianceCategoryId: { type: 'string', format: 'uuid' },
      serviceId: { type: 'string', format: 'uuid', nullable: true },
      faultId: { type: 'string', format: 'uuid', nullable: true },
      technicianId: { type: 'string', format: 'uuid', nullable: true },
      scheduledAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'status',
      'problemTitle',
      'problemDescription',
      'applianceCategoryId',
      'serviceId',
      'faultId',
      'technicianId',
      'scheduledAt',
      'createdAt',
      'updatedAt',
    ],
    additionalProperties: false,
  },
  ServiceRequestStatusHistoryDto: {
    type: 'object',
    description: 'Append-only status transition record (docs/07_API.md §13).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fromStatus: { ...REF('ServiceRequestStatus'), nullable: true },
      toStatus: REF('ServiceRequestStatus'),
      changedByUserId: { type: 'string', format: 'uuid', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'fromStatus', 'toStatus', 'changedByUserId', 'createdAt'],
    additionalProperties: false,
  },
  ServiceRequestDto: {
    type: 'object',
    description:
      'Role-scoped request detail. The request location (job information) is ' +
      'included for the customer owner and the targeted/assigned technician. ' +
      'Status history is bounded and append-only.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      status: REF('ServiceRequestStatus'),
      problemTitle: { type: 'string', nullable: true },
      problemDescription: { type: 'string' },
      applianceCategoryId: { type: 'string', format: 'uuid' },
      serviceId: { type: 'string', format: 'uuid', nullable: true },
      faultId: { type: 'string', format: 'uuid', nullable: true },
      technicianId: { type: 'string', format: 'uuid', nullable: true },
      location: {
        type: 'object',
        properties: {
          label: { type: 'string', nullable: true },
          addressText: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          region: { type: 'string', nullable: true },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
        required: ['label', 'addressText', 'city', 'region', 'latitude', 'longitude'],
        additionalProperties: false,
      },
      scheduledAt: { type: 'string', format: 'date-time', nullable: true },
      acceptedAt: { type: 'string', format: 'date-time', nullable: true },
      startedAt: { type: 'string', format: 'date-time', nullable: true },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      cancelledAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      history: { type: 'array', items: REF('ServiceRequestStatusHistoryDto') },
    },
    required: [
      'id',
      'status',
      'problemTitle',
      'problemDescription',
      'applianceCategoryId',
      'serviceId',
      'faultId',
      'technicianId',
      'location',
      'scheduledAt',
      'acceptedAt',
      'startedAt',
      'completedAt',
      'cancelledAt',
      'createdAt',
      'updatedAt',
      'history',
    ],
    additionalProperties: false,
  },

  SendMessageDto: {
    type: 'object',
    description:
      'POST /conversations/:id/messages payload. Text content only � ' +
      'attachment types require storage infrastructure (later task). The ' +
      'sender is derived from the verified JWT, never from the payload.',
    properties: {
      body: { type: 'string', minLength: 1, maxLength: 2000 },
    },
    required: ['body'],
    additionalProperties: false,
  },
  ConversationDto: {
    type: 'object',
    description:
      'The service-request conversation (1:1 with the request). Participants ' +
      'are the request customer and the targeted/assigned technician.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      serviceRequestId: { type: 'string', format: 'uuid' },
      requestStatus: REF('ServiceRequestStatus'),
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'serviceRequestId', 'requestStatus', 'createdAt'],
    additionalProperties: false,
  },
  MessageDto: {
    type: 'object',
    description:
      'Chat message. Ordered newest-first for pagination; the client adapter ' +
      'may reverse for display. readAt exists in the model but no mark-read ' +
      'route is documented (deferred).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      conversationId: { type: 'string', format: 'uuid' },
      senderUserId: { type: 'string', format: 'uuid' },
      messageType: { type: 'string', enum: ['text'] },
      body: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'conversationId', 'senderUserId', 'messageType', 'body', 'createdAt'],
    additionalProperties: false,
  },
  CreateReviewDto: {
    type: 'object',
    description:
      'POST /service-requests/:id/review payload. Eligibility is documented: ' +
      'the request owner, after completion, one review per request. Tags must ' +
      'reference seeded/documented review tags.',
    properties: {
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      comment: { type: 'string', maxLength: 2000 },
      tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' }, maxItems: 10 },
    },
    required: ['rating'],
    additionalProperties: false,
  },
  ReviewSummaryDto: {
    type: 'object',
    description:
      'Public review for technician discovery. Only documented public fields: ' +
      'no customer identifiers, no moderation state.',
    properties: {
      id: { type: 'string', format: 'uuid' },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      comment: { type: 'string', nullable: true },
      tags: { type: 'array', items: { type: 'string' } },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'rating', 'comment', 'tags', 'createdAt'],
    additionalProperties: false,
  },
  NotificationDto: {
    type: 'object',
    description:
      'A persisted notification for the authenticated recipient. 	ype is an ' +
      'open string until product trigger types are ratified; no delivery ' +
      'provider exists (persistence + read APIs only).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      type: { type: 'string' },
      titleAr: { type: 'string' },
      bodyAr: { type: 'string' },
      dataJson: { type: 'object', nullable: true, additionalProperties: true },
      readAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'type', 'titleAr', 'bodyAr', 'dataJson', 'readAt', 'createdAt'],
    additionalProperties: false,
  },
  // ---------------------------------------------------------------------------
  // Merchant domain (Task 10G). Source: docs/07_API.md §17, docs/06 §21.
  // Verification status is read-only for merchants (admin is the authority).
  // ---------------------------------------------------------------------------

  MerchantProfileDto: {
    type: 'object',
    description:
      'The authenticated merchant\'s own profile. verificationStatus is ' +
      'READ-ONLY (docs/09_ADMIN.md — admin is the verification authority). ' +
      'A missing profile returns 404 until the merchant PATCHes (onboarding).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      businessName: { type: 'string', nullable: true },
      bio: { type: 'string', nullable: true },
      logoUrl: { type: 'string', nullable: true },
      contactPhone: { type: 'string', nullable: true },
      locationId: { type: 'string', format: 'uuid', nullable: true },
      verificationStatus: REF('VerificationStatus'),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'businessName',
      'bio',
      'logoUrl',
      'contactPhone',
      'locationId',
      'verificationStatus',
      'createdAt',
      'updatedAt',
    ],
    additionalProperties: false,
  },
  UpdateMerchantProfileDto: {
    type: 'object',
    description:
      'PATCH /merchant/profile payload (onboarding persistence). Fields are ' +
      'optional; absent fields unchanged. verificationStatus is never writable.',
    properties: {
      businessName: { type: 'string', minLength: 1, maxLength: 255 },
      bio: { type: 'string', maxLength: 2000 },
      logoUrl: { type: 'string', maxLength: 512 },
      contactPhone: { type: 'string', pattern: '^\\+?[0-9]{7,15}$' },
      locationId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  },
  MerchantProductDto: {
    type: 'object',
    description: 'A merchant-owned catalog product (status: active | suspended).',
    properties: {
      id: { type: 'string', format: 'uuid' },
      merchantId: { type: 'string', format: 'uuid' },
      nameAr: { type: 'string' },
      slug: { type: 'string' },
      descriptionAr: { type: 'string', nullable: true },
      price: { type: 'number', nullable: true },
      stockQuantity: { type: 'integer', nullable: true },
      imageUrl: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['active', 'suspended'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: [
      'id',
      'merchantId',
      'nameAr',
      'slug',
      'descriptionAr',
      'price',
      'stockQuantity',
      'imageUrl',
      'status',
      'createdAt',
      'updatedAt',
    ],
    additionalProperties: false,
  },
  CreateMerchantProductDto: {
    type: 'object',
    description:
      'POST /merchant/products payload. Ownership is derived from the JWT. ' +
      '`slug` is optional — server-derived from nameAr (unique per merchant). ' +
      'price may be null; no currency/discount/tax semantics exist.',
    properties: {
      nameAr: { type: 'string', minLength: 1, maxLength: 255 },
      slug: { type: 'string', minLength: 1, maxLength: 128 },
      descriptionAr: { type: 'string', maxLength: 5000 },
      price: { type: 'number', minimum: 0 },
      stockQuantity: { type: 'integer', minimum: 0 },
      imageUrl: { type: 'string', maxLength: 512 },
      status: { type: 'string', enum: ['active', 'suspended'] },
    },
    required: ['nameAr'],
    additionalProperties: false,
  },
  UpdateMerchantProductDto: {
    type: 'object',
    description:
      'PATCH /merchant/products/:id payload — writable whitelist only. ' +
      'merchant ownership and product id are immutable; status is a validated ' +
      'active/suspended field (transitions unconstrained by the contract).',
    properties: {
      nameAr: { type: 'string', minLength: 1, maxLength: 255 },
      slug: { type: 'string', minLength: 1, maxLength: 128 },
      descriptionAr: { type: 'string', maxLength: 5000 },
      price: { type: 'number', minimum: 0 },
      stockQuantity: { type: 'integer', minimum: 0 },
      imageUrl: { type: 'string', maxLength: 512 },
      status: { type: 'string', enum: ['active', 'suspended'] },
    },
    additionalProperties: false,
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

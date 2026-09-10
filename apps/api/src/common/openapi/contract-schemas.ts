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

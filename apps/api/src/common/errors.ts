/**
 * Domain errors. Each error class maps to a canonical error code from
 * `docs/07_API.md §21`. The `ApiExceptionFilter` (see ./api-exception.filter.ts)
 * converts these to the standard error envelope.
 */

import { ERROR_CODE, type ErrorCode } from '@khabir/shared-types';

export class ApiException extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export class ValidationException extends ApiException {
  constructor(message = 'Validation failed', fields?: Record<string, string>) {
    super(ERROR_CODE.VALIDATION_ERROR, message, 400, fields);
  }
}

export class AuthRequiredException extends ApiException {
  constructor(message = 'Authentication required') {
    super(ERROR_CODE.AUTH_REQUIRED, message, 401);
  }
}

export class AuthInvalidException extends ApiException {
  constructor(message = 'Invalid credentials') {
    super(ERROR_CODE.AUTH_INVALID, message, 401);
  }
}

export class ForbiddenException extends ApiException {
  constructor(message = 'Forbidden') {
    super(ERROR_CODE.FORBIDDEN, message, 403);
  }
}

export class NotFoundException extends ApiException {
  constructor(message = 'Not found') {
    super(ERROR_CODE.NOT_FOUND, message, 404);
  }
}

export class ConflictException extends ApiException {
  constructor(message = 'Conflict', fields?: Record<string, string>) {
    super(ERROR_CODE.CONFLICT, message, 409, fields);
  }
}

export class RateLimitedException extends ApiException {
  constructor(message = 'Too many requests') {
    super(ERROR_CODE.RATE_LIMITED, message, 429);
  }
}

export class SubscriptionRequiredException extends ApiException {
  constructor(message = 'Subscription required') {
    super(ERROR_CODE.SUBSCRIPTION_REQUIRED, message, 402);
  }
}

export class EntitlementRequiredException extends ApiException {
  constructor(message = 'Entitlement required', fields?: Record<string, string>) {
    super(ERROR_CODE.ENTITLEMENT_REQUIRED, message, 402, fields);
  }
}

export class InvalidStateTransitionException extends ApiException {
  constructor(message = 'Invalid state transition') {
    super(ERROR_CODE.INVALID_STATE_TRANSITION, message, 409);
  }
}

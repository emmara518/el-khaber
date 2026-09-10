/**
 * Thin OpenAPI decorator helpers over `@nestjs/swagger` (Task 10C).
 *
 * Request/response schemas are derived from the SAME zod schemas the
 * `ZodValidationPipe` enforces, so the published contract cannot drift
 * from runtime validation. Envelope responses reference the shared
 * component schemas (see contract-schemas.ts).
 */

import { ApiBody, ApiResponse } from '@nestjs/swagger';


import { schemaRef, successEnvelope } from './contract-schemas';
import { zodToJsonSchema } from './zod-json-schema';

import type { ZodTypeAny } from 'zod';

type ApiDecorator = MethodDecorator & ClassDecorator;

/** Document a zod-validated request body (validation stays in the pipe). */
export function ApiZodBody(schema: ZodTypeAny): ApiDecorator {
  return ApiBody({
    required: true,
    schema: zodToJsonSchema(schema),
  } as never) as ApiDecorator;
}

/** Document the canonical success envelope for a route or controller. */
export function ApiEnvelopeOk(
  dataSchemaName: string,
  status = 200,
  description = 'Success',
): ApiDecorator {
  return ApiResponse({
    status,
    description,
    schema: successEnvelope(dataSchemaName),
  } as never) as ApiDecorator;
}

/** Document a canonical error response for a route or controller. */
export function ApiEnvelopeError(status: number, description: string): ApiDecorator {
  return ApiResponse({
    status,
    description,
    schema: schemaRef('ErrorResponse'),
  } as never) as ApiDecorator;
}

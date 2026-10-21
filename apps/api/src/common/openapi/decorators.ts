/**
 * Thin OpenAPI decorator helpers over `@nestjs/swagger` (Task 10C).
 *
 * Request/response schemas are derived from the SAME zod schemas the
 * `ZodValidationPipe` enforces, so the published contract cannot drift
 * from runtime validation. Envelope responses reference the shared
 * component schemas (see contract-schemas.ts).
 */

import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';

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

/**
 * Document a zod-validated QUERY object: one `@ApiQuery` entry per schema
 * property, derived from the same schema the validation pipe enforces.
 * Method-level decorator.
 */
export function ApiZodQuery(schema: ZodTypeAny): MethodDecorator {
  const json = zodToJsonSchema(schema) as {
    properties?: Record<string, Record<string, unknown>>;
    required?: string[];
  };
  const required = new Set(json.required ?? []);
  const entries = Object.entries(json.properties ?? {});
  return ((target, propertyKey, descriptor) => {
    for (const [name, prop] of entries) {
      ApiQuery({ name, required: required.has(name), schema: prop } as never)(
        target,
        propertyKey,
        descriptor,
      );
    }
  }) as MethodDecorator;
}

/**
 * Zod-based validation pipe. Validates request body, query, and params
 * against a zod schema. On success, replaces the value with the parsed
 * (typed) result. On failure, throws a `ValidationException` with
 * field-level error details. The `ApiExceptionFilter` then converts this
 * to the canonical error envelope.
 *
 * Source: docs/07_API.md §3, §23; docs/10_ENGINEERING_RULES.md §24.
 */

import {
  type ArgumentMetadata,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

import { ValidationException } from './errors';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of error.issues) {
          const path = issue.path.length > 0 ? issue.path.join('.') : '_';
          if (!(path in fields)) {
            fields[path] = issue.message;
          }
        }
        throw new ValidationException('Validation failed', fields);
      }
      throw error;
    }
  }
}

/**
 * Route-parameter UUID validation (WP-1C).
 *
 * Entity detail routes carry UUID path parameters (`:id`, `:serviceId`).
 * A non-UUID value would otherwise reach Prisma and surface as an
 * `INTERNAL_ERROR` 500 instead of the controlled `NOT_FOUND` the API
 * contract promises for a missing resource (docs/07_API.md §21).
 *
 * This pipe validates ONLY the known UUID path-parameter names and
 * returns every other argument untouched, so body/query validation
 * (ZodValidationPipe) is unaffected.
 */

import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';

import { NotFoundException } from './errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Path parameter names that are always entity UUIDs in this API. */
const UUID_PARAM_NAMES = new Set(['id', 'serviceId']);

@Injectable()
export class UuidParamPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'param' || metadata.data === undefined) {
      return value;
    }
    if (!UUID_PARAM_NAMES.has(metadata.data)) {
      return value;
    }
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      // Controlled not-found: identical to a missing resource, so route
      // params can never distinguish "malformed" from "absent".
      throw new NotFoundException();
    }
    return value;
  }
}

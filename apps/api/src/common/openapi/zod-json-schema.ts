/**
 * Minimal, deterministic zod → JSON Schema (OpenAPI 3.0) converter.
 *
 * Scope: exactly the zod constructs used by `@khabir/shared-validation`
 * (object, string, number/integer, boolean, enum, array, optional,
 * nullable, default, effects). Runtime-only refinements (`.refine`,
 * `.superRefine`) have no OpenAPI representation and are intentionally
 * not emitted — they remain enforced by the `ZodValidationPipe`.
 *
 * This converter exists so the OpenAPI document is derived from the
 * SAME zod schemas that validate real requests (ADR-0003: the contract
 * must not drift from the implementation). It is not a general-purpose
 * zod serializer.
 */

import { ZodFirstPartyTypeKind, type ZodTypeAny } from 'zod';

type JsonObject = Record<string, unknown>;

function fromChecks(schema: JsonObject, checks: Array<{ kind: string; value?: number; regex?: RegExp }>): void {
  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        if (schema['type'] === 'string') {
          schema['minLength'] = check.value;
        } else if (schema['type'] === 'number' || schema['type'] === 'integer') {
          schema['minimum'] = check.value;
        }
        break;
      case 'max':
        if (schema['type'] === 'string') {
          schema['maxLength'] = check.value;
        } else if (schema['type'] === 'number' || schema['type'] === 'integer') {
          schema['maximum'] = check.value;
        }
        break;
      case 'regex':
        if (typeof check.regex === 'object') {
          schema['pattern'] = check.regex.source;
        }
        break;
      case 'int':
        schema['type'] = 'integer';
        break;
      default:
        break; // email/url/trim/datetime: documented as plain strings
    }
  }
}

export function zodToJsonSchema(input: ZodTypeAny): JsonObject {
  const def = input._def as {
    typeName: ZodFirstPartyTypeKind;
    checks?: Array<{ kind: string; value?: number; regex?: RegExp }>;
    values?: readonly string[];
    shape?: () => Record<string, ZodTypeAny>;
    type?: ZodTypeAny;
    innerType?: ZodTypeAny;
    schema?: ZodTypeAny;
    isInt?: boolean;
    description?: string;
  };

  switch (def.typeName) {
    case ZodFirstPartyTypeKind.ZodString: {
      const schema: JsonObject = { type: 'string' };
      fromChecks(schema, def.checks ?? []);
      return schema;
    }
    case ZodFirstPartyTypeKind.ZodNumber: {
      const schema: JsonObject = { type: def.isInt === true ? 'integer' : 'number' };
      for (const check of def.checks ?? []) {
        if (check.kind === 'min') {
          schema['minimum'] = check.value;
        } else if (check.kind === 'max') {
          schema['maximum'] = check.value;
        } else if (check.kind === 'int') {
          schema['type'] = 'integer';
        }
      }
      return schema;
    }
    case ZodFirstPartyTypeKind.ZodBoolean:
      return { type: 'boolean' };
    case ZodFirstPartyTypeKind.ZodEnum:
      return { type: 'string', enum: [...(def.values ?? [])] };
    case ZodFirstPartyTypeKind.ZodArray:
      return { type: 'array', items: zodToJsonSchema(def.type as ZodTypeAny) };
    case ZodFirstPartyTypeKind.ZodObject: {
      const shape = def.shape?.() ?? {};
      const properties: JsonObject = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(value);
        if (!isOptional(value)) {
          required.push(key);
        }
      }
      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
        additionalProperties: false,
      };
    }
    case ZodFirstPartyTypeKind.ZodOptional:
      return zodToJsonSchema(def.innerType as ZodTypeAny);
    case ZodFirstPartyTypeKind.ZodNullable: {
      const inner = zodToJsonSchema(def.innerType as ZodTypeAny);
      return { ...inner, nullable: true };
    }
    case ZodFirstPartyTypeKind.ZodDefault:
      return zodToJsonSchema(def.innerType as ZodTypeAny);
    case ZodFirstPartyTypeKind.ZodEffects:
      // refine/transform wrappers: document the inner schema.
      return zodToJsonSchema(def.schema as ZodTypeAny);
    default:
      // Unknown construct: keep the document permissive instead of wrong.
      return {};
  }
}

function isOptional(schema: ZodTypeAny): boolean {
  return (
    schema._def.typeName === ZodFirstPartyTypeKind.ZodOptional ||
    schema._def.typeName === ZodFirstPartyTypeKind.ZodDefault
  );
}

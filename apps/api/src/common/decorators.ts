/**
 * Parametrized decorators for attaching auth metadata to controllers.
 * Source: docs/05_TECH_ARCHITECTURE.md §5–§7.
 */

import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';

import type { Role } from '@khabir/shared-types';
import type { Request } from 'express';


export const ROLES_METADATA_KEY = 'khabir:roles';
export const AUTH_KIND_METADATA_KEY = 'khabir:authKind';

/** Restrict a route to one or more roles. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);

/** Mark a route as public (skips JwtAuthGuard). */
export const IS_PUBLIC_KEY = 'khabir:isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Distinguish user vs admin auth (separate authorities). */
export type AuthKind = 'user' | 'admin';
export const AuthKind = (kind: AuthKind): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_KIND_METADATA_KEY, kind);

export interface RequestUser {
  id: string;
  role: Role;
  status: string;
  authKind: AuthKind;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    return req.user;
  },
);

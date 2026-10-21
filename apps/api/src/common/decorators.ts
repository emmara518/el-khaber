/**
 * Parametrized decorators for attaching auth metadata to controllers.
 * Source: docs/05_TECH_ARCHITECTURE.md §5–§7.
 */

import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';

import type { Role } from '@khabir/shared-types';
import type { AdminRole } from '@prisma/client';
import type { Request } from 'express';

export const ROLES_METADATA_KEY = 'khabir:roles';
export const AUTH_KIND_METADATA_KEY = 'khabir:authKind';
export const ADMIN_ROLES_METADATA_KEY = 'khabir:adminRoles';

/** Restrict a route to one or more roles. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);

/**
 * Restrict an ADMIN route to one or more admin roles (WP-Admin-01,
 * docs/09_ADMIN.md §19). Enforced server-side by JwtAuthGuard against
 * the database role (never the token claim alone). A mismatch returns
 * the same 401 as any auth failure — accepted roles are never leaked.
 */
export const AdminRoles = (...roles: AdminRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ADMIN_ROLES_METADATA_KEY, roles);

/** Mark a route as public (skips JwtAuthGuard). */
/**
 * Marks an auth-sensitive route (login/register/refresh/forgot/reset) for
 * the PostgreSQL-backed auth rate limit. The limit is applied ONLY to
 * marked routes, unlike a named @nestjs/throttler bucket which would apply
 * globally.
 */
export const AUTH_THROTTLE_METADATA_KEY = 'khabir:authThrottle';
export const AuthThrottle = (): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_THROTTLE_METADATA_KEY, true);

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

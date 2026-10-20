/**
 * Default-deny admin role guard.
 *
 * Runs AFTER JwtAuthGuard (which authenticates the admin authority and
 * loads the role from the database). Any route declared with
 * `@AuthKind('admin')` MUST also declare `@AdminRoles(...)`. Missing
 * metadata is a configuration error and denies access; it is never
 * treated as "allow all".
 *
 * A role mismatch is a 403 (authenticated but not authorized). The
 * accepted role list is never echoed in the response.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  ADMIN_ROLES_METADATA_KEY,
  AUTH_KIND_METADATA_KEY,
  type AuthKind,
  type RequestUser,
} from './decorators';
import { ForbiddenException } from './errors';

import type { Request } from 'express';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const kind = this.reflector.getAllAndOverride<AuthKind | undefined>(AUTH_KIND_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (kind !== 'admin') {
      return true;
    }

    const allowedRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ADMIN_ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowedRoles === undefined || allowedRoles.length === 0) {
      throw new ForbiddenException('Admin role policy is not configured for this route');
    }

    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const role = request.user?.role as string | undefined;
    if (request.user?.authKind !== 'admin' || role === undefined || !allowedRoles.includes(role)) {
      throw new ForbiddenException('Insufficient admin role');
    }

    return true;
  }
}

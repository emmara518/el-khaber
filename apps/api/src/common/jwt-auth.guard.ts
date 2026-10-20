/**
 * JWT authentication guard. Reads the `Authorization: Bearer <token>` header,
 * verifies the JWT against the configured secret/issuer/audience, and
 * populates `request.user` with the decoded subject and role.
 *
 * Skips routes marked with `@Public()`. For routes with `@AuthKind('admin')`,
 * uses the admin secret/issuer/audience. This keeps user and admin auth
 * in separate authority boundaries per docs/09_ADMIN.md §2 and
 * docs/10_ENGINEERING_RULES.md §14.
 *
 * Security note: when a route is annotated with `@Roles(...)` and the
 * authenticated user has a different role, this guard returns 401 rather
 * than 403. This is intentional — it avoids leaking which roles are
 * accepted by the endpoint. Use the policy module (`can`/`authorize`)
 * inside the controller for fine-grained per-resource authorization.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { getConfig } from '../config/app.config';
import { PrismaService } from '../database/prisma.service';

import {
  ADMIN_ROLES_METADATA_KEY,
  AUTH_KIND_METADATA_KEY,
  IS_PUBLIC_KEY,
  ROLES_METADATA_KEY,
  type AuthKind,
  type RequestUser,
} from './decorators';
import { AuthRequiredException } from './errors';

import type { Request } from 'express';

interface JwtPayload {
  sub: string;
  role: string;
  status: string;
  tokenVersion: number;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredKind =
      this.reflector.getAllAndOverride<AuthKind>(AUTH_KIND_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'user';

    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const header = req.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new AuthRequiredException();
    }
    const token = header.slice('Bearer '.length).trim();
    if (token.length === 0) {
      throw new AuthRequiredException();
    }

    const config = getConfig();
    const audience = requiredKind === 'admin' ? config.adminAuth.audience : config.auth.audience;
    const issuer = requiredKind === 'admin' ? config.adminAuth.issuer : config.auth.issuer;
    const secret =
      requiredKind === 'admin' ? config.adminAuth.accessSecret : config.auth.accessSecret;

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret, issuer, audience });
    } catch {
      throw new AuthRequiredException('Invalid or expired access token');
    }

    // Token claims are NOT trusted for authorization state. Re-check the
    // principal against the database so suspension and role changes take
    // effect immediately, independent of the access-token TTL. The same
    // check enforces tokenVersion: any security event (logout, password
    // reset, suspension) that invalidated the session's tokens bumps the
    // database tokenVersion, and every older access token is rejected on
    // its next request instead of lingering until its natural expiry.
    let adminRole: string | null = null;
    if (requiredKind === 'admin') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true, tokenVersion: true },
      });
      if (admin === null || admin.status !== 'active') {
        throw new AuthRequiredException();
      }
      if (admin.tokenVersion !== payload.tokenVersion) {
        throw new AuthRequiredException('Token has been revoked');
      }
      // The database is the source of truth for the admin role too
      // (WP-Admin-01): a role change or suspension applies on the next
      // request even when the access token still carries the old claim.
      payload = { ...payload, role: admin.role };
      adminRole = admin.role;
    } else {
      const principal = await this.prisma.user.findFirst({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true, tokenVersion: true },
      });
      if (principal === null || principal.status !== 'active') {
        throw new AuthRequiredException();
      }
      if (principal.tokenVersion !== payload.tokenVersion) {
        throw new AuthRequiredException('Token has been revoked');
      }
      // The database is the source of truth for the role.
      payload = { ...payload, role: principal.role };
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
      throw new AuthRequiredException();
    }

    // WP-Admin-01: admin-role matrix (docs/09_ADMIN.md §19). Only
    // evaluated for the admin authority; same 401 (never role leakage).
    if (requiredKind === 'admin') {
      const requiredAdminRoles = this.reflector.getAllAndOverride<string[] | undefined>(
        ADMIN_ROLES_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (
        requiredAdminRoles !== undefined &&
        requiredAdminRoles.length > 0 &&
        (adminRole === null || !requiredAdminRoles.includes(adminRole))
      ) {
        throw new AuthRequiredException();
      }
    }

    req.user = {
      id: payload.sub,
      role: payload.role as RequestUser['role'],
      status: payload.status,
      authKind: requiredKind,
    };
    return true;
  }
}

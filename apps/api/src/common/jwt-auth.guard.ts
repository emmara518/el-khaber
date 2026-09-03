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

import {
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredKind = this.reflector.getAllAndOverride<AuthKind>(AUTH_KIND_METADATA_KEY, [
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
    const secret = requiredKind === 'admin' ? config.adminAuth.accessSecret : config.auth.accessSecret;

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret, issuer, audience });
    } catch {
      throw new AuthRequiredException('Invalid or expired access token');
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
      throw new AuthRequiredException();
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

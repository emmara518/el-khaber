import { ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import type { Request, Response } from 'express';

import { getConfig } from '../config/app.config';

const WEB_SESSION_COOKIE = 'khabir_session';
const WEB_CSRF_COOKIE = 'khabir_csrf';
const WEB_CSRF_HEADER = 'x-khabir-csrf';

const COOKIE_PATH = '/';

function readWebOrigins(): readonly string[] {
  const raw = process.env['CORS_ORIGINS'];
  if (typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function cookieOptions() {
  const config = getConfig();
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.env === 'production',
    path: COOKIE_PATH,
  };
}

function csrfCookieOptions() {
  const config = getConfig();
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: config.env === 'production',
    path: COOKIE_PATH,
  };
}

export function assertAllowedWebOrigin(req: Request): void {
  const origin = req.headers.origin;
  const allowed = readWebOrigins();
  if (typeof origin !== 'string' || origin.length === 0 || !allowed.includes(origin)) {
    throw new ForbiddenException('WEB_ORIGIN_NOT_ALLOWED');
  }
}

export function setWebSessionCookies(
  res: Response,
  refreshToken: string,
  csrfToken: string,
): void {
  const config = getConfig();
  res.cookie(WEB_SESSION_COOKIE, refreshToken, {
    ...cookieOptions(),
    maxAge: config.auth.refreshTtlSeconds * 1000,
  });
  res.cookie(WEB_CSRF_COOKIE, csrfToken, csrfCookieOptions());
}

export function clearWebSessionCookies(res: Response): void {
  res.clearCookie(WEB_SESSION_COOKIE, cookieOptions());
  res.clearCookie(WEB_CSRF_COOKIE, csrfCookieOptions());
}

export function getWebSessionRefreshToken(req: Request): string | null {
  const value = req.cookies?.[WEB_SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getWebSessionCsrfCookie(req: Request): string | null {
  const value = req.cookies?.[WEB_CSRF_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getWebSessionCsrfHeader(req: Request): string | null {
  const value = req.headers[WEB_CSRF_HEADER];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function assertWebSessionCsrf(req: Request): void {
  const header = getWebSessionCsrfHeader(req);
  const cookie = getWebSessionCsrfCookie(req);
  if (header === null || cookie === null || header !== cookie) {
    throw new ForbiddenException('WEB_CSRF_MISMATCH');
  }
}

export function createWebSessionCsrfToken(): string {
  return randomBytes(24).toString('hex');
}




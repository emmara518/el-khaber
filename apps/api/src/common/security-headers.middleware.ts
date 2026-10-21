/**
 * Baseline HTTP security headers (Task 11C).
 *
 * Zero-dependency Express middleware implementing the standard hardening
 * headers for a JSON API. Kept explicit and minimal rather than pulling in
 * an extra dependency (no unnecessary dependency churn).
 *
 * Notes:
 *   - `X-Powered-By` is removed so the framework is never advertised.
 *   - HSTS is advertised unconditionally; browsers only honour it over
 *     HTTPS, so it is harmless on plain HTTP during local development.
 *   - CSP is intentionally NOT set here: the API serves JSON only, and a
 *     CSP is meaningful for the HTML surfaces (Admin/Landing), which are
 *     deployed separately.
 */

import type { NextFunction, Request, Response } from 'express';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.removeHeader('X-Powered-By');
  next();
}

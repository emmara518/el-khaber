/**
 * Request-ID middleware (Task 10C spec §9).
 *
 * Behavior:
 *   1. If the client sent `X-Request-Id` and it passes sanitization, it is
 *      reused (supports end-to-end tracing across gateways).
 *   2. Otherwise a cryptographically random UUID v4 is generated.
 *   3. The ID is attached to the request, echoed on the response, and
 *      installed in the AsyncLocalStorage context so every log line in
 *      the request's async chain can be correlated.
 *
 * Sanitization: 8-64 chars of [A-Za-z0-9._-] only. Anything else is
 * discarded and replaced — the value is logged, so it must never carry
 * injection payloads or unbounded length.
 *
 * The middleware must be registered FIRST (before any other middleware)
 * so the whole request lifecycle runs inside the ALS context.
 */

import { randomUUID } from 'node:crypto';

import {
  REQUEST_ID_HEADER,
  incomingRequestId,
  requestContext,
  type RequestContext,
} from './request-context';

import type { NextFunction, Request, Response } from 'express';


const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Pure sanitizer/generator. Exported for unit testing.
 * Returns the incoming ID when acceptable, otherwise a fresh UUID v4.
 */
export function resolveRequestId(incoming: string | undefined): string {
  if (incoming !== undefined && REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }
  return randomUUID();
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(incomingRequestId(req));
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const context: RequestContext = { requestId, startedAt: Date.now() };
  requestContext.run(context, () => next());
}

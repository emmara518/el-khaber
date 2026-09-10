/**
 * Request correlation context. A single `AsyncLocalStorage` instance makes
 * the request ID available anywhere in the async chain (guards, services,
 * exception filter) without threading it through every signature.
 *
 * Source: Task 10C spec §9; docs/05_TECH_ARCHITECTURE.md §16
 * (structured logs + request correlation).
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import type { Request } from 'express';

export interface RequestContext {
  requestId: string;
  startedAt: number;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/** The request ID for the current async chain, if one has been assigned. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlation ID assigned by the request-ID middleware. */
      requestId?: string;
    }
  }
}

/** Header used by clients to propagate a correlation ID. */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Read the incoming request ID header value (first value if repeated). */
export function incomingRequestId(req: Request): string | undefined {
  const raw = req.headers[REQUEST_ID_HEADER.toLowerCase()];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

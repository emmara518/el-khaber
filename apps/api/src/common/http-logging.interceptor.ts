/**
 * Structured HTTP request logging (Task 10C spec §10).
 *
 * One JSON line per successful request:
 *   { ts, level, requestId, method, path, status, durationMs }
 *
 * `path` is the URL path WITHOUT the query string, so credentials or
 * tokens accidentally passed in a query never reach the logs. Request
 * and response bodies are NEVER logged. Error responses are logged by
 * the `ApiExceptionFilter` (which knows the final status code and error
 * code), so the two layers never double-log a request.
 */

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

import { requestContext } from './request-context';

import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

interface RequestLogEntry {
  ts: string;
  level: 'info';
  requestId: string | undefined;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = requestContext.getStore()?.startedAt ?? Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.write(req, res.statusCode, startedAt);
        },
      }),
    );
  }

  private write(req: Request, status: number, startedAt: number): void {
    if (status >= 400) {
      // Error responses are logged by the exception filter with the
      // canonical error code attached.
      return;
    }
    const entry: RequestLogEntry = {
      ts: new Date().toISOString(),
      level: 'info',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status,
      durationMs: Date.now() - startedAt,
    };
    this.logger.log(JSON.stringify(entry));
  }
}

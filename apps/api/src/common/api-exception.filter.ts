/**
 * Global exception filter. Converts any thrown error into the standard
 * `ApiError` envelope defined in `docs/07_API.md §3`. Internal error
 * details (stack traces, SQL messages) are NEVER leaked in production.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §20, §22; docs/10_ENGINEERING_RULES.md §24.
 */

import { ERROR_CODE, type ApiError, type ErrorCode } from '@khabir/shared-types';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

import { getConfig } from '../config/app.config';

import { ApiException } from './errors';

import type { Request, Response } from 'express';




@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const config = getConfig();

    let status = 500;
    let code: ErrorCode = ERROR_CODE.INTERNAL_ERROR;
    let message = 'Internal server error';
    let fields: Record<string, string> | undefined;

    if (exception instanceof ApiException) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      fields = exception.fields;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        const m = obj['message'];
        if (typeof m === 'string') {
          message = m;
        } else if (Array.isArray(m) && m.length > 0) {
          message = m.join('; ');
        }
        // Map NestJS BadRequestException to VALIDATION_ERROR.
        code = status === 400 ? ERROR_CODE.VALIDATION_ERROR : mapStatusToCode(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error on ${req.method} ${req.url}: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unhandled non-error on ${req.method} ${req.url}: ${String(exception)}`);
    }

    // Never leak internal error details in production.
    if (config.env === 'production' && status >= 500) {
      message = 'Internal server error';
    }

    const body: ApiError = {
      error: {
        code,
        message,
        ...(fields !== undefined ? { fields } : {}),
      },
    };

    res.status(status).json(body);
  }
}

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ERROR_CODE.VALIDATION_ERROR;
    case 401:
      return ERROR_CODE.AUTH_INVALID;
    case 403:
      return ERROR_CODE.FORBIDDEN;
    case 404:
      return ERROR_CODE.NOT_FOUND;
    case 409:
      return ERROR_CODE.CONFLICT;
    case 429:
      return ERROR_CODE.RATE_LIMITED;
    default:
      return ERROR_CODE.INTERNAL_ERROR;
  }
}

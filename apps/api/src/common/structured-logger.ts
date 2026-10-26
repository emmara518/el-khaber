import { LoggerService } from '@nestjs/common';

import { getRequestId } from './request-context';

export interface StructuredLogFields {
  event: string;
  durationMs?: number;
  [key: string]: unknown;
}

export class StructuredLogger implements LoggerService {
  constructor(private readonly context: string) {}

  log(message: string, fields: StructuredLogFields = { event: 'log' }): void {
    this.write('info', message, fields);
  }

  error(message: string, fields: StructuredLogFields = { event: 'error' }): void {
    this.write('error', message, fields);
  }

  warn(message: string, fields: StructuredLogFields = { event: 'warn' }): void {
    this.write('warn', message, fields);
  }

  debug(message: string, fields: StructuredLogFields = { event: 'debug' }): void {
    this.write('debug', message, fields);
  }

  verbose(message: string, fields: StructuredLogFields = { event: 'verbose' }): void {
    this.write('verbose', message, fields);
  }

  private write(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    fields: StructuredLogFields,
  ): void {
    const { event, durationMs, ...details } = fields;
    const entry = {
      ts: new Date().toISOString(),
      level,
      event,
      requestId: getRequestId(),
      context: this.context,
      message,
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...details,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }
}

/**
 * Nest LoggerService adapter used by pp.useLogger. It keeps all framework
 * logs on the same one-JSON-object-per-line contract while preserving the
 * optional Nest context string as a field.
 */
export class NestStructuredLogger implements LoggerService {
  private readonly logger = new StructuredLogger('Nest');

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  private write(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const nestContext = optionalParams.find((p) => typeof p === 'string') as string | undefined;
    const fields: StructuredLogFields = {
      event: 'nest.log',
      ...(nestContext !== undefined ? { nestContext } : {}),
    };
    const text = String(message);
    if (level === 'info') this.logger.log(text, fields);
    else if (level === 'error') this.logger.error(text, fields);
    else if (level === 'warn') this.logger.warn(text, fields);
    else if (level === 'debug') this.logger.debug(text, fields);
    else this.logger.verbose(text, fields);
  }
}
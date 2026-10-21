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
    const entry = {
      ts: new Date().toISOString(),
      level,
      event: fields.event,
      requestId: getRequestId(),
      context: this.context,
      message,
      durationMs: fields.durationMs,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }
}

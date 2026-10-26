import { afterEach, describe, expect, it, vi } from 'vitest';

import { NestStructuredLogger, StructuredLogger } from '../src/common/structured-logger';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StructuredLogger', () => {
  it('preserves diagnostic fields as one JSON object per line', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    new StructuredLogger('TestContext').warn('request failed', {
      event: 'http.error',
      durationMs: 12,
      status: 409,
      code: 'CONFLICT',
      detail: 'safe detail',
    });

    expect(write).toHaveBeenCalledOnce();
    const line = String(write.mock.calls[0]?.[0]);
    expect(line.endsWith('\n')).toBe(true);
    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: 'warn',
      event: 'http.error',
      context: 'TestContext',
      message: 'request failed',
      durationMs: 12,
      status: 409,
      code: 'CONFLICT',
      detail: 'safe detail',
    });
  });

  it('adapts Nest LoggerService calls into the same JSON line contract', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    new NestStructuredLogger().log('Nest boot message', 'Bootstrap');

    const entry = JSON.parse(String(write.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: 'info',
      event: 'nest.log',
      nestContext: 'Bootstrap',
      message: 'Nest boot message',
    });
  });
});

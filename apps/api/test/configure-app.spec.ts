import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApp } from '../src/bootstrap/configure-app';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';

beforeEach(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['DATABASE_URL'] = 'postgresql://test/test';
  process.env['DIRECT_URL'] = 'postgresql://test/test';
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-test-access-secret-32';
  process.env['ADMIN_JWT_ACCESS_SECRET'] = 'test-admin-secret-test-admin-secret-32';
  process.env['CORS_ORIGINS'] = 'http://localhost:3001';
  process.env['TRUST_PROXY_HOPS'] = '1';
  process.env['API_GLOBAL_PREFIX'] = 'api/v1';
});

describe('shared HTTP bootstrap configuration', () => {
  it('applies prefix, proxy trust, CORS and the exception filter', () => {
    const app = {
      setGlobalPrefix: vi.fn(),
      use: vi.fn(),
      set: vi.fn(),
      enableCors: vi.fn(),
      useGlobalFilters: vi.fn(),
    };
    const cookieParser = vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next());

    configureApp(app as never, cookieParser);

    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
    expect(cookieParser).toHaveBeenCalledOnce();
    expect(app.set).toHaveBeenCalledWith('trust proxy', 1);
    expect(app.enableCors).toHaveBeenCalledOnce();
    expect(app.useGlobalFilters).toHaveBeenCalledOnce();
    expect(app.useGlobalFilters.mock.calls[0]?.[0]).toBeInstanceOf(ApiExceptionFilter);
  });
});

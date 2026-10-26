import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParserImport from 'cookie-parser';

import { ApiExceptionFilter } from '../common/api-exception.filter';
import { getConfig } from '../config/app.config';

/**
 * Shared HTTP bootstrap configuration.
 *
 * `main.ts` and the real-HTTP test harness MUST use this function so the
 * tested app and the production app agree on prefix, cookie parsing, proxy
 * trust, CORS, and the canonical exception filter.
 */
export function configureApp(
  app: NestExpressApplication,
  cookieParserFactory?: () => unknown,
): void {
  const config = getConfig();

  app.setGlobalPrefix(config.globalPrefix);
  const parserFactory =
    cookieParserFactory ??
    (typeof cookieParserImport === 'function'
      ? cookieParserImport
      : (cookieParserImport as unknown as { default: typeof cookieParserImport }).default);
  app.use(parserFactory());
  app.set('trust proxy', config.trustProxyHops);

  if (config.corsOrigins.length > 0) {
    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (origin === undefined) {
          callback(null, true);
          return;
        }
        if (config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed`), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  }

  app.useGlobalFilters(new ApiExceptionFilter());
}

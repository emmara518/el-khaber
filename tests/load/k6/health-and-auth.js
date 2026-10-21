/**
 * k6 smoke/load profile for the V2.1 API.
 *
 * SAFETY:
 * - Target MUST be an approved UAT host with disposable data.
 * - Never point BASE_URL at production or at a database with real users.
 * - This script performs read-only health checks and intentionally invalid
 *   refresh attempts (401/429). It never logs in with real credentials.
 *
 * Run:
 *   k6 run -e BASE_URL=https://UAT-HOST/api/v1 tests/load/k6/health-and-auth.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3010/api/v1';

const unexpected = new Rate('unexpected_status');

const smoke = __ENV.SMOKE === 'true';

export const options = smoke
  ? { vus: 2, duration: '3s' }
  : {
  scenarios: {
    steady: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    // 401 on the invalid refresh is EXPECTED; do not use http_req_failed.
    http_req_duration: ['p(95)<800'],
    unexpected_status: ['rate<0.01'],
  },
    };

export default function () {
  const health = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
  const healthOk = check(health, {
    'health responds 200': (r) => r.status === 200,
  });
  unexpected.add(!healthOk, { endpoint: 'health' });

  // Deliberately invalid token: the expected result is 401, or 429 if the
  // auth budget is exhausted. This exercises the auth path without secrets.
  const refresh = http.post(
    `${BASE_URL}/auth/refresh`,
    JSON.stringify({ refreshToken: 'invalid-token-for-load-test-000000' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'refresh' } },
  );
  const refreshOk = check(refresh, {
    'refresh rejects invalid token': (r) => r.status === 401 || r.status === 429,
  });
  unexpected.add(!refreshOk, { endpoint: 'refresh' });

  sleep(1);
}

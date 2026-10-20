/**
 * k6 authenticated-path profile.
 *
 * Requires a dedicated UAT account whose credentials are supplied only via
 * environment variables. Never commit credentials. The account must not be a
 * real customer, admin, or technician.
 *
 * Run:
 *   k6 run \
 *     -e BASE_URL=https://UAT-HOST/api/v1 \
 *     -e TEST_EMAIL=qa-load@qa.khabir.app \
 *     -e TEST_PASSWORD='<UAT-only-password>' \
 *     tests/load/k6/auth-login.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3010/api/v1';
const EMAIL = __ENV.TEST_EMAIL || '';
const PASSWORD = __ENV.TEST_PASSWORD || '';

const smoke = __ENV.SMOKE === 'true';

export const options = smoke
  ? { vus: 2, duration: '2s' }
  : {
      vus: 5,
      duration: '1m',
      thresholds: {
        http_req_failed: ['rate<0.02'],
        http_req_duration: ['p(95)<1200'],
      },
    };

export default function () {
  if (EMAIL === '' || PASSWORD === '') {
    throw new Error('TEST_EMAIL and TEST_PASSWORD are required (UAT-only account).');
  }

  const login = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } },
  );
  const ok = check(login, { 'login 200': (r) => r.status === 200 });
  if (!ok) {
    sleep(2);
    return;
  }

  let accessToken = '';
  try {
    accessToken = login.json('data.accessToken') || '';
  } catch {
    accessToken = '';
  }

  const me = http.get(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    tags: { endpoint: 'me' },
  });
  check(me, { 'me 200': (r) => r.status === 200 });

  sleep(2);
}

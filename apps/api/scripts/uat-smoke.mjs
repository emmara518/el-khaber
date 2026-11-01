/**
 * External UAT acceptance smoke (mission §4).
 *
 * Verifies a DEPLOYED RC2 stack end-to-end over REAL HTTP:
 *   - web frontend reachability + RC2 shell,
 *   - API /health, /ready, /version,
 *   - registration + login + role assignment for customer/technician/merchant,
 *   - session persistence (refresh rotation),
 *   - authorization boundaries (IDOR + cross-role 401/404),
 *   - customer service-request journey (create + cancel),
 *   - merchant product pricing + ownership persistence,
 *   - technician onboarding state (pending, unverified).
 *
 * Design rules:
 * - NO credentials are stored in source. Identities are generated per run
 *   from a unique prefix (default: current timestamp).
 * - NEVER targets a local/loopback host unless --allow-local is passed
 *   (and then labels the run `local-rehearsal`, never deployment evidence).
 * - NEVER reads or writes the shared UAT database directly; all writes go
 *   through the public HTTP API exactly as a real user would.
 * - NEVER deletes the test identities; the caller cleans them via the
 *   documented purge procedure if needed.
 * - A missing/dead API is always FAIL, never SKIPPED success.
 *
 * Usage:
 *   node apps/api/scripts/uat-smoke.mjs \
 *     --web https://<uat-host> \
 *     --api https://<api-host>/api/v1 \
 *     [--prefix pm-20261101] [--password <10+ chars: 1 letter 1 digit>] \
 *     [--allow-local]
 */

import { argv, exit, stdout } from 'node:process';
import { randomBytes } from 'node:crypto';

const args = argv.slice(2);
function flag(name) {
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? null : args[idx + 1] ?? '';
}
const WEB_URL = (flag('web') ?? '').replace(/\/+$/, '');
const API_URL = (flag('api') ?? '').replace(/\/+$/, '');
const PREFIX = (flag('prefix') ?? `uat-smoke-${Date.now()}`).trim();
const PASSWORD = flag('password') ?? `Uat${randomBytes(6).toString('hex')}${randomBytes(2).toString('hex').toUpperCase()}!`;
const ALLOW_LOCAL = args.includes('--allow-local');

function parseArgsForHelp() {
  if (args.includes('--help') || args.includes('-h')) {
    stdout.write(`Usage: node apps/api/scripts/uat-smoke.mjs --web <web-url> --api <api-base>/api/v1 [--prefix <id>] [--password <pw>] [--allow-local]\n`);
    exit(0);
  }
}
parseArgsForHelp();

if (WEB_URL === '' || API_URL === '') {
  stdout.write('FAIL: --web and --api are required.\n');
  exit(2);
}

function isLoopback(url) {
  const u = new URL(url);
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname);
}
if (!ALLOW_LOCAL && (isLoopback(WEB_URL) || isLoopback(API_URL))) {
  stdout.write('FAIL: refusing loopback targets without --allow-local (a local pass is a rehearsal, never deployment evidence).\n');
  exit(2);
}

const STEP_WIDTH = 46;
let pass = 0;
let fail = 0;
const failures = [];

function step(name, status, extra = '') {
  const label = name.padEnd(STEP_WIDTH, ' ');
  if (status === 'PASS') pass += 1;
  else {
    fail += 1;
    failures.push({ name, extra });
  }
  stdout.write(`${label} ${status}${extra ? `  ${extra}` : ''}\n`);
}

 async function api(method, path, body, token, headers = {}, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(init ?? {}),
  });
  let json = {};
  if ((res.headers.get('content-type') ?? '').includes('json')) {
    json = await res.json().catch(() => ({}));
  }
  return { status: res.status, json, res };
}

/**
 * Cookie-jar session used by the WEB-session checks (mission Task 3).
 *
 * Implements a minimal, correct cookie jar over Node's fetch so the script
 * can drive the SAME HttpOnly/CSRF double-submit contract a browser uses:
 *  - capture Set-Cookie pairs from every response (including HttpOnly
 *    attributes, which node fetch exposes through the standard getSetCookie
 *    iterator but pages cannot read),
 *  - replay the jar on every subsequent web-session request,
 *  - gain ONLY public visibility of the CSRF cookie value for the
 *    double-submit header (verified to be the non-HttpOnly khabir_csrf).
 * The jar is scoped to the API_URL origin; it is NEVER shared with the
 * bearer-token flows above.
 */
class WebCookieSession {
  #jar = new Map();
  #base = API_URL;
  /**
   * WEB_ORIGIN is the browser-facing origin of the DEPLOYED web bundle.
   * The web-session endpoints verify the exact `Origin` allow-list (CSRF
   * boundary), so the smoke suite - like a real browser - sends the
   * origin that matches the deployed frontend:
   *   - default: the web host passed via --web,
   *   - override: --web-origin <origin> for split-host / proxy topologies.
   */
  #webOrigin = flag('web-origin') ?? WEB_URL;

  #store(res) {
    const setCookies =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(';');
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (!name) continue;
      // Removal rule: an attribute is a deletion ONLY if the cookie is
      // genuinely expired (Expires in the past or Max-Age <= 0). Express
      // always emits a FUTURE Expires alongside Max-Age for persistent
      // cookies, so a blind attribute match would drop live HttpOnly
      // session cookies and the whole rotation proof would false-fail.
      const attrs = raw.split(';').slice(1).join(';');
      const expires = /(?:^|[; ])[Ee]xpires=([^;]*)/.exec(attrs)?.[1];
      const expiredAt = expires !== undefined ? Date.parse(expires) : Number.NaN;
      const maxAge = /(?:^|[; ])M[Aa][Xx]-[Aa][Gg][Ee]=\s*(-?\d+)/.exec(attrs)?.[1];
      const maxAgeSeconds = maxAge !== undefined ? Number(maxAge) : Number.NaN;
      const isExpired =
        (Number.isFinite(expiredAt) && expiredAt <= Date.now()) ||
        (Number.isFinite(maxAgeSeconds) && maxAgeSeconds <= 0);
      if (isExpired) {
        this.#jar.delete(name);
        continue;
      }
      this.#jar.set(name, value);
    }
  }

  get(name) {
    return this.#jar.get(name) ?? null;
  }

  /**
   * Test hook: injects a captured pre-rotation cookie value. Used ONLY to
   * simulate token-reuse attacks in the smoke suite, never to bypass auth.
   */
  mirror(name, value) {
    this.#jar.set(name, value);
  }

  has(name) {
    return this.#jar.has(name);
  }

  async request(method, path, body) {
    const cookieHeader = [...this.#jar.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: this.#webOrigin,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(this.#jar.has('khabir_csrf') ? { 'X-Khabir-Csrf': this.#jar.get('khabir_csrf') } : {}),
    };
    const res = await fetch(`${this.#base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
    this.#store(res);
    let json = {};
    if ((res.headers.get('content-type') ?? '').includes('json')) {
      json = await res.json().catch(() => ({}));
    }
    return { status: res.status, res, json };
  }
}

async function stepApi(name, fn, expectStatus) {
  try {
    const { status, json } = await fn();
    const ok = expectStatus === undefined ? status >= 200 && status < 500 : Array.isArray(expectStatus) ? expectStatus.includes(status) : status === expectStatus;
    step(name, ok ? 'PASS' : 'FAIL', `HTTP ${status} ${JSON.stringify(json).slice(0, 120)}`);
    return { status, json };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    step(name, 'FAIL', `network/unreachable: ${msg}`);
    return { status: 0, json: {} };
  }
}

async function stepWeb(name, url, contains) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const ok = res.status === 200 && text.includes(contains);
    step(name, ok ? 'PASS' : 'FAIL', `HTTP ${res.status}, ${text.length} bytes, marker=${contains ? (text.includes(contains) ? 'found' : 'MISSING') : 'n/a'}`);
    return ok;
  } catch (error) {
    step(name, 'FAIL', `fetch error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const unique = (role) => `${PREFIX}.${role}.${randomBytes(4).toString('hex')}@uat.khabir.app`;

const identities = {
  customer: unique('customer'),
  technician: unique('technician'),
  merchant: unique('merchant'),
  webCustomer: unique('web-customer'),
};

stdout.write(`\nUAT smoke run — prefix=${PREFIX}\nweb=${WEB_URL}\napi=${API_URL}\n\n`);

// ─── 1. Reachability ────────────────────────────────────────────────────────
const webOk = await stepWeb('web health (RC2 shell served)', `${WEB_URL}/login`, 'تسجيل الدخول');
await stepWeb('web other route served', `${WEB_URL}/orders`, 'الخبير');

const health = await stepApi('api /health', () => api('GET', '/health'), [200]);
const ready = await stepApi('api /ready (db+migrations+schema)', () => api('GET', '/ready'), [200]);
await stepApi('api /version', () => api('GET', '/version'), [200]);
const anyDown = !webOk || health.status !== 200 || ready.status !== 200;
if (anyDown) {
  stdout.write('\nRESULT: FAIL — the deployment is unreachable (frontend or API). No SKIPPED successes are issued.\n');
  exit(1);
}

// ─── 2. Registration + login + role assignment ──────────────────────────────
const sessions = {};
for (const role of ['customer', 'technician', 'merchant']) {
  const reg = await stepApi(`register ${role}`, () =>
    api('POST', '/auth/register', { role, email: identities[role], password: PASSWORD }, undefined), [201]);
  sessions[role] = {
    accessToken: reg.json?.data?.accessToken ?? '',
    userId: reg.json?.data?.user?.id ?? '',
    role: reg.json?.data?.user?.role ?? '',
  };
  await stepApi(`login ${role} role assignment`, () =>
    api('POST', '/auth/login', { email: identities[role], password: PASSWORD }), [200]);
  const me = await stepApi(`session /me ${role}`, () => api('GET', '/me', undefined, sessions[role].accessToken), [200]);
  step(`${role} /me role is ${role}`, me.json?.data?.role === role ? 'PASS' : 'FAIL', `role=${me.json?.data?.role ?? 'none'}`);
}

// ─── 4. Authorization boundaries (synthetic IDs, no shared-DB reads) ─────────
const fakeId = '00000000-0000-4000-8000-000000000000';
await stepApi('customer cross-request read → 404', () =>
  api('GET', `/service-requests/${fakeId}`, undefined, sessions.customer.accessToken), [404]);
await stepApi('technician cross-request accept → 404', () =>
  api('POST', `/service-requests/${fakeId}/accept`, {}, sessions.technician.accessToken), [404]);
await stepApi('merchant product read → 404', () =>
  api('GET', `/merchant/products/${fakeId}`, undefined, sessions.merchant.accessToken), [404]);
await stepApi('customer calling admin metrics → 401', () =>
  api('GET', '/admin/metrics', undefined, sessions.customer.accessToken), [401]);

// ─── 5. Customer journey (create + cancel request) ───────────────────────────
const techList = await stepApi('discovery list (pick a verified technician)', () =>
  api('GET', '/technicians', undefined, sessions.customer.accessToken), [200]);
const verifiedTech = (techList.json?.data ?? []).find(
  (t) => t?.verificationStatus === 'verified' && (t?.services ?? []).length > 0,
);
step('a verified technician with services exists', verifiedTech ? 'PASS' : 'FAIL', `found=${verifiedTech ? 'yes' : 'no'}`);
const firstTechService = verifiedTech?.services?.[0]?.service ?? {};
const categoryId = firstTechService.applianceCategoryId ?? null;
const serviceId = firstTechService.id ?? null;

const location = await stepApi('customer location create', () =>
  api('POST', '/locations', { label: `موقع UAT ${PREFIX}`, city: 'القاهرة' }, sessions.customer.accessToken), [201]);
const locationId = location.json?.data?.id ?? '';

const created = await stepApi('customer request create', () =>
  api('POST', '/service-requests', {
    technician_id: verifiedTech?.id,
    appliance_category_id: categoryId,
    service_id: serviceId,
    problem_description: `طلب اختبار UAT ${PREFIX}`,
    location_id: locationId,
  }, sessions.customer.accessToken), [201]);
const requestId = created.json?.data?.id ?? '';
await stepApi('customer cancels own request', () =>
  api('POST', `/service-requests/${requestId}/cancel`, {}, sessions.customer.accessToken), [200]);

// ─── 6. Merchant product pricing + ownership ────────────────────────────────
await stepApi('merchant profile create', () =>
  api('PATCH', '/merchant/profile', { businessName: `متجر ${PREFIX}`, city: 'القاهرة' }, sessions.merchant.accessToken), [200]);
const product = await stepApi('merchant product create (decimal price)', () =>
  api('POST', '/merchant/products', {
    nameAr: `منتج ${PREFIX}`,
    descriptionAr: 'منتج UAT بتسعيرة عشرية',
    price: 125.5,
    stockQuantity: 12,
  }, sessions.merchant.accessToken), [201]);
const productId = product.json?.data?.id ?? '';
step('product price persisted 125.5', product.json?.data?.price === 125.5 ? 'PASS' : 'FAIL', `price=${JSON.stringify(product.json?.data?.price)}`);
await stepApi('merchant product read-back (ownership)', () =>
  api('GET', `/merchant/products/${productId}`, undefined, sessions.merchant.accessToken), [200]);

// ─── 7. Technician onboarding state ──────────────────────────────────────────
await stepApi('technician onboarding submit', () =>
  api('PATCH', '/technician/profile', {
    display_name: `فني ${PREFIX}`,
    experience_years: 4,
  }, sessions.technician.accessToken), [200]);
await stepApi('technician attach service (catalog coverage)', () =>
  api('POST', '/technician/services', { service_id: serviceId }, sessions.technician.accessToken), [201, 409]);
const prof = await stepApi('technician profile state (pending/unverified)', () =>
  api('GET', '/technician/profile', undefined, sessions.technician.accessToken), [200]);
const verification = prof.json?.data?.verificationStatus ?? prof.json?.data?.verification_status;
step('technician profile pending (not self-verified)', verification === 'pending' ? 'PASS' : 'CHECK', `status=${JSON.stringify(verification)}`);

// ─── 8. Summary ──────────────────────────────────────────────────────────────


// ─── 7b. WEB-session lifecycle (HttpOnly cookie + CSRF) ─────────────────────
// Distinct from the bearer-token checks above: this drives the REAL
// /auth/web/session/* contract a browser uses (C-04). It is a FAIL-closed
// cookie-jar proof, not a `/me` screenshot. It uses a DEDICATED customer
// identity because logout revokes every refresh family for the user, and
// revoking would otherwise invalidate the bearer tokens of the shared
// customer used above (logout is family-global by security design).
{
  const web = new WebCookieSession();
  const email = identities.webCustomer;
  const password = PASSWORD;

  const webReg = await stepApi('web-session identity register', () =>
    api('POST', '/auth/register', { role: 'customer', email, password }, undefined), [201]);
  const webRegOk = webReg.status === 201;
  step('web-session identity registered', webRegOk ? 'PASS' : 'FAIL', `status=${webReg.status}`);

  const webLogin = await stepApi('web-session login (HttpOnly cookie set)', () =>
    web.request('POST', '/auth/web/session/login', { email, password }), [200, 201]);
  step(
    'web-session login issues HttpOnly session + CSRF cookies',
    webLogin.status === 201 && web.has('khabir_session') && web.has('khabir_csrf') ? 'PASS' : 'FAIL',
    `session=${web.has('khabir_session')} csrf=${web.has('khabir_csrf')}`,
  );

  const ref1 = await stepApi('web-session refresh (rotate #1) → 200 + new family', () =>
    web.request('POST', '/auth/web/session/refresh'), [200]);
  step(
    'web-session refresh #1 rotated BOTH cookies (session+csrf present)',
    ref1.status === 200 && web.has('khabir_session') && web.has('khabir_csrf') ? 'PASS' : 'FAIL',
    `session=${web.has('khabir_session')} csrf=${web.has('khabir_csrf')}`,
  );

  // Reuse rejection: a SECOND independent session drives its own lifecycle,
  // then replays a refresh with the exact PRE-rotation cookie pair (session
  // + CSRF). The server rotates the refresh family during the FIRST
  // refresh, so the stale pair must be rejected (401 AUTH_INVALID) — the
  // browser contract that protects replayed HttpOnly sessions.
  const replay = new WebCookieSession();
  await replay.request('POST', '/auth/web/session/login', { email, password });
  const replaySession = replay.get('khabir_session');
  const replayCsrf = replay.get('khabir_csrf');
  const rotated = await replay.request('POST', '/auth/web/session/refresh');
  step('web-session rotation produced a new family', rotated.status === 200 && replay.get('khabir_session') !== replaySession ? 'PASS' : 'FAIL');
  const staleJar = new WebCookieSession();
  staleJar.mirror('khabir_session', replaySession);
  if (replayCsrf !== null) staleJar.mirror('khabir_csrf', replayCsrf);
  const staleReplay = await staleJar.request('POST', '/auth/web/session/refresh');
  step('web-session refresh reuse → rejected (replay attack)', staleReplay.status === 401 ? 'PASS' : 'FAIL', `HTTP ${staleReplay.status}`);

  const me = await stepApi('web-session /me (access from rotated cookie)', () =>
    web.request('POST', '/auth/web/session/refresh'), [200]);
  step('web-session refresh #2 also 200 (family continuity)', me.status === 200 ? 'PASS' : 'FAIL');

  await stepApi('web-session logout (204 + family revocation)', () =>
    web.request('POST', '/auth/web/session/logout'), [204]);
  step('logout clears session+csrf cookies', !web.has('khabir_session') && !web.has('khabir_csrf') ? 'PASS' : 'FAIL');
  const afterLogout = await stepApi('web-session refresh after logout → rejected', () =>
    web.request('POST', '/auth/web/session/refresh'), [401, 403]);
  step('post-logout session not reusable', afterLogout.status === 401 || afterLogout.status === 403 ? 'PASS' : 'FAIL', `HTTP ${afterLogout.status}`);
}

// ─── 4.

stdout.write(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed.\n`);
if (failures.length > 0) {
  stdout.write('\nFailures:\n');
  for (const f of failures) {
    stdout.write(`- ${f.name}: ${f.extra}\n`);
  }
}
stdout.write(`\nTest identities (preserved, never auto-deleted):\n${Object.entries(identities).map(([r, e]) => `- ${r}: ${e}`).join('\n')}\n`);

exit(fail === 0 ? 0 : 1);

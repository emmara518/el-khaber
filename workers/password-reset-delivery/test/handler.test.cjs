const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const worker = require('../dist-test/index.js').default;

const TOKEN = 'tok';
const TOKEN_VAL = 'aBcD1234efGh5678ijKl';

function env(over = {}) {
  return {
    WORKER_AUTH_TOKEN: TOKEN,
    RESET_WEB_ORIGIN: 'https://el-khabir-uat.vercel.app',
    RESEND_API_KEY: 'rk',
    RESEND_FROM_EMAIL: 'no-reply@khabir.dev',
    ...over,
  };
}

function mkreq(body, { method = 'POST', auth = `Bearer ${TOKEN}`, path = '/' } = {}) {
  const headers = {};
  if (auth !== null) headers['authorization'] = auth;
  const withBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  return new Request(`https://worker.example${path}`, {
    method,
    headers,
    body: withBody ? body : undefined,
  });
}

const emailBody = JSON.stringify({
  purpose: 'password_reset',
  contact: { email: 'u@example.com' },
  token: TOKEN_VAL,
});

let savedFetch;
let savedLog;
let logs;

beforeEach(() => {
  savedFetch = globalThis.fetch;
  savedLog = console.log;
  logs = [];
  console.log = (...a) => logs.push(a.join(' '));
});

afterEach(() => {
  globalThis.fetch = savedFetch;
  console.log = savedLog;
});

test('email request → 200 with exactly one Resend call', async () => {
  let calls = 0;
  let sent = null;
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    sent = JSON.parse(init.body);
    return new Response(null, { status: 200 });
  };
  const res = await worker.fetch(mkreq(emailBody), env());
  assert.equal(res.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(sent.to, ['u@example.com']);
});

test('dual contact → email only (one call, to the email)', async () => {
  let calls = 0;
  let sent = null;
  globalThis.fetch = async (_url, init) => {
    calls += 1;
    sent = JSON.parse(init.body);
    return new Response(null, { status: 200 });
  };
  const body = JSON.stringify({
    purpose: 'password_reset',
    contact: { email: 'u@example.com', phone: '+201012345678' },
    token: TOKEN_VAL,
  });
  const res = await worker.fetch(mkreq(body), env());
  assert.equal(res.status, 200);
  assert.equal(calls, 1);
  assert.deepEqual(sent.to, ['u@example.com']);
});

test('phone-only → 422 unsupported and NO provider call (SMS deferred)', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 200 });
  };
  const body = JSON.stringify({
    purpose: 'password_reset',
    contact: { phone: '+201012345678' },
    token: TOKEN_VAL,
  });
  const res = await worker.fetch(mkreq(body), env());
  assert.equal(res.status, 422);
  assert.equal(calls, 0);
});

test('invalid worker auth → 401 (no provider call)', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 200 });
  };
  const bad = await worker.fetch(mkreq(emailBody, { auth: 'Bearer wrong' }), env());
  assert.equal(bad.status, 401);
  const missing = await worker.fetch(mkreq(emailBody, { auth: null }), env());
  assert.equal(missing.status, 401);
  assert.equal(calls, 0);
});

test('malformed body → 400', async () => {
  const res = await worker.fetch(mkreq('{not json'), env());
  assert.equal(res.status, 400);
});

test('wrong purpose → 400', async () => {
  const body = JSON.stringify({ purpose: 'signup', contact: { email: 'u@example.com' }, token: TOKEN_VAL });
  const res = await worker.fetch(mkreq(body), env());
  assert.equal(res.status, 400);
});

test('placeholder/weak token → 400 with NO provider call (never emailed)', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 200 });
  };
  const body = JSON.stringify({
    purpose: 'password_reset',
    contact: { email: 'u@example.com' },
    token: 'testtoken123',
  });
  const res = await worker.fetch(mkreq(body), env());
  assert.equal(res.status, 400);
  assert.equal(calls, 0);
});

test('wrong method → 405', async () => {
  const res = await worker.fetch(mkreq(undefined, { method: 'GET' }), env());
  assert.equal(res.status, 405);
});

test('provider failure → 502 (non-2xx)', async () => {
  globalThis.fetch = async () => new Response('provider says no', { status: 500 });
  const res = await worker.fetch(mkreq(emailBody), env());
  assert.equal(res.status, 502);
  const text = await res.text();
  assert.ok(!text.includes('provider says no'), 'provider body must not leak');
});

test('raw reset token and PII are never logged', async () => {
  globalThis.fetch = async () => new Response(null, { status: 200 });
  await worker.fetch(mkreq(emailBody), env());
  const all = logs.join('\n');
  assert.ok(!all.includes(TOKEN_VAL), 'token must not be logged');
  assert.ok(!all.includes('u@example.com'), 'email must not be logged');
});

test('reset origin cannot be overridden by the request body', async () => {
  let html = '';
  globalThis.fetch = async (_url, init) => {
    html = JSON.parse(init.body).html;
    return new Response(null, { status: 200 });
  };
  const body = JSON.stringify({
    purpose: 'password_reset',
    contact: { email: 'u@example.com' },
    token: TOKEN_VAL,
    redirect: 'https://evil.example/steal',
    origin: 'https://evil.example',
  });
  const res = await worker.fetch(mkreq(body), env());
  assert.equal(res.status, 200);
  assert.ok(html.includes('https://el-khabir-uat.vercel.app/reset-password'), 'fixed origin used');
  assert.ok(!html.includes('evil.example'), 'attacker origin must not appear');
});

test('oversized body → non-2xx', async () => {
  const huge = 'x'.repeat(8000);
  const res = await worker.fetch(mkreq(huge), env());
  assert.ok(res.status >= 400, `expected non-2xx, got ${res.status}`);
});

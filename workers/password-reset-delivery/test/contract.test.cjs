const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_BODY_BYTES,
  bearerFrom,
  buildResetLink,
  parseDeliveryRequest,
  routeContact,
  safeEqual,
} = require('../dist-test/contract.js');

const TOKEN = 'aBcD1234efGh5678';
const body = (contact, extra = {}) =>
  JSON.stringify({ purpose: 'password_reset', contact, token: TOKEN, ...extra });

test('email-only request is accepted and routes to email', () => {
  const r = parseDeliveryRequest(body({ email: 'u@example.com' }));
  assert.equal(r.ok, true);
  assert.equal(routeContact(r.value.contact), 'email');
});

test('phone-only request is schema-valid but routes to NO channel (SMS deferred)', () => {
  const r = parseDeliveryRequest(body({ phone: '+201012345678' }));
  assert.equal(r.ok, true);
  assert.equal(routeContact(r.value.contact), null);
});

test('dual-contact routes to email only', () => {
  const r = parseDeliveryRequest(body({ email: 'u@example.com', phone: '+201012345678' }));
  assert.equal(r.ok, true);
  assert.equal(routeContact(r.value.contact), 'email');
});

test('neither contact is rejected by the contract', () => {
  assert.equal(parseDeliveryRequest(body({})).ok, false);
});

test('wrong purpose is rejected', () => {
  assert.equal(
    parseDeliveryRequest(JSON.stringify({ purpose: 'signup', contact: { email: 'u@example.com' }, token: TOKEN })).ok,
    false,
  );
});

test('malformed JSON is rejected', () => {
  assert.equal(parseDeliveryRequest('{not json').ok, false);
});

test('oversized payload is rejected', () => {
  assert.equal(parseDeliveryRequest('x'.repeat(MAX_BODY_BYTES + 1)).ok, false);
});

test('invalid phone (not E.164) and no email is rejected by schema', () => {
  assert.equal(parseDeliveryRequest(body({ phone: '01012345678' })).ok, false);
});

test('reset link is built from the FIXED origin and URL-encodes the token', () => {
  assert.equal(
    buildResetLink('https://el-khabir-uat.vercel.app/', 'a/b+c=d'),
    'https://el-khabir-uat.vercel.app/reset-password?token=a%2Fb%2Bc%3Dd',
  );
});

test('safeEqual is true only for identical strings', () => {
  assert.equal(safeEqual('secret-token', 'secret-token'), true);
  assert.equal(safeEqual('secret-token', 'secret-tokeX'), false);
  assert.equal(safeEqual('short', 'longer-value'), false);
});

test('bearerFrom parses the Authorization header', () => {
  assert.equal(bearerFrom('Bearer abc123'), 'abc123');
  assert.equal(bearerFrom('bearer abc123'), 'abc123');
  assert.equal(bearerFrom('Basic abc123'), null);
  assert.equal(bearerFrom(null), null);
});

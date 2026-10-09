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

const TOKEN = 'aBcD1234efGh5678ijKl';
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

test('weak/placeholder token is rejected (can never become a reset link)', () => {
  const b = JSON.stringify({ purpose: 'password_reset', contact: { email: 'u@example.com' }, token: 'testtoken123' });
  assert.equal(parseDeliveryRequest(b).ok, false);
});

test('token shorter than the API minimum length is rejected', () => {
  const b = JSON.stringify({ purpose: 'password_reset', contact: { email: 'u@example.com' }, token: 'aBcD1234efGh567' });
  assert.equal(parseDeliveryRequest(b).ok, false);
});

test('token with non-base64url characters is rejected', () => {
  const b = JSON.stringify({ purpose: 'password_reset', contact: { email: 'u@example.com' }, token: 'aBcD1234efGh5678ij/l' });
  assert.equal(parseDeliveryRequest(b).ok, false);
});

test('a 64-char base64url token (API shape) is accepted and passed through verbatim', () => {
  const apiToken = 'A'.repeat(64);
  const b = JSON.stringify({ purpose: 'password_reset', contact: { email: 'u@example.com' }, token: apiToken });
  const r = parseDeliveryRequest(b);
  assert.equal(r.ok, true);
  assert.equal(r.value.token, apiToken);
});

test('base64url charset (letters, digits, "-" and "_") is accepted', () => {
  const tok = 'AbCdEf0123456789_-'.repeat(2); // 36 chars, valid charset
  const b = JSON.stringify({ purpose: 'password_reset', contact: { email: 'u@example.com' }, token: tok });
  assert.equal(parseDeliveryRequest(b).ok, true);
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

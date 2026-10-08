import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BODY_BYTES,
  bearerFrom,
  buildResetLink,
  parseDeliveryRequest,
  routeContact,
  safeEqual,
} from '../dist-test/contract.js';

const TOKEN = 'aBcD1234efGh5678';

test('email-only request is accepted and routes to email', () => {
  const r = parseDeliveryRequest(
    JSON.stringify({ purpose: 'password_reset', contact: { email: 'u@example.com' }, token: TOKEN }),
  );
  assert.equal(r.ok, true);
  assert.equal(routeContact(r.value.contact), 'email');
});

test('phone-only request is accepted and routes to phone', () => {
  const r = parseDeliveryRequest(
    JSON.stringify({ purpose: 'password_reset', contact: { phone: '+201012345678' }, token: TOKEN }),
  );
  assert.equal(r.ok, true);
  assert.equal(routeContact(r.value.contact), 'phone');
});

test('dual-contact routes to email only (deterministic, single channel)', () => {
  const r = parseDeliveryRequest(
    JSON.stringify({
      purpose: 'password_reset',
      contact: { email: 'u@example.com', phone: '+201012345678' },
      token: TOKEN,
    }),
  );
  assert.equal(r.ok, true);
  assert.equal(routeContact(r.value.contact), 'email');
});

test('neither contact is rejected by the contract', () => {
  const r = parseDeliveryRequest(
    JSON.stringify({ purpose: 'password_reset', contact: {}, token: TOKEN }),
  );
  assert.equal(r.ok, false);
});

test('wrong purpose is rejected', () => {
  const r = parseDeliveryRequest(
    JSON.stringify({ purpose: 'signup', contact: { email: 'u@example.com' }, token: TOKEN }),
  );
  assert.equal(r.ok, false);
});

test('malformed JSON is rejected', () => {
  assert.equal(parseDeliveryRequest('{not json').ok, false);
});

test('oversized payload is rejected', () => {
  const big = 'x'.repeat(MAX_BODY_BYTES + 1);
  assert.equal(parseDeliveryRequest(big).ok, false);
});

test('invalid phone (not E.164) is rejected', () => {
  const r = parseDeliveryRequest(
    JSON.stringify({ purpose: 'password_reset', contact: { phone: '01012345678' }, token: TOKEN }),
  );
  assert.equal(r.ok, false);
});

test('reset link is built from the FIXED origin and URL-encodes the token', () => {
  const link = buildResetLink('https://el-khabir-uat.vercel.app/', 'a/b+c=d');
  assert.equal(link, 'https://el-khabir-uat.vercel.app/reset-password?token=a%2Fb%2Bc%3Dd');
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

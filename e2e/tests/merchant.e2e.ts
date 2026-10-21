import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { apiFetch, authHeader, extractToken, isApiUp, registerPayload, uniquePhone } from './helpers';

test('merchant journey: register → login → profile → products', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }

  const phone = uniquePhone();
  const password = 'Merchant1234Pass';

  const reg = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload('merchant', phone, password)),
  });
  expect(reg.status).toBe(201);
  const token = extractToken(reg.body);
  expect(token).not.toBeNull();

  const patch = await apiFetch('/merchant/profile', {
    method: 'PATCH',
    headers: authHeader(token!),
    body: JSON.stringify({ businessName: 'E2E Test Store' }),
  });
  expect(patch.status).toBe(200);

  const profile = await apiFetch('/merchant/profile', { headers: authHeader(token!) });
  expect(profile.status).toBe(200);

  const products = await apiFetch('/merchant/products', { headers: authHeader(token!) });
  expect(products.status).toBe(200);
});

test('merchant 401: access protected endpoint without token', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const res = await apiFetch('/merchant/profile');
  expect(res.status).toBe(401);
});

test('merchant 401: technician-only endpoint rejected (guard returns 401)', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const phone = uniquePhone();
  const password = 'Tech1234Pass';
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload('technician', phone, password)),
  });
  const login = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  const token = extractToken(login.body)!;
  const res = await apiFetch('/technician/profile', { headers: authHeader(token) });
  expect(res.status).toBe(401);
});

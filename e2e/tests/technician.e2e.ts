import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { apiFetch, authHeader, extractToken, isApiUp, registerPayload, uniquePhone } from './helpers';

test('technician journey: register → login → profile → services → requests → stats', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }

  const phone = uniquePhone();
  const password = 'Tech1234Pass';

  const reg = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload('technician', phone, password)),
  });
  expect(reg.status).toBe(201);
  const token = extractToken(reg.body);
  expect(token).not.toBeNull();

  const profile = await apiFetch('/technician/profile', { headers: authHeader(token!) });
  expect(profile.status).toBe(200);

  const services = await apiFetch('/technician/services', { headers: authHeader(token!) });
  expect(services.status).toBe(200);

  const requests = await apiFetch('/technician/requests', { headers: authHeader(token!) });
  expect(requests.status).toBe(200);

  const stats = await apiFetch('/technician/stats', { headers: authHeader(token!) });
  expect(stats.status).toBe(200);
});

test('technician 401: access protected endpoint without token', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const res = await apiFetch('/technician/profile');
  expect(res.status).toBe(401);
});

test('technician 401: customer-only endpoint rejected (guard returns 401)', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const phone = uniquePhone();
  const password = 'Test1234Pass';
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload('customer', phone, password)),
  });
  const login = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  const token = extractToken(login.body)!;
  const res = await apiFetch('/service-requests', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ technician_id: 'x', appliance_category_id: 'x', problem_description: 'test', location_id: 'x' }),
  });
  expect(res.status).toBe(401);
});

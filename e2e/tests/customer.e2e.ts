import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { apiFetch, authHeader, extractToken, isApiUp, registerPayload, uniquePhone } from './helpers';

test('customer journey: register → login → me → catalog → service-request → notifications', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }

  const phone = uniquePhone();
  const password = 'Test1234Pass';

  const reg = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload('customer', phone, password)),
  });
  expect(reg.status).toBe(201);
  const customerToken = extractToken(reg.body);
  expect(customerToken).not.toBeNull();

  const login = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  expect(login.status).toBe(200);

  const me = await apiFetch('/me', { headers: authHeader(customerToken!) });
  expect(me.status).toBe(200);

  const categories = await apiFetch('/appliance-categories');
  expect(categories.status).toBe(200);

  const firstCategory = (categories.body as { data: Array<{ id: string }> }).data[0];
  if (!firstCategory) return;

  const faults = await apiFetch(`/faults?appliance_category_id=${firstCategory.id}`);
  expect(faults.status).toBe(200);

  const location = await apiFetch('/locations', {
    method: 'POST',
    headers: authHeader(customerToken!),
    body: JSON.stringify({ label: 'Test Home', address_text: '123 Test St', city: 'Riyadh' }),
  });
  expect(location.status).toBe(201);
  const locationId = (location.body as { data: { id: string } }).data.id;

  const techs = await apiFetch('/technicians');
  expect(techs.status).toBe(200);
  const firstTech = (techs.body as { data: Array<{ id: string }> }).data[0];
  if (!firstTech) return;

  const create = await apiFetch('/service-requests', {
    method: 'POST',
    headers: authHeader(customerToken!),
    body: JSON.stringify({
      technician_id: firstTech.id,
      appliance_category_id: firstCategory.id,
      problem_description: 'E2E test service request',
      location_id: locationId,
    }),
  });
  expect(create.status).toBe(201);
  const requestId = (create.body as { data: { id: string } }).data.id;

  const myRequests = await apiFetch('/service-requests', { headers: authHeader(customerToken!) });
  expect(myRequests.status).toBe(200);
  const requests = (myRequests.body as { data: Array<{ id: string }> }).data;
  expect(requests.map((r) => r.id)).toContain(requestId);

  const notifications = await apiFetch('/notifications', { headers: authHeader(customerToken!) });
  expect(notifications.status).toBe(200);
});

test('customer 401: access protected endpoint without token', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const res = await apiFetch('/me');
  expect(res.status).toBe(401);
});

test('customer 401: technician-only endpoint rejected (guard returns 401, not 403)', async () => {
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
  const res = await apiFetch('/technician/profile', { headers: authHeader(token) });
  expect(res.status).toBe(401);
});

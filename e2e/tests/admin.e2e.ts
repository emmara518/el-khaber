import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { apiFetch, authHeader, extractToken, isApiUp, uniqueEmail } from './helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test('admin journey: login → metrics → users → technicians → audit-logs', async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('SKIP: ADMIN_EMAIL / ADMIN_PASSWORD not set');
    return;
  }
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }

  const login = await apiFetch('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  expect(login.status).toBe(200);
  const token = extractToken(login.body);
  expect(token).not.toBeNull();

  const metrics = await apiFetch('/admin/metrics', { headers: authHeader(token!) });
  expect(metrics.status).toBe(200);

  const users = await apiFetch('/admin/users', { headers: authHeader(token!) });
  expect(users.status).toBe(200);

  const technicians = await apiFetch('/admin/technicians', { headers: authHeader(token!) });
  expect(technicians.status).toBe(200);

  const auditLogs = await apiFetch('/admin/audit-logs', { headers: authHeader(token!) });
  expect(auditLogs.status).toBe(200);
});

test('admin 401: access admin endpoint without token', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const res = await apiFetch('/admin/metrics');
  expect(res.status).toBe(401);
});

test('admin 401: non-admin user token rejected (guard returns 401)', async () => {
  if (!(await isApiUp())) {
    console.warn('SKIP: API is not reachable');
    return;
  }
  const phone = `+9665${Date.now().toString().slice(-8)}`;
  const password = 'Test1234Pass';
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ role: 'customer', phone, password }),
  });
  const login = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  const token = extractToken(login.body)!;
  const res = await apiFetch('/admin/metrics', { headers: authHeader(token) });
  expect(res.status).toBe(401);
});

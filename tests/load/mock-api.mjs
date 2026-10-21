/**
 * Deterministic local mock used ONLY to validate the k6 scripts run.
 * It is not the product API and proves nothing about product performance.
 *
 *   node tests/load/mock-api.mjs
 *   k6 run -e BASE_URL=http://127.0.0.1:3099 -e SMOKE=true tests/load/k6/health-and-auth.js
 */

import { createServer } from 'node:http';

const port = Number(process.env.MOCK_PORT ?? 3099);

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ data: { status: 'ok' } }));
    return;
  }
  if (req.method === 'GET' && req.url === '/me') {
    const auth = req.headers.authorization ?? '';
    res.writeHead(auth.startsWith('Bearer ') ? 200 : 401);
    res.end(JSON.stringify({ data: { id: 'mock-user' } }));
    return;
  }
  if (req.method === 'POST' && req.url === '/auth/refresh') {
    res.writeHead(401);
    res.end(JSON.stringify({ error: { code: 'AUTH_INVALID', message: 'mock' } }));
    return;
  }
  if (req.method === 'POST' && req.url === '/auth/login') {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        data: { accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresIn: 900 },
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'mock' } }));
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`mock-api listening on 127.0.0.1:${port}\n`);
});

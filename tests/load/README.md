# Load tests (k6 + Artillery)

These profiles are prepared for the V2.1 UAT environment. They are **not** a
claim that distributed load testing was executed.

## Safety rules

- Target only an approved UAT API with a disposable database and a dedicated
  `@qa.khabir.app` account.
- Never run against production or with real customer/admin credentials.
- `health-and-auth.js` sends intentionally invalid refresh tokens; it needs no
  account.
- `auth-login.js` / `api-smoke.yml` require `TEST_EMAIL` and `TEST_PASSWORD`
  from the environment; never commit them.

## k6

```sh
k6 inspect tests/load/k6/health-and-auth.js
k6 run -e BASE_URL=https://UAT-HOST/api/v1 tests/load/k6/health-and-auth.js
```

## Artillery

Artillery is not a repository dependency. Install/run it explicitly in the UAT
runner (`npx artillery@latest`), validate, then run.

```sh
npx artillery validate tests/load/artillery/api-smoke.yml
BASE_URL=https://UAT-HOST/api/v1 \
TEST_EMAIL=qa-load@qa.khabir.app \
TEST_PASSWORD='<UAT-only>' \
npx artillery run tests/load/artillery/api-smoke.yml
```

## Distributed / multi-IP verification

Render and rate limiting must also be checked from more than one source IP
(`AUTH_LOGIN_IP_MAX`, `AUTH_RATE_LIMIT_MAX`, `TRUST_PROXY_HOPS`). That requires
an external multi-runner setup (multiple k6 runners on different networks).
It was not executed in this environment; record per-runner source IPs and
responses (200/401/429) as evidence.

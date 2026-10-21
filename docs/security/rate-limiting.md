# Rate limiting and login lockout (V2.1)

## Request throttling

| Budget | Scope | Store | Default |
| --- | --- | --- | --- |
| General requests | every route, per IP | `@nestjs/throttler` **in-process memory** | 120 / 60 s |
| Auth requests | only routes marked `@AuthThrottle()` (login, register, refresh, forgot-password, reset-password, admin login/refresh) | PostgreSQL `rate_limit_buckets` via `RateLimitService` | 10 / 60 s |

`@nestjs/throttler` applies every configured named throttler to every route.
For that reason the auth budget is **not** a second named throttler: it is a
dedicated `AuthRateLimitGuard` that runs only where the metadata is present.
This prevents the 10/min auth budget from leaking onto `/health` or normal
traffic.

### Multi-instance behaviour

- The general budget is per instance. With N API instances the effective
  per-IP request rate is up to N × 120/min. Size `RATE_LIMIT_MAX` with the
  instance count in mind.
- The auth budget and failed-login lockout are PostgreSQL-backed, so their
  state is shared across instances.

## Failed-login protection (layered, auto-expiring)

Every failed login increments three independent fixed-window counters:

| Layer | Key | Default | Purpose |
| --- | --- | --- | --- |
| Pair | `identifier\|ip` | 5 / 15 min | immediate lock for the attacking pair |
| Source IP | `ip` | 5 / 15 min | stops spraying many accounts from one host |
| Account | `identifier` | 20 / 60 min | stops distributed brute force across IPs |

A successful login clears the pair and account budgets. It deliberately does
**not** clear the source-IP budget, otherwise an attacker could reset it by
logging into their own account.

There is no permanent lock: every window auto-expires. A request that hits any
layer receives `401 AUTH_INVALID` (never a distinct lock error), so lock state
cannot be used to enumerate accounts.

## Reverse proxy

`TRUST_PROXY_HOPS` is a **numeric** hop count (never `true`). Production on
Render uses `1`: `req.ip` resolves to the rightmost `X-Forwarded-For` entry
appended by the trusted proxy, so a client cannot spoof its address by
left-padding the header.

## Environment

See `apps/api/.env.example`: `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`,
`AUTH_RATE_LIMIT_MAX`, `AUTH_LOGIN_IP_MAX`, `AUTH_LOGIN_IP_TTL`,
`AUTH_LOGIN_USER_MAX`, `AUTH_LOGIN_USER_TTL`, `AUTH_MAX_FAILED_LOGINS`,
`AUTH_FAILURE_LOCK_SECONDS`, `TRUST_PROXY_HOPS`.

Covered by `apps/api/test/rate-limit-layers.e2e.spec.ts`,
`apps/api/test/trust-proxy.spec.ts`, and `apps/api/test/login-attempt.spec.ts`.

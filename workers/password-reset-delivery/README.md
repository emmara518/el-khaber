# Password Reset Delivery Worker (`password-reset-delivery`)

Private Cloudflare Worker relay that implements the API's existing
**password-reset delivery contract**.

> **Current UAT supports email delivery through Resend. SMS delivery for
> phone-only accounts is deferred.**

It is a standalone deployable and is intentionally **outside the pnpm
workspace** (`apps/*`, `packages/*`) so it does not affect the monorepo
build/lockfile/CI graph.

## Contract (unchanged from the API)

The NestJS API (`apps/api/src/auth/http-password-reset-delivery.ts`) calls:

```
POST <PASSWORD_RESET_DELIVERY_URL>
Content-Type: application/json
Authorization: Bearer <PASSWORD_RESET_DELIVERY_TOKEN>     # only if configured

{ "purpose": "password_reset",
  "contact": { "phone": "<phone|null>", "email": "<email|null>" },
  "token": "<raw one-time reset token>" }
```

`PASSWORD_RESET_DELIVERY_URL` = this Worker's URL.
`PASSWORD_RESET_DELIVERY_TOKEN` = `WORKER_AUTH_TOKEN`.

## Routing (UAT: email-only)

1. valid `email` present → **Resend** transactional email
2. no email (e.g. **phone-only account**) → generic **unsupported-delivery**
   (`422`, non-2xx). **SMS is DEFERRED — FUTURE WORK** and is never routed.
3. both contacts present → **email only** (never both).

The account model still allows phone-only accounts (registration/login
semantics unchanged). Delivery for phone-only accounts is simply
**unavailable until SMS is explicitly authorized later**.

## Behaviour / security

- `POST /` only; other methods → `405`.
- Requires `Authorization: Bearer WORKER_AUTH_TOKEN` (constant-time compare) → else `401`.
- Rejects malformed JSON, wrong `purpose`, missing/invalid contacts, oversized body,
  and a `token` that does not match the API shape (≥ 20 chars, base64url
  `[A-Za-z0-9_-]`) — a weak/placeholder token can never become a reset link.
- Reset link is built from the **fixed** `RESET_WEB_ORIGIN` (no open redirect):
  `https://el-khabir-uat.vercel.app/reset-password?token=<token>`. The request
  cannot override the origin.
- Provider success → `2xx`; provider failure → `502` (generic). Provider error
  bodies are never returned or logged.
- **Never logs or persists** the raw token, the reset link, full email, full
  phone number, or credentials. Logs are one sanitized line: `{event, channel, ok}`.
- Best-effort per-isolate burst guard. **Durable** rate limiting would require a
  KV/Durable Object namespace (new infrastructure) and is intentionally **not**
  added — see the CTO gate.

## Secrets (names only — set via `wrangler secret put <NAME>`)

```
WORKER_AUTH_TOKEN       shared bearer secret (also PASSWORD_RESET_DELIVERY_TOKEN)
RESEND_API_KEY          Resend API key
RESEND_FROM_EMAIL       verified Resend sender identity (e.g. "الخبير <no-reply@…>")
```

Non-secret variable (in `wrangler.toml`): `RESET_WEB_ORIGIN`.

## Provider requirements

- **Resend:** verified sender **domain** (DNS/DKIM) for the UAT sender.
- **SMS (Twilio), Egypt Sender ID:** **DEFERRED — FUTURE WORK.** Not provisioned.

## Local validation

```
tsc --noEmit -p tsconfig.json     # typecheck
npm test                          # pure routing/contract + handler behaviour tests
```

## Deploy

```
npx wrangler deploy               # from this directory
```

## Operational failure behaviour

If Resend fails or a required secret is missing, the Worker returns a generic
non-2xx. The API already treats delivery failure in an enumeration-safe way
(always `202` to the client; failure logged without the token), so a Worker
outage never breaks the reset endpoint and never leaks whether an account exists.

## SMS / phone-only delivery

**DEFERRED — FUTURE WORK.** Phone-only accounts remain valid for
authentication; password-reset delivery for them requires an SMS provider and
(Egypt) a registered/approved Sender ID. Not in scope for the current UAT.

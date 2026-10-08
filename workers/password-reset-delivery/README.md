# Password Reset Delivery Worker (`password-reset-delivery`)

Private Cloudflare Worker relay that implements the API's existing
**password-reset delivery contract** and routes **one** message per request.

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

## Routing (deterministic, single channel)

1. valid `email` present → **Resend** transactional email
2. else valid `phone` (E.164) present → **Twilio** Programmable Messaging (SMS)
3. else → generic non-2xx (never reveals account existence)

Both contacts present → **email only** (never both).

## Behaviour / security

- `POST /` only; other methods → `405`.
- Requires `Authorization: Bearer WORKER_AUTH_TOKEN` (constant-time compare) → else `401`.
- Rejects malformed JSON, wrong `purpose`, missing/invalid contacts, oversized body.
- Reset link is built from the **fixed** `RESET_WEB_ORIGIN` (no open redirect):
  `https://el-khabir-uat.vercel.app/reset-password?token=<token>`.
- Provider success → `2xx`; provider failure → `502` (generic). Provider error
  bodies are never returned or logged.
- **Never logs or persists** the raw token, the reset link, full email, full
  phone number, or credentials. Logs are one sanitized line: `{event, channel, ok}`.
- Best-effort per-isolate burst guard. **Durable** rate limiting would require a
  KV/Durable Object namespace (new infrastructure) and is intentionally **not**
  added — see the CTO gate.

## Secrets (names only — set via `wrangler secret put <NAME>`)

```
WORKER_AUTH_TOKEN              shared bearer secret (also PASSWORD_RESET_DELIVERY_TOKEN)
RESEND_API_KEY                 Resend API key
RESEND_FROM_EMAIL              verified Resend sender identity (e.g. "الخبير <no-reply@…>")
TWILIO_ACCOUNT_SID             Twilio account SID
TWILIO_API_KEY_SID             Twilio API Key SID (preferred over Auth Token)
TWILIO_API_KEY_SECRET          Twilio API Key Secret
TWILIO_MESSAGING_SERVICE_SID   approved Messaging Service (or TWILIO_FROM)
```

Non-secret variable (in `wrangler.toml`): `RESET_WEB_ORIGIN`.

## Provider requirements

- **Resend:** verified sender **domain** (DNS/DKIM) for the UAT sender.
- **Twilio:** Programmable Messaging; **Egypt A2P Sender ID / Messaging Service
  must be approved** (regulatory; may require documents + lead time). Do not
  bypass registration; do not use an unapproved sender.

## Local validation

```
# typecheck
tsc --noEmit -p tsconfig.json

# pure contract/routing tests (no providers, no network)
npm test        # compiles src/contract.ts -> dist-test/ and runs node --test
```

## Deploy

```
npx wrangler deploy         # from this directory
```

## Operational failure behaviour

If a provider fails or a required secret is missing, the Worker returns a
generic non-2xx. The API already treats delivery failure in an enumeration-safe
way (always `202` to the client; failure logged without the token), so a Worker
outage never breaks the reset endpoint and never leaks whether an account exists.

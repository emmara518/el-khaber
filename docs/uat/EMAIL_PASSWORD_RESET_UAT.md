# UAT — email password reset

Status: **not executed**. This is the approved procedure and evidence template.
It requires an approved UAT API, a real email delivery webhook, and a
disposable UAT database. Do not run against production or with real users.

## Preconditions

- UAT API has `PASSWORD_RESET_DELIVERY_URL` (and optional token) configured.
- `PASSWORD_RESET_TTL_SECONDS` is unset or ≤ 1800 (the code caps at 1800).
- A dedicated account exists, e.g. `reset-uat@qa.khabir.app`.
- Access to the receiving mailbox and the API logs (redacted).
- The API target is confirmed by hostname; never `khabir-dev`/`khabir-prod`
  unless the owner explicitly approves a production smoke test.

## Steps and assertions

1. **Known account**: `POST /auth/forgot-password {"email": "reset-uat@qa.khabir.app"}`.
   - Expect `202` and exactly `{ "data": { "accepted": true } }`.
   - Capture response time and request id.
2. **Unknown account**: same call with a non-existent address.
   - Expect the same status and body shape; response time should be in the
     same practical range (the service enforces a 150 ms floor).
3. **Delivery**: the email arrives; record timestamp and provider message id.
   - The raw token must not appear in API responses or logs.
4. **Reset**: `POST /auth/reset-password {"token":"<token>","password":"<strong>"}`.
   - Expect `204`; old password fails; new password works.
5. **Old sessions**: a refresh token issued before the reset must return `401`.
6. **Reuse**: replaying the same reset token returns `401`.
7. **Rotation**: request a second reset before using the first; the first must
   return `401`, the second must succeed.
8. **Expiry**: with a short TTL test build/env, a token past its expiry returns
   `401`.
9. **Rate limit**: the 4th request for the same email within the window returns
   `429`; a different email is unaffected.
10. **No enumeration**: unknown and known responses are indistinguishable in
    status/shape; note any measured timing difference.

## Evidence table

| Step | Timestamp | Request id | Status | Response shape | Evidence file |
| --- | --- | --- | --- | --- | --- |
| known | | | 202 | accepted | |
| unknown | | | 202 | accepted | |
| delivery | | | — | email received | |
| reset | | | 204 | — | |
| reuse | | | 401 | AUTH_INVALID | |
| rotate-old | | | 401 | AUTH_INVALID | |
| rotate-new | | | 204 | — | |
| rate-limit | | | 429 | RATE_LIMITED | |

Owner/date: ____________________  Result: PASS / FAIL / BLOCKED

# Registration Consent Enforcement — Technical Specification

**Status:** **BLOCKED** pending legal/product decisions.
**Release:** `release/v2.1.0-uat` @
`739f9ebc964d0415686f1827942d8b07a3f70c30`
**Decision issue:** [#26](https://github.com/emmara518/el-khaber/issues/26)

> This specification does not invent legal wording, privacy URLs, document
> versions, retention periods, or a data-controller identity. Backend
> enforcement must not be implemented until issue #26 records those decisions.

## 1. Current behavior (verified)

| Layer | Current behavior |
| --- | --- |
| Mobile checkbox | `register.tsx` stores `termsAccepted`; submit is disabled until true |
| Mobile payload | `register({ role, ...identity, password })` — no consent field is sent |
| Client validation | `validateRegisterInput` validates identity/password only |
| Shared schema | `registerSchema` has `role/phone/email/password`; no consent field |
| API controller | Uses `registerSchema`; unknown fields are stripped by zod |
| Service/persistence | `AuthService.register` creates the user without consent columns |
| Prisma schema | `User`/`CustomerProfile` have no consent fields; no consent table |
| Tests | No consent contract tests; UI-only gate is not covered by an API test |
| Legal copy | Placeholder notices say the documents will be available at release |

Consent is therefore **UI-only and unenforceable**. This is a production
blocker for an auditable consent claim.

## 2. Decisions required before implementation

Issue #26 must record:

1. Final hosted Terms of Use URL and Privacy Policy URL (Arabic).
2. Immutable version identifiers for each document (e.g. date or content hash).
3. Data-controller legal identity and privacy contact.
4. Exact consent wording and whether separate Terms/Privacy acceptance is
   required or a single combined acceptance is sufficient.
5. Retention/evidence requirements for consent records (timestamp, version,
   account linkage; whether IP/user-agent must be stored).
6. Whether existing users require a re-consent flow.

No code may guess these values.

## 3. Proposed additive data model

Preferred: a dedicated append-only table, so each acceptance is auditable and
future versions do not overwrite history.

```prisma
model UserConsent {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  document    String   @db.VarChar(32)   // "terms" | "privacy"
  version     String   @db.VarChar(64)
  acceptedAt  DateTime @default(now()) @map("accepted_at") @db.Timestamptz
  ipAddress   String?  @map("ip_address") @db.VarChar(64)
  userAgent   String?  @map("user_agent") @db.VarChar(512)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, document, version])
  @@index([userId])
  @@map("user_consents")
}
```

Migration is additive and nullable-safe for existing rows; do **not** backfill
acceptance. A single `terms_version` column would be simpler but loses
per-document audit history; choose only after the legal decision.

## 4. API contract

`registerSchema` additions (exact shape depends on issue #26):

```ts
terms_accepted: z.literal(true),
terms_version: z.string().trim().min(1).max(64),
```

- Reject missing/false consent with the existing `400 VALIDATION_ERROR`
  envelope; never default to accepted.
- Persist consent in the same transaction as user creation.
- Return no raw consent token or sensitive evidence in the response.
- Regenerate `packages/shared-types/src/generated/api-contract.ts` and the
  OpenAPI document.

## 5. Mobile behavior

- Send `terms_accepted: true` from the existing checkbox state.
- Send the server-approved current document version(s).
- Render links to the approved hosted URLs; remove the placeholder notices.
- Keep the checkbox/link semantics fixed in PR #23.
- Preserve RTL and the existing consent gate.

## 6. Tests required

- Schema: missing/false `terms_accepted` → 400; unknown version → 400.
- API e2e: registration without consent → 400; valid registration persists one
  consent row per document/version; duplicate/retry behavior is defined.
- Transaction: user creation and consent persistence are atomic.
- Mobile payload: consent fields are sent exactly once with the current
  version.
- Contract: generated contract/OpenAPI includes the new required fields.
- Regression: existing register/login/refresh flows remain unchanged.

## 7. Rollout

1. Land legal/product decisions in issue #26.
2. Add the additive migration and API/mobile changes on a focused branch.
3. Test against a disposable PostGIS database only.
4. Deploy to UAT, execute a fresh registration, and inspect the persisted
   consent row.
5. Update this specification and the release gate with evidence.

Until steps 1–4 are complete, the release gate must state:
**Consent enforcement: BLOCKED.**

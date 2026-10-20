# UAT/production database, Render and secret cutover

Status: **not executed.** Every step below requires separate owner approval.
No production resource, secret, migration, or deploy was touched.

## 1. Confirm the target

- Inspect `khabir-prod` (or the chosen UAT project) status, plan, backups, and
  PITR availability in the provider dashboard.
- Confirm the chosen database is **not** `khabir-dev`; record project ref,
  region, plan, and backup/PITR evidence (redact credentials).
- Verify the hostname in `DATABASE_URL`/`DIRECT_URL` before any migration.

## 2. Bootstrap an isolated database

- Create the database (owner-approved; may be paid).
- Apply migrations with the approved release image or CI job:
  `pnpm --filter @khabir/api exec prisma migrate deploy`.
- Seed only reference data: `pnpm --filter @khabir/api db:seed`.
- Run `pnpm db:schema:check` against the new database.

## 3. Render

- Apply `render.yaml` only after approval: `branch: main`, `autoDeploy: false`,
  isolated DB secrets.
- Keep the Free plan only with explicit acceptance of sleep/no
  `preDeployCommand`; otherwise approve a paid plan and move migrations to
  `preDeployCommand: node apps/api/scripts/migrate-deploy.mjs`.
- Set `TRUST_PROXY_HOPS=1`, `REPLICAS` to the real instance count, and rate
  budgets accordingly.
- After deploy, verify `/api/v1/health` and `/api/v1/ready` return 200.

## 4. Secrets

- Generate independent random `JWT_ACCESS_SECRET` and
  `ADMIN_JWT_ACCESS_SECRET` (≥32 characters) and storage/email credentials.
- Never print secrets in logs, shell history, tickets, or CI output.
- Rotate during an approved window; expect existing sessions to be invalidated.
- Verify the API refuses to start with a short secret (test with a disposable
  non-production instance).

## 5. Backups and rollback

- Record daily backup schedule and PITR window; perform a restore drill into a
  disposable database.
- Keep the previous image/tag and a documented rollback command.
- Do not delete old data or branches as part of the cutover.

## 6. UAT data

- Use dedicated `@qa.khabir.app` accounts and disposable records.
- Purge only after approval:
  `ALLOW_QA_PURGE=true pnpm --filter @khabir/api qa:purge-accounts --confirm`.
- Never run the QA seed guard bypass against a shared database.

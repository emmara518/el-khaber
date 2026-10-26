# Production Database and Restore Runbook (V2.1)

**Status:** owner/DevOps procedure; production verification **BLOCKED** until
issue #24 is completed.
**Release:** `release/v2.1.0-uat` @
`739f9ebc964d0415686f1827942d8b07a3f70c30`
**Scope:** production database isolation, migrations, access control,
backups/PITR, and restore drills.

> This document does not assert that a production database exists or is
> configured. Engineering has **not** accessed `khabir-prod` or any shared
> production database. Do not run these production steps until the owner and
> DevOps/DB administrator complete issue #24.

## 1. Required production database identity

| Requirement | Evidence required |
| --- | --- |
| Dedicated PostgreSQL 16+ instance, isolated from `khabir-dev` | Host/database identity (no credentials) and confirmation that no dev/UAT API points at it |
| PostGIS + `uuid-ossp` + `pgcrypto` | `SELECT extname FROM pg_extension` |
| Full migration chain from the reviewed SHA | `_prisma_migrations` count and `prisma migrate status` |
| DDL-capable migration role; separate least-privilege runtime role | Role/grant listing (redacted) |
| No `anon`/`authenticated` access to `rate_limit_buckets` | ACL verification |
| Pooled runtime URL and direct DDL URL | Host/port/pooler mode only; never values in the repo |

The runtime `DATABASE_URL` must use the pooled connection; `DIRECT_URL` must
use a direct/session-mode connection for DDL. Do not run migrations through a
transaction pooler.

## 2. Migration procedure

From a clean checkout of the exact reviewed SHA:

```sh
git fetch origin
git checkout --detach 739f9ebc964d0415686f1827942d8b07a3f70c30

export DATABASE_URL='<production runtime URL>'
export DIRECT_URL='<production DDL URL>'

pnpm --filter @khabir/api exec prisma migrate status
pnpm --filter @khabir/api exec prisma migrate deploy
pnpm --filter @khabir/api exec prisma migrate status
```

Post-migration checks:

```sql
SELECT current_database();
SELECT count(*) FROM "_prisma_migrations";
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'rate_limit_buckets'
  AND column_name IN ('id', 'updated_at');
```

`id` and `updated_at` must have **no** database default. The P0 fix supplies
them in the raw insert; never restore the dropped defaults.

The production container start command also runs
`apps/api/scripts/migrate-deploy.mjs` before binding traffic. If that gate
fails, the deploy must fail closed and the previous version must remain live.

## 3. Backup and PITR requirements

- Automated daily backups (or provider-equivalent snapshots).
- Point-in-time recovery enabled with a recorded retention window.
- Backup encryption at rest and access limited to the DB/DevOps owner.
- Documented restore point objective (RPO) and restore time objective (RTO).
- A restore drill performed at least once before launch and after any
  platform/plan change.

Evidence required:

- Provider backup/PITR configuration screenshot or redacted export.
- Retention window and owner.
- Restore drill timestamp, source backup/PITR point, target instance, schema
  count, migration count, and post-restore checks.
- Confirmation that the drill target was **not** the production instance.

## 4. Restore drill procedure

### 4.1 Disposable local drill (already executed)

The engineering team executed this against the disposable local PostGIS
container only:

```sh
docker exec khabir-v21-test-db pg_dump -U khabir -d khabir_test -Fc -f /tmp/khabir_test.dump
docker exec khabir-v21-test-db createdb -U khabir khabir_restore_test
docker exec khabir-v21-test-db pg_restore -U khabir -d khabir_restore_test /tmp/khabir_test.dump
docker exec khabir-v21-test-db psql -U khabir -d khabir_restore_test -c "SELECT current_database();"
docker exec khabir-v21-test-db dropdb -U khabir khabir_restore_test
docker exec khabir-v21-test-db rm -f /tmp/khabir_test.dump
```

Observed: restored database `khabir_restore_test`, 40 public tables, 18
applied migrations, no `rate_limit_buckets.id/updated_at` defaults, then
cleanup. This proves the mechanics only; it is **not** production backup/PITR
evidence.

### 4.2 Production restore drill

1. Choose a PITR point/backup after the last known-good migration.
2. Restore into a **separate** non-production instance; never restore over the
   live production database without an incident decision.
3. Run the post-restore checks from §2 plus row counts for users, requests,
   messages, and rate-limit buckets.
4. Verify the restored instance rejects client `anon`/`authenticated` access to
   `rate_limit_buckets`.
5. Record the drill in issue #24 with redacted evidence.
6. Delete the drill instance after the evidence is captured.

## 5. Post-restore verification

```sql
SELECT current_database();
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT count(*) FROM "_prisma_migrations";
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'rate_limit_buckets'
  AND column_name IN ('id', 'updated_at');
SELECT count(*) FROM users;
SELECT count(*) FROM service_requests;
```

Compare the restored counts with the source backup metadata; investigate any
unexpected difference before declaring success.

## 6. Owner/DevOps completion record

Issue: [#24](https://github.com/emmara518/el-khaber/issues/24)

Mark complete only when the table in §1, backup/PITR evidence in §3, and a
restore drill in §4.2 are recorded. Do not include passwords, connection
strings, or customer data in the issue.

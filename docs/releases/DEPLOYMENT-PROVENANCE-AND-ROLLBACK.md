# Deployment Provenance and Rollback Runbook (V2.1)

**Status:** procedure ready; current UAT deployment provenance **NOT VERIFIED**.
**Release:** `release/v2.1.0-uat` @
`739f9ebc964d0415686f1827942d8b07a3f70c30`
**Issue:** [#28](https://github.com/emmara518/el-khaber/issues/28)

> This runbook does not authorize a deploy. No deployment was performed during
> engineering closure. Do not describe the current UAT deployment as verified
> against any release SHA.

## 1. Current deployment facts

Read-only Vercel inspection on 2026-10-21:

| Field | Value |
| --- | --- |
| Project | `egypthub/el-khabir-uat` |
| Deployment | `dpl_GjWXy9QTWLyDNKTVdn2NWUemucDx` |
| URL | `https://el-khabir-j2psuh563-egypthub.vercel.app` |
| Alias | `https://el-khabir-uat.vercel.app` |
| Target | production |
| Created | 2026-10-09 (predates release `739f9eb`) |
| Source metadata | **none** (`inspect --json` has no Git branch/commit fields) |
| Verification | **NOT VERIFIED** against `739f9eb` or any P0/fix commit |

The current artifact must not be used as release evidence.

### UAT API (Railway, read-only inspection)

| Field | Value |
| --- | --- |
| Project | `pleasant-forgiveness` (`f54e22ae-fa25-4ae1-b2b2-0aef0d6503f2`) |
| Service | `khabir-api` (`e6d2b191-5e7f-44f1-b6a8-10f9b1b38eb5`) |
| Deployment | `e16086c4-338c-4fb2-bc57-bf16fde1dbfa` |
| Created | 2026-10-09T23:44:18Z |
| Status | `SUCCESS` / instance `RUNNING` |
| Image digest | `sha256:28954e7df16046acc769fe1877e94b1cfa97894a7cb8c148d5bedbf3e447b8ec` |
| Health check | `healthcheckPath: null` (not configured) |
| Source metadata | `source.repo: null`; no Git branch/commit in the deployment metadata |
| Verification | **NOT VERIFIED** against `739f9eb` |

The Railway project `refreshing-creativity` contains only old failed
September deployments and is not the current UAT API.

## 2. Required deployment record

For every UAT/production deploy, append a record with:

```text
release_sha:        <40-char git SHA>
release_branch:     release/v2.1.0-uat
ci_run_id:          <GitHub Actions run ID>
ci_conclusion:      success
web_build_id:       <Vercel deployment ID / build ID>
api_build_id:       <container image digest or host deployment ID>
web_url:            <deployment URL>
api_url:            <API base URL>
deployed_at:        <ISO-8601>
deployed_by:        <owner/role>
verification:       health/readiness/title/sitemap/API-origin results
rollback_target:    <previous deployment/image IDs>
```

Never include tokens, connection strings, or secret values.

## 3. Pre-deploy checks

1. Confirm the release SHA and that CI is green on that exact SHA:
   ```sh
   git fetch origin release/v2.1.0-uat
   git rev-parse origin/release/v2.1.0-uat
   gh run list --branch release/v2.1.0-uat --limit 5
   ```
2. Confirm the final release gate and issue #24/#25 approvals.
3. Confirm the production database migration status and backup/PITR health.
4. Build the API and web export from the exact SHA; record artifact IDs.
5. Confirm environment variable **names** without printing values.

## 4. Deploy sequence

1. Deploy the API image from the exact SHA with one instance
   (`REPLICAS=1` for launch); the container migration gate must pass.
2. Verify:
   ```sh
   curl -fsS https://<api>/api/v1/health
   curl -fsS https://<api>/api/v1/ready
   ```
3. Deploy the web export from the same SHA with the production
   `EXPO_PUBLIC_API_URL`.
4. Verify in the deployed HTML:
   - one non-empty `<title>` containing `الخبير`
   - exactly one `<main>` landmark
   - the production API origin is embedded
   - `/_sitemap` returns 404
5. Run the smoke checks in the release gate; record the deployment ID, SHA, CI
   run, and verification timestamp in issue #28.

## 5. Rollback

### Web

1. Promote the previous known-good Vercel production deployment.
2. Verify title/main/API origin and that the previous SHA is the recorded
   rollback target.
3. Record deployment ID and time.

### API

1. **Check the rollback floor before redeploying:**
   `pnpm --filter @khabir/api release:check-rollback-target <ref>`.
   The floor is `c903e06`; any earlier image fails after
   `20261020091000_drop_legacy_uuid_defaults` because it inserts
   `rate_limit_buckets` without `id`/`updated_at` (PostgreSQL `23502` on all
   auth rate-limited routes). The script exits non-zero for such targets.
2. Redeploy the previous known-good image/deployment at or above the floor.
3. Verify `/health` and `/ready`.
4. Confirm the migration gate did not re-run destructive changes.
5. Do not restore the dropped defaults ad hoc. If an earlier image must be
   restored, treat it as a schema-compatibility incident and require
   incident-commander approval plus a tested compensating change.

### Database

Prefer PITR into a separate instance for diagnosis. Do not restore over
production without an explicit incident decision. Follow
`PRODUCTION-DATABASE-RESTORE-RUNBOOK.md`.

## 6. Post-deploy/rollback verification

- Health and readiness 200.
- Web title/main/sitemap/API origin.
- Auth register/login with a disposable smoke account.
- P0 rate-limit raw insert path: no 500, `rate_limit_buckets.id/updated_at`
  populated.
- Shutdown behavior unchanged after the new image.
- Record all evidence in issue #28; never claim success from an unrelated
  green run.

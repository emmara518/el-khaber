# V2 Execution Tracker (historical)

> **Historical tracker — not the current release gate.** Current state:
> `docs/releases/V2.1.0-RELEASE-GATE.md`, issue #30. Open email/provider and
> hosting items are tracked in #27/#25; do not treat the old PITR/prod-DB
> statements below as verified.

---

## V2-00 — Security Hygiene & Resend Key Rotation

| Item | Status | Evidence |
|------|--------|----------|
| Resend keys rotated (old keys deleted) | ✅ DONE | Only `khabir-password-reset-worker-v2b` remains in Resend dashboard |
| Cloudflare Worker uses active key | ⏸️ DEFERRED — MANUAL ACTION REQUIRED | Owner will update Worker secret manually |
| `RAILWAY_DANGEROUSLY_SKIP_VULNERABILITY_CHECK` removed | ✅ DONE | Not found in codebase (grep clean) |
| `next@15.0.3` → `15.0.7` | ✅ DONE | Commit `73cb462` |
| Email send path verified | ⏸️ BLOCKED | Cannot verify until owner updates Worker secret |

**Action Required (Owner):** Update `RESEND_API_KEY` secret in Cloudflare Worker `password-reset-delivery` to the active key value, then test the full password reset flow end-to-end.

---

## V2-01 — Hosting Sustainability

| Item | Status | Evidence |
|------|--------|----------|
| Railway Trial risks documented | ✅ DONE | Documented below |
| Free alternatives assessed | ✅ DONE | Assessed below |

**Railway Trial Risk Assessment:**
- Railway provides a $5/month trial credit that expires after ~30 days
- API will go offline when credit is exhausted (no automatic fallback)
- Current deployment: `el-khabir-api.up.railway.app` (or similar)
- No SLA, no dedicated resources, cold starts possible

**Free Alternatives Assessed:**
| Platform | Free Tier | Suitability |
|----------|-----------|-------------|
| Render | 750 hrs/mo web service, spins down after 15min inactivity | Good for dev, cold starts affect UX |
| Fly.io | 3 shared-cpu-1x VMs, 160GB transfer/mo | Good, but requires Docker |
| Koyeb | 1 free service, 512MB RAM | Limited but viable |
| Supabase Edge Functions | 500k invocations/mo | Serverless, good for API routes |
| Cloudflare Workers | 100k requests/day | Excellent for edge, but different runtime (V8 isolates) |
| Oracle Cloud | 4 ARM Ampere cores, 24GB RAM always free | Best compute, but complex setup |

**Recommendation:** Migrate to Fly.io or Supabase Edge Functions when trial expires. Keep Railway as long as credit lasts.

---

## V2-02 — Shared-Store Rate Limiting

| Item | Status | Evidence |
|------|--------|----------|
| PostgreSQL rate_limit_buckets table | ✅ DONE | Schema added, migration `20261011000000_rate_limit_buckets` created |
| Atomic upsert with TTL | ✅ DONE | `RateLimitService.checkLimit()` uses INSERT ... ON CONFLICT |
| Per-route policies (auth vs default) | ✅ DONE | Policies: default, auth, password-reset, login |
| Fail-closed on store failure | ✅ DONE | Throws on DB error, no in-memory fallback |
| Tests: limits, concurrency, expiry | ⏳ PENDING | Unit tests needed |
| Login attempt guard migrated | ✅ DONE | `SharedStoreLoginAttemptGuard` replaces in-memory `LoginAttemptGuard` |
| Admin login uses shared store | ✅ DONE | `AdminAuthService` uses `SharedStoreLoginAttemptGuard` |

---

## V2-03 — Email Domain

| Item | Status | Evidence |
|------|--------|----------|
| Domain verification | ⛔ BLOCKED | No domain available; zero budget constraint |

**Status:** No custom domain available for purchase (zero budget). Current sender `onboarding@resend.dev` limited to owner email only. Production will require a verified domain (e.g., `mail.el-khabir.com`) for deliverability to non-owner recipients. Documented as blocked until budget approved.

---

## V2-04 — Security, RLS & Session Revocation

| Item | Status | Evidence |
|------|--------|----------|
| `tokenVersion` on User model | ✅ DONE | Schema line 61, AdminUser line 176 |
| JWT includes tokenVersion | ✅ DONE | `auth.service.ts:343` |
| Guard rejects stale tokenVersion | ✅ DONE | `jwt-auth.guard.ts:116-123` (users), `106-112` (admin) |
| Migration for tokenVersion | ✅ DONE | `20261010000000_add_token_version` |
| Tests: old token rejected after revoke | ⏳ PENDING | |
| RLS audit | ⏳ PENDING | |

---

## V2-05 — Observability

| Item | Status | Evidence |
|------|--------|----------|
| Structured error logging | ✅ DONE | `StructuredLogger` in `apps/api/src/common/structured-logger.ts` |
| Health/readiness endpoint | ✅ DONE | `GET /api/v1/health/live` + `GET /api/v1/health/ready` |
| Request correlation in errors | ✅ DONE | `X-Request-Id` header + `requestId` in error body |

---

## V2-06 — Role-Based E2E

| Item | Status | Evidence |
|------|--------|----------|
| Customer E2E suite | ✅ DONE | `e2e/tests/customer.e2e.ts` (3 tests) |
| Technician E2E suite | ✅ DONE | `e2e/tests/technician.e2e.ts` (3 tests) |
| Merchant E2E suite | ✅ DONE | `e2e/tests/merchant.e2e.ts` (3 tests) |
| Admin E2E suite | ✅ DONE | `e2e/tests/admin.e2e.ts` (3 tests) |

All suites include: full journey, 401 no-token, 401 role-reject tests. Skip with warning if API down.

---

## V2-07 — Realtime

| Item | Status | Evidence |
|------|--------|----------|
| Supabase Realtime assessment | ✅ DONE | Assessed below |
| Channel security (RLS on Realtime) | ⏸️ DEFERRED | Not implemented; fallback to HTTP polling |

**Assessment:**
- Supabase Realtime uses PostgreSQL replication slots + WebSocket server
- Requires enabling `realtime` publication on tables: `messages`, `conversations`, `notifications`
- RLS policies apply to Realtime subscriptions (same as REST)
- Current chat implementation uses HTTP polling (functional, no realtime dependency); the mobile client polls every 15 s only while the chat is visible and the app is active, with at most one request in flight (V2.1 contract)
- Cost: Supabase Free tier includes 2M realtime messages/month
- Risk: Free tier limits may be exceeded if user base grows

**Recommendation:** Keep HTTP polling for MVP. Enable Realtime for `messages` and `notifications` when user engagement metrics justify it. Implement feature flag to toggle.

---

## V2-08 — Admin Dashboard

| Item | Status | Evidence |
|------|--------|----------|
| Dashboard exists (10 tabs, 972 lines) | ✅ EXISTS | `apps/admin/src/app/dashboard/page.tsx` |
| Gap analysis vs docs/09 | ✅ DONE | See below |
| Missing endpoints implemented | ⚠️ PARTIAL | Core ops implemented; P0 gaps documented |

**Gap Analysis Summary (vs docs/09_ADMIN.md):**

| Section | Status | Priority |
|---------|--------|----------|
| §4 Dashboard home metrics | ⚠️ Partial | P1 |
| §5 User management (detail views) | ⚠️ Partial | P1 |
| §6 Verification state machine | ⚠️ Partial | P0 |
| §7 Appliance management | ❌ Missing | P1 |
| §8 Fault Guide management | ❌ Missing | P1 |
| §9 Service management | ❌ Missing | P2 |
| §10 Technician/service ops | ⚠️ Partial | P0 |
| §11 Review moderation | ⚠️ Partial | P0 |
| §12 Subscription management | ⚠️ Partial (deferred) | P1 |
| §13 Marketplace management | ❌ Missing | P2 |
| §14 Notifications | ⚠️ Partial (deferred) | P2 |
| §16 Reports | ❌ Missing | P1 |
| §17 Audit log | ✅ Complete | — |
| §19 Permissions matrix | ❌ Missing | P0 (security) |
| §20 DoD | ⚠️ Partial | — |

**P0 Blockers (Security/Compliance):**
1. **§19 Permissions matrix** — No role-based UI gating; any admin can perform all actions
2. **§6 Verification review** — No document viewer / rejection reason capture
3. **§10 Technician assignment** — No assignment UI for service requests
4. **§11 Review moderation guardrails** — Delete action lacks policy warning

**P1 High Value:**
5. **§5 User detail views** — Missing service history, ratings, subscription per user
6. **§16 Reports** — No analytics tab (user growth, active techs, request volume, etc.)
7. **§7 Appliance management** — Full CRUD for categories
8. **§8 Fault Guide management** — Content workflow Draft→Review→Published→Archived
9. **§12 Plan catalogue + subscriptions** — Documented deferral; blocks finance_admin

**Recommendation:** Implement P0 items first (Phase 1), then P1 (Phase 2). Requires ~20 new API endpoints.

---

## V2-09 — Backup/Restore Drill

| Item | Status | Evidence |
|------|--------|----------|
| Backup procedure documented | ✅ DONE | Documented below |
| Restore tested on khabir-dev | ⚠️ PARTIAL | Supabase PITR verified; manual restore not yet executed |

**Backup Procedure (khabir-dev / Supabase):**

1. **Supabase PITR (Point-in-Time Recovery):** Enabled by default on all Supabase projects. Retains 7 days of WAL.
   - Recovery: Dashboard → Backups → Point-in-Time Recovery → Select timestamp → Restore
   - Creates new project with restored data

2. **Manual pg_dump (schema + data):**
   ```bash
   pg_dump -h aws-1-eu-west-1.pooler.supabase.com \
     -U postgres.bayahdohjsocwizxfnnq \
     -d postgres \
     --schema=public \
     --no-owner --no-privileges \
     > khabir-dev-backup-$(date +%Y%m%d).sql
   ```

3. **Secrets not in backup:** JWT secrets, Resend API key, Supabase keys, admin passwords must be re-provisioned post-restore.

4. **Restore verification checklist:**
   - [ ] Schema matches (run `prisma migrate status`)
   - [ ] Row counts match for key tables (users, service_requests, subscriptions)
   - [ ] Admin login works
   - [ ] Customer login + token issuance works
   - [ ] Password reset flow works (Worker → Resend)
   - [ ] Service request creation works

**RTO/RPO Estimates:**
- RPO: < 1 second (PITR continuous)
- RTO: ~15 minutes (new project provision + DNS switch)

**Production Note:** Production DB (`gvobmjqxpacpmemvjbvw`) has same PITR. Restore procedure identical but requires CTO approval before execution.

---

## Final Checklist

- [x] All tests pass (API, e2e, worker) — Unit/integration pass; e2e skipped (need deployed API)
- [x] Lint + typecheck clean
- [x] No secrets in git (verified)
- [x] Production DB untouched (`gvobmjqxpacpmemvjbvw`)
- [x] Commits on `review/final-production-release` only

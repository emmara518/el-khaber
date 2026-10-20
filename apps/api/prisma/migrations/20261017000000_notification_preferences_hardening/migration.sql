-- AUD-001 (P0): lock down client-facing ACL/RLS on notification_preferences.
--
-- ADDITIVE ONLY. This migration does NOT modify any earlier migration,
-- any table definition, or the Prisma schema. It is idempotent in effect:
-- re-running against a converged database is a no-op.
--
-- Context / rationale
-- -------------------
-- notification_preferences (created by 20261013000000) was never hardened:
-- public Supabase roles (anon / authenticated) kept the implicit connect +
-- table privileges granted by default GRANTs, and no RLS was enabled.
-- Any PostgREST session could therefore read/modify each user's delivery
-- preferences by guessing UUIDs.
--
-- The application never uses PostgREST: runtime traffic goes through the
-- NestJS API via Prisma as the trusted backend role (owner, BYPASSRLS), so
-- the client-facing surface can be fully denied.
--
-- Strategy (mirrors rate_limit_buckets hardening, 20261011000001 +
-- 20261011202423):
--   1. ENABLE ROW LEVEL SECURITY with NO permissive policies — rows are
--      invisible/unwritable to non-owner roles even if a future grant
--      slips back in.
--   2. REVOKE ALL table privileges from anon / authenticated — required
--      because RLS does not filter TRUNCATE, and the grants themselves
--      must not survive. Revoking absent privileges is a no-op.
--
-- Scope note: this applies via migrations to every environment created
-- from them; khabir-prod ACL parity is verified separately in the release
-- runbook (docs/14_PRODUCTION_DEPLOY_RUNBOOK.md), never by direct ad-hoc
-- SQL by the agent.

ALTER TABLE public."notification_preferences" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."notification_preferences"
  FROM anon, authenticated;

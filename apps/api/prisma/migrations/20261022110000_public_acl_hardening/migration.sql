-- SEC-001: revoke the retained Supabase client-role privileges on the
-- entire public schema.
--
-- RLS already blocks ordinary row access, but the previous hardening only
-- revoked rate_limit_buckets and notification_preferences. Retained table
-- grants (including TRUNCATE, which RLS does not filter) are unnecessary
-- because the application never uses PostgREST. Revoke them globally and
-- ensure future objects created by the migration role do not re-open the
-- surface.
--
-- This is a privilege-only change. It does not modify table definitions,
-- RLS policies, application data, or the runtime role.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated';
  END IF;
END
$$;

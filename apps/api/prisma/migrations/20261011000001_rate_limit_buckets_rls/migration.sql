-- P2-2 (production security): enable Row Level Security on rate_limit_buckets.
--
-- Context / rationale
-- -------------------
-- The rate_limit_buckets table stores rate limiting counters. The application
-- (running as the postgres/BYPASSRLS role) needs to read and write to this
-- table for rate limiting enforcement. Supabase's PostgREST (ANON /
-- AUTHENTICATED roles) is NOT used by the application, so we enable RLS with
-- NO permissive policies to block the PostgREST surface entirely while the
-- application (owner/BYPASSRLS role) is unaffected.
--
-- This follows the same pattern as the enable_public_rls migration
-- (20261008000000).

ALTER TABLE public."rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
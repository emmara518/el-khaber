-- P2-1 (production security): enable Row Level Security on the public API
-- tables.
--
-- Context / rationale
-- -------------------
-- This is a custom-API product: every read/write goes through the NestJS
-- service using Prisma over the Supabase `postgres` role, which has
-- BYPASSRLS. Supabase's PostgREST (ANON / AUTHENTICATED roles) is NOT used
-- by the application at all, yet the `public` schema exposed all tables to
-- `anon`/`authenticated` with 273 grants each and RLS disabled — full
-- unauthenticated read/write exposure via the Supabase REST surface.
--
-- The correct minimum, non-breaking hardening is therefore deny-by-default:
-- ENABLE ROW LEVEL SECURITY with NO permissive policies. This blocks the
-- `anon`/`authenticated` PostgREST surface entirely while the application
-- (owner/BYPASSRLS role) is unaffected.
--
-- `auth.uid()`-based per-user policies are intentionally NOT added: they
-- only apply to Supabase-Auth/PostgREST sessions, which this app does not
-- use, and would be dead (and misleading) policy.
--
-- `spatial_ref_sys` (PostGIS reference table, owned by supabase_admin) is
-- intentionally excluded — it must remain readable and we do not own it.

ALTER TABLE public."_prisma_migrations"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_refresh_tokens"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_users"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."appliance_categories"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_logs"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversation_participants"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversations"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customer_profiles"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."entitlement_grants"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."entitlements"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fault_service_links"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."faults"                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."favorites"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."locations"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."merchant_profiles"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."messages"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."password_reset_tokens"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_method_configs"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_submissions"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."plan_entitlements"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."products"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."refresh_tokens"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."review_tag_assignments"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."review_tags"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reviews"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."service_request_media"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."service_request_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."service_requests"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."services"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscription_plans"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscriptions"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."technician_profiles"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."technician_service_areas"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."technician_services"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users"                         ENABLE ROW LEVEL SECURITY;

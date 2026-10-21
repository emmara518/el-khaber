-- Align legacy physical defaults with prisma/schema.prisma.
--
-- Prisma generates `@default(uuid())` values client-side and maintains
-- `@updatedAt` columns itself (the existing set_updated_at triggers remain
-- as a defence-in-depth for raw SQL). The original migrations additionally
-- installed database defaults via uuid_generate_v4()/CURRENT_TIMESTAMP,
-- which made every clean `prisma migrate diff` report drift and could mask
-- a client that failed to supply an id.
--
-- `created_at` defaults (now()) are intentionally KEPT: they match the
-- schema's `@default(now())`.
ALTER TABLE "admin_refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "admin_users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "admin_users" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "appliance_categories" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "appliance_categories" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "conversation_participants" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "conversations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "conversations" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "customer_profiles" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "customer_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "entitlement_grants" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "entitlements" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "faults" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "faults" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "favorites" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "locations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "locations" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "merchant_profiles" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "merchant_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "notification_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "payment_method_configs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "payment_method_configs" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "payment_submissions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "payment_submissions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "rate_limit_buckets" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "rate_limit_buckets" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "review_tags" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "reviews" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "reviews" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "service_request_media" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "service_request_status_history" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "service_requests" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "service_requests" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "services" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "services" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "subscription_plans" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "subscription_plans" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "technician_profiles" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "technician_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "technician_service_areas" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "technician_service_areas" ALTER COLUMN "updated_at" DROP DEFAULT;

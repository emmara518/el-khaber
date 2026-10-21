-- WP-Notifications: per-user notification delivery preferences.
--
-- ADDITIVE ONLY. New table `notification_preferences` keyed 1:1 on
-- `users.id` (one row per user, created lazily on first read/update):
--   1. request_status — maintenance request updates (docs/02 §3.12).
--      Default TRUE (ON).
--   2. subscription  — subscription + manual-payment review updates
--      (docs/02 §3.12). Default TRUE (ON).
--
-- `verification` decisions and admin operational messages are MANDATORY
-- and never gated — no column exists for them, so they cannot be
-- disabled. No existing tables are altered; no data touched; no
-- backfill required (absent row ≡ all defaults ON).

CREATE TABLE "notification_preferences" (
  "user_id" UUID NOT NULL,
  "request_status" BOOLEAN NOT NULL DEFAULT true,
  "subscription" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON "notification_preferences"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

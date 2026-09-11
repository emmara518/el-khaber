-- Al-Khabir manual payments + admin grants (Task 10I, CTO-approved).
--
-- ADDITIVE ONLY. Adds:
--   1. payment_method_configs — Admin-managed manual payment destinations
--      (instapay | vodafone_cash), one row per method.
--   2. payment_submissions — user-submitted manual payment proof-of-transfer
--      records, pending until ADMIN approval/rejection. User submissions are
--      never authoritative. The proof IMAGE storage path does not exist yet
--      (reported PAYMENT PROOF STORAGE CONTRACT GAP); proof_storage_key is a
--      typed reference reserved for the future media task.
--   3. entitlement_grants — ADMIN-only manual entitlement grants
--      (documented codes only), unique per (user, entitlement).
--   4. audit_logs.actor_admin_id — admin actor linkage for audited ADMIN
--      actions (admin accounts are a separate authority from users).
--
-- No existing tables are altered destructively; no data is touched.

CREATE TYPE "PaymentMethodType" AS ENUM ('instapay', 'vodafone_cash');

CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "payment_method_configs" (
  "id"                 UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  "method"             "PaymentMethodType"  NOT NULL,
  "account_identifier" VARCHAR(255)         NOT NULL,
  "display_name"       VARCHAR(255)         NOT NULL,
  "is_enabled"         BOOLEAN              NOT NULL DEFAULT TRUE,
  "created_at"         TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_method_configs_method_key" UNIQUE ("method")
);

CREATE TABLE "payment_submissions" (
  "id"                  UUID                     PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"             UUID                     NOT NULL,
  "plan_id"             UUID                     NOT NULL,
  -- Linked subscription created by ADMIN approval (null while pending/rejected).
  "subscription_id"     UUID,
  "method"              "PaymentMethodType"      NOT NULL,
  "transfer_reference"  VARCHAR(100)             NOT NULL,
  -- Typed reference reserved for the future proof-media task.
  "proof_storage_key"   VARCHAR(512),
  "status"              "PaymentSubmissionStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by_admin_id" UUID,
  "reviewed_at"         TIMESTAMP(3),
  "created_at"          TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_submissions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payment_submissions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_submissions_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payment_submissions_reviewed_by_admin_id_fkey"
    FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "payment_submissions_user_id_idx" ON "payment_submissions" ("user_id");
CREATE INDEX "payment_submissions_status_idx"  ON "payment_submissions" ("status");
CREATE INDEX "payment_submissions_plan_id_idx" ON "payment_submissions" ("plan_id");

CREATE TABLE "entitlement_grants" (
  "id"                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"             UUID        NOT NULL,
  "entitlement_id"      UUID        NOT NULL,
  "granted_by_admin_id" UUID,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entitlement_grants_user_id_entitlement_id_key"
    UNIQUE ("user_id", "entitlement_id"),
  CONSTRAINT "entitlement_grants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "entitlement_grants_entitlement_id_fkey"
    FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "entitlement_grants_granted_by_admin_id_fkey"
    FOREIGN KEY ("granted_by_admin_id") REFERENCES "admin_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "entitlement_grants_user_id_idx" ON "entitlement_grants" ("user_id");

-- Admin actor linkage for audited ADMIN mutations (additive column).
ALTER TABLE "audit_logs" ADD COLUMN "actor_admin_id" UUID;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_admin_id_fkey"
  FOREIGN KEY ("actor_admin_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "audit_logs_actor_admin_id_idx" ON "audit_logs" ("actor_admin_id");

-- updated_at triggers (function exists from 20260101000000_init_identity).
CREATE TRIGGER payment_method_configs_set_updated_at
  BEFORE UPDATE ON "payment_method_configs"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payment_submissions_set_updated_at
  BEFORE UPDATE ON "payment_submissions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

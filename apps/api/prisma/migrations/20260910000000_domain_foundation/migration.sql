-- Al-Khabir domain foundation migration (Task 10B).
--
-- ADDITIVE ONLY. Extends the identity foundation (20260101000000_init_identity)
-- with the domain schema documented in docs/06_DATABASE.md and approved by the
-- Task 10B CTO decisions:
--   1. Fault Guide publishing is a multi-state workflow
--      (draft/review/published/archived). No independent `is_active` authority.
--   2. service_requests.problem_title is optional.
--   3. Supabase remains managed PostgreSQL/PostGIS only (ADR-0004).
--
-- Nothing in this file is destructive: no DROP of existing objects, no data
-- resets. Index/constraint names follow Prisma conventions
-- (`table_col_fkey`, `table_col_key`, `table_col_idx`) so the database stays
-- introspection-aligned with prisma/schema.prisma.

-- Admin role ------------------------------------------------------------------
-- docs/09_ADMIN.md permission matrix assigns plan/pricing management to
-- Super/Finance (finance_admin). PG 12+ allows ADD VALUE inside a transaction
-- as long as the value is not used in the same transaction (it is not here).
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'finance_admin';

-- Enums -----------------------------------------------------------------------
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'suspended');

CREATE TYPE "TechnicianAvailabilityStatus" AS ENUM ('available', 'busy', 'unavailable');

CREATE TYPE "ServiceRequestStatus" AS ENUM (
  'pending',
  'accepted',
  'on_the_way',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE "FaultPublishStatus" AS ENUM ('draft', 'review', 'published', 'archived');

CREATE TYPE "ProductStatus" AS ENUM ('active', 'suspended');

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'active',
  'trialing',
  'past_due',
  'cancelled',
  'expired',
  'pending'
);

CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'file', 'system');

-- Locations / geo ---------------------------------------------------------------
CREATE TABLE "locations" (
  "id"                   UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"              UUID,
  "label"                VARCHAR(128),
  "address_text"         TEXT,
  "city"                 VARCHAR(128),
  "region"               VARCHAR(128),
  "country"              VARCHAR(128),
  "latitude"             DECIMAL(9,6)   NOT NULL,
  "longitude"            DECIMAL(9,6)   NOT NULL,
  -- PostGIS geography(Point, 4326). Derived from latitude/longitude by the
  -- trigger below so latitude/longitude remain the single business truth.
  "coordinates"          geography(Point, 4326),
  "created_at"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "locations_user_id_idx" ON "locations" ("user_id");
CREATE INDEX "locations_coordinates_gist" ON "locations" USING GIST ("coordinates");

-- Role profiles -----------------------------------------------------------------
CREATE TABLE "customer_profiles" (
  "id"                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"               UUID         NOT NULL,
  "first_name"            VARCHAR(128),
  "last_name"             VARCHAR(128),
  "avatar_url"            VARCHAR(512),
  "preferred_location_id" UUID,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "customer_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "customer_profiles_preferred_location_id_fkey"
    FOREIGN KEY ("preferred_location_id") REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "technician_profiles" (
  "id"                       UUID                            PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"                  UUID                            NOT NULL,
  "display_name"             VARCHAR(255),
  "bio"                      TEXT,
  "avatar_url"               VARCHAR(512),
  "verification_status"      "VerificationStatus"            NOT NULL DEFAULT 'pending',
  "experience_years"         INTEGER                         NOT NULL DEFAULT 0,
  "completed_services_count" INTEGER                         NOT NULL DEFAULT 0,
  -- Derived metrics. Server-authoritative only (docs/06_DATABASE.md §27).
  "rating_average"           DECIMAL(3,2),
  "rating_count"             INTEGER                         NOT NULL DEFAULT 0,
  "availability_status"      "TechnicianAvailabilityStatus"  NOT NULL DEFAULT 'unavailable',
  "created_at"               TIMESTAMP(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technician_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "technician_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "technician_profiles_verification_status_idx" ON "technician_profiles" ("verification_status");
CREATE INDEX "technician_profiles_rating_average_idx"      ON "technician_profiles" ("rating_average");
CREATE INDEX "technician_profiles_availability_status_idx" ON "technician_profiles" ("availability_status");

CREATE TABLE "merchant_profiles" (
  "id"                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"             UUID              NOT NULL,
  "business_name"       VARCHAR(255),
  "bio"                 TEXT,
  "logo_url"            VARCHAR(512),
  "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
  "contact_phone"       VARCHAR(32),
  "location_id"         UUID,
  "created_at"          TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "merchant_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "merchant_profiles_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Appliance / content catalog -----------------------------------------------------
CREATE TABLE "appliance_categories" (
  "id"         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name_ar"    VARCHAR(255) NOT NULL,
  "slug"       VARCHAR(128) NOT NULL,
  "icon_url"   VARCHAR(512),
  "image_url"  VARCHAR(512),
  "is_active"  BOOLEAN      NOT NULL DEFAULT TRUE,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appliance_categories_slug_key" UNIQUE ("slug")
);

CREATE TABLE "faults" (
  "id"                          UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  "appliance_category_id"       UUID                NOT NULL,
  "name_ar"                     VARCHAR(255)        NOT NULL,
  "slug"                        VARCHAR(128)        NOT NULL,
  "severity_level"              VARCHAR(32),
  "summary_ar"                  TEXT                NOT NULL,
  "guidance_ar"                 TEXT                NOT NULL,
  -- Nullable so DRAFT articles may be incomplete (approved workflow).
  "safety_note_ar"              TEXT,
  "when_to_call_technician_ar"  TEXT,
  -- Task 10B CTO decision 1: multi-state publishing workflow. There is
  -- deliberately NO independent `is_active` column on this table.
  "publish_status"              "FaultPublishStatus" NOT NULL DEFAULT 'draft',
  "sort_order"                  INTEGER             NOT NULL DEFAULT 0,
  "created_at"                  TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                  TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "faults_appliance_category_id_slug_key" UNIQUE ("appliance_category_id", "slug"),
  CONSTRAINT "faults_appliance_category_id_fkey"
    FOREIGN KEY ("appliance_category_id") REFERENCES "appliance_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "services" (
  "id"                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "appliance_category_id" UUID         NOT NULL,
  "name_ar"               VARCHAR(255) NOT NULL,
  "slug"                  VARCHAR(128) NOT NULL,
  "description_ar"        TEXT,
  "is_active"             BOOLEAN      NOT NULL DEFAULT TRUE,
  "sort_order"            INTEGER      NOT NULL DEFAULT 0,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "services_appliance_category_id_slug_key" UNIQUE ("appliance_category_id", "slug"),
  CONSTRAINT "services_appliance_category_id_fkey"
    FOREIGN KEY ("appliance_category_id") REFERENCES "appliance_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "fault_service_links" (
  "fault_id"   UUID NOT NULL,
  "service_id" UUID NOT NULL,
  CONSTRAINT "fault_service_links_pkey" PRIMARY KEY ("fault_id", "service_id"),
  CONSTRAINT "fault_service_links_fault_id_fkey"
    FOREIGN KEY ("fault_id") REFERENCES "faults"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fault_service_links_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "fault_service_links_service_id_idx" ON "fault_service_links" ("service_id");

CREATE TABLE "technician_services" (
  "technician_id" UUID NOT NULL,
  "service_id"    UUID NOT NULL,
  "price_from"    DECIMAL(10,2),
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "technician_services_pkey" PRIMARY KEY ("technician_id", "service_id"),
  CONSTRAINT "technician_services_technician_id_fkey"
    FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "technician_services_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Service requests / orders ---------------------------------------------------------
CREATE TABLE "service_requests" (
  "id"                    UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  "customer_id"           UUID                   NOT NULL,
  "technician_id"         UUID,
  "appliance_category_id" UUID                   NOT NULL,
  "service_id"            UUID,
  "fault_id"              UUID,
  "status"                "ServiceRequestStatus" NOT NULL DEFAULT 'pending',
  -- Optional per Task 10B CTO decision 2.
  "problem_title"         VARCHAR(255),
  "problem_description"   TEXT                   NOT NULL,
  "location_id"           UUID                   NOT NULL,
  "scheduled_at"          TIMESTAMP(3),
  -- Server-authoritative financial fields. Never client-trusted.
  "estimated_price_from"  DECIMAL(10,2),
  "estimated_price_to"    DECIMAL(10,2),
  "final_price"           DECIMAL(10,2),
  "created_at"            TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at"           TIMESTAMP(3),
  "started_at"            TIMESTAMP(3),
  "completed_at"          TIMESTAMP(3),
  "cancelled_at"          TIMESTAMP(3),
  "updated_at"            TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_requests_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_requests_technician_id_fkey"
    FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_requests_appliance_category_id_fkey"
    FOREIGN KEY ("appliance_category_id") REFERENCES "appliance_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_requests_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_requests_fault_id_fkey"
    FOREIGN KEY ("fault_id") REFERENCES "faults"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_requests_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "service_requests_customer_id_idx"    ON "service_requests" ("customer_id");
CREATE INDEX "service_requests_technician_id_idx"  ON "service_requests" ("technician_id");
CREATE INDEX "service_requests_status_idx"         ON "service_requests" ("status");
CREATE INDEX "service_requests_created_at_idx"     ON "service_requests" ("created_at");
CREATE INDEX "service_requests_location_id_idx"    ON "service_requests" ("location_id");

CREATE TABLE "service_request_status_history" (
  "id"                  UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  "service_request_id"  UUID                   NOT NULL,
  -- Null for the initial creation event.
  "from_status"         "ServiceRequestStatus",
  "to_status"           "ServiceRequestStatus" NOT NULL,
  "changed_by_user_id"  UUID,
  "note"                TEXT,
  "created_at"          TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_request_status_history_service_request_id_fkey"
    FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_request_status_history_changed_by_user_id_fkey"
    FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "service_request_status_history_service_request_id_idx"
  ON "service_request_status_history" ("service_request_id");

CREATE TABLE "service_request_media" (
  "id"                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "service_request_id"  UUID         NOT NULL,
  -- Nullable so media references survive user deletion (audit-trail pattern).
  "uploaded_by_user_id" UUID,
  -- Reference only — binaries live in object storage, never in the database.
  "storage_key"         VARCHAR(512) NOT NULL,
  "mime_type"           VARCHAR(128) NOT NULL,
  "file_size"           INTEGER      NOT NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_request_media_service_request_id_fkey"
    FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_request_media_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "service_request_media_service_request_id_idx"
  ON "service_request_media" ("service_request_id");

-- Reviews ---------------------------------------------------------------------------
CREATE TABLE "reviews" (
  "id"                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- One review per completed service request (docs/06_DATABASE.md §14).
  "service_request_id" UUID         NOT NULL,
  "customer_id"        UUID         NOT NULL,
  "technician_id"      UUID         NOT NULL,
  "rating"             INTEGER      NOT NULL,
  "comment"            TEXT,
  "problem_resolved"   BOOLEAN,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_service_request_id_key" UNIQUE ("service_request_id"),
  CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5),
  CONSTRAINT "reviews_service_request_id_fkey"
    FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reviews_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "reviews_technician_id_fkey"
    FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "reviews_technician_id_idx" ON "reviews" ("technician_id");

CREATE TABLE "review_tags" (
  "id"         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- `code` is the stable API identifier; `label_ar` is the display value.
  "code"       VARCHAR(64)  NOT NULL,
  "label_ar"   VARCHAR(255) NOT NULL,
  "is_active"  BOOLEAN      NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_tags_code_key" UNIQUE ("code")
);

CREATE TABLE "review_tag_assignments" (
  "review_id" UUID NOT NULL,
  "tag_id"    UUID NOT NULL,
  CONSTRAINT "review_tag_assignments_pkey" PRIMARY KEY ("review_id", "tag_id"),
  CONSTRAINT "review_tag_assignments_review_id_fkey"
    FOREIGN KEY ("review_id") REFERENCES "reviews"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "review_tag_assignments_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "review_tags"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Chat persistence foundation (no realtime — ADR-0004) -------------------------------
CREATE TABLE "conversations" (
  "id"                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- One conversation per service request.
  "service_request_id" UUID         NOT NULL,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at"          TIMESTAMP(3),
  CONSTRAINT "conversations_service_request_id_key" UNIQUE ("service_request_id"),
  CONSTRAINT "conversations_service_request_id_fkey"
    FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "conversation_participants" (
  "id"              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversation_id" UUID         NOT NULL,
  "user_id"         UUID         NOT NULL,
  "role_snapshot"   VARCHAR(32),
  "joined_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_participants_conversation_id_user_id_key"
    UNIQUE ("conversation_id", "user_id"),
  CONSTRAINT "conversation_participants_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants" ("user_id");

CREATE TABLE "messages" (
  "id"              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversation_id" UUID              NOT NULL,
  "sender_user_id"  UUID              NOT NULL,
  "message_type"    "MessageType"     NOT NULL,
  "body"            TEXT,
  "created_at"      TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at"         TIMESTAMP(3),
  CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" ("conversation_id", "created_at");

-- Favorites ---------------------------------------------------------------------------
CREATE TABLE "favorites" (
  "id"            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"       UUID         NOT NULL,
  "technician_id" UUID,
  "merchant_id"   UUID,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Exactly one favorite target per row.
  CONSTRAINT "favorites_single_target" CHECK (
    (CASE WHEN "technician_id" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "merchant_id"   IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),
  CONSTRAINT "favorites_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "favorites_technician_id_fkey"
    FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "favorites_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "favorites_user_id_technician_id_key" ON "favorites" ("user_id", "technician_id");
CREATE UNIQUE INDEX "favorites_user_id_merchant_id_key"   ON "favorites" ("user_id", "merchant_id");
CREATE INDEX "favorites_user_id_idx" ON "favorites" ("user_id");

-- Merchant products ---------------------------------------------------------------------
CREATE TABLE "products" (
  "id"             UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  "merchant_id"    UUID              NOT NULL,
  "name_ar"        VARCHAR(255)      NOT NULL,
  "slug"           VARCHAR(128)      NOT NULL,
  "description_ar" TEXT,
  "price"          DECIMAL(10,2),
  "stock_quantity" INTEGER,
  "image_url"      VARCHAR(512),
  "status"         "ProductStatus"   NOT NULL DEFAULT 'active',
  "created_at"     TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "products_merchant_id_slug_key" UNIQUE ("merchant_id", "slug"),
  CONSTRAINT "products_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "products_merchant_id_status_idx" ON "products" ("merchant_id", "status");

-- Subscriptions / plans / entitlements -----------------------------------------------------
CREATE TABLE "subscription_plans" (
  "id"              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  "role"            "UserRole"     NOT NULL,
  "code"            VARCHAR(64)    NOT NULL,
  "name_ar"         VARCHAR(255)   NOT NULL,
  "name_en"         VARCHAR(255),
  -- Interval values are not defined by the docs; bounded text until the
  -- commercial model is approved (reported drift).
  "billing_interval" VARCHAR(32)   NOT NULL,
  "price"           DECIMAL(10,2)  NOT NULL,
  "currency"        VARCHAR(8)     NOT NULL,
  -- Default false: no commercial pricing is approved yet (docs/08).
  "is_active"       BOOLEAN        NOT NULL DEFAULT FALSE,
  "sort_order"      INTEGER        NOT NULL DEFAULT 0,
  "created_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plans_role_code_key" UNIQUE ("role", "code")
);

CREATE TABLE "entitlements" (
  "id"             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "code"           VARCHAR(64) NOT NULL,
  "name_ar"        VARCHAR(255) NOT NULL,
  "description_ar" TEXT,
  "feature_group"  VARCHAR(64) NOT NULL,
  "is_active"      BOOLEAN     NOT NULL DEFAULT TRUE,
  CONSTRAINT "entitlements_code_key" UNIQUE ("code")
);

CREATE TABLE "plan_entitlements" (
  "plan_id"        UUID  NOT NULL,
  "entitlement_id" UUID  NOT NULL,
  "limit_value"    INTEGER,
  "metadata_json"  JSONB,
  CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("plan_id", "entitlement_id"),
  CONSTRAINT "plan_entitlements_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "plan_entitlements_entitlement_id_fkey"
    FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "subscriptions" (
  "id"                  UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"             UUID                 NOT NULL,
  "plan_id"             UUID                 NOT NULL,
  "status"              "SubscriptionStatus" NOT NULL DEFAULT 'pending',
  "started_at"          TIMESTAMP(3)         NOT NULL,
  "current_period_start" TIMESTAMP(3)        NOT NULL,
  "current_period_end"  TIMESTAMP(3)         NOT NULL,
  "cancelled_at"        TIMESTAMP(3),
  "renewal_enabled"     BOOLEAN              NOT NULL DEFAULT TRUE,
  -- Opaque provider reference. No provider is chosen yet (ADR-0001).
  "provider_reference"  VARCHAR(255),
  "created_at"          TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions" ("user_id", "status");

-- Notifications (persistence only — no delivery infrastructure) ------------------------------
CREATE TABLE "notifications" (
  "id"         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"    UUID         NOT NULL,
  "type"       VARCHAR(64)  NOT NULL,
  "title_ar"   VARCHAR(255) NOT NULL,
  "body_ar"    TEXT         NOT NULL,
  "data_json"  JSONB,
  "read_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" ("user_id", "read_at");

-- Admin audit log -----------------------------------------------------------------------------
CREATE TABLE "audit_logs" (
  "id"            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Nullable: system actions have no human actor.
  "actor_user_id" UUID,
  "entity_type"   VARCHAR(64)  NOT NULL,
  "entity_id"     VARCHAR(64)  NOT NULL,
  "action"        VARCHAR(64)  NOT NULL,
  "before_json"   JSONB,
  "after_json"    JSONB,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs" ("entity_type", "entity_id");

-- updated_at triggers (function exists from 20260101000000_init_identity) ----------------------
CREATE TRIGGER customer_profiles_set_updated_at
  BEFORE UPDATE ON "customer_profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER technician_profiles_set_updated_at
  BEFORE UPDATE ON "technician_profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER merchant_profiles_set_updated_at
  BEFORE UPDATE ON "merchant_profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER locations_set_updated_at
  BEFORE UPDATE ON "locations"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER appliance_categories_set_updated_at
  BEFORE UPDATE ON "appliance_categories"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER faults_set_updated_at
  BEFORE UPDATE ON "faults"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON "services"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER service_requests_set_updated_at
  BEFORE UPDATE ON "service_requests"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON "conversations"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscription_plans_set_updated_at
  BEFORE UPDATE ON "subscription_plans"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Location coordinates derivation ---------------------------------------------------------------
-- Keeps geography(Point, 4326) derived from latitude/longitude so there is
-- exactly one business truth (Task 10B rule 10).
CREATE OR REPLACE FUNCTION set_location_coordinates() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.coordinates := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.coordinates := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_set_coordinates
  BEFORE INSERT OR UPDATE ON "locations"
  FOR EACH ROW EXECUTE FUNCTION set_location_coordinates();

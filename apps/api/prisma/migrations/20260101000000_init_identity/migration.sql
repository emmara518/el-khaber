-- Al-Khabir initial migration: identity foundation
-- This migration creates the minimum set of tables required for
-- authentication: users, refresh tokens, password reset tokens,
-- admin_users, admin_refresh_tokens, and the supporting enums.
--
-- Generated manually because the local development database was not
-- available when this file was authored. It will be applied via
-- `prisma migrate dev` (development) and `prisma migrate deploy`
-- (staging/production) by the human once PostgreSQL/PostGIS is
-- installed locally. See docs/06_DATABASE.md and the Task #002 report.

-- Required extensions ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums -----------------------------------------------------------------------
CREATE TYPE "UserRole" AS ENUM ('customer', 'technician', 'merchant');

CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending', 'deleted');

CREATE TYPE "AdminRole" AS ENUM (
  'super_admin',
  'operations_admin',
  'content_admin',
  'support_admin'
);

-- Tables ----------------------------------------------------------------------
CREATE TABLE "users" (
  "id"              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "phone"           VARCHAR(32)  UNIQUE,
  "email"           VARCHAR(254) UNIQUE,
  "password_hash"   VARCHAR(255) NOT NULL,
  "role"            "UserRole"   NOT NULL,
  "status"          "UserStatus" NOT NULL DEFAULT 'active',
  "phone_verified"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "email_verified"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "last_login_at"   TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_phone_or_email_required"
    CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL)
);

CREATE INDEX "users_role_idx"  ON "users" ("role");
CREATE INDEX "users_status_idx" ON "users" ("status");

CREATE TABLE "refresh_tokens" (
  "id"             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"        UUID         NOT NULL,
  "token_hash"     CHAR(64)     NOT NULL UNIQUE,
  "family_id"      UUID         NOT NULL,
  "expires_at"     TIMESTAMP(3) NOT NULL,
  "revoked_at"     TIMESTAMP(3),
  "revoked_reason" VARCHAR(32),
  "user_agent"     VARCHAR(512),
  "ip_address"     VARCHAR(64),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "refresh_tokens_user_id_idx"    ON "refresh_tokens" ("user_id");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" ("family_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" ("expires_at");

CREATE TABLE "password_reset_tokens" (
  "id"         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"    UUID         NOT NULL,
  "token_hash" CHAR(64)     NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "password_reset_tokens_user_id_idx"    ON "password_reset_tokens" ("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" ("expires_at");

CREATE TABLE "admin_users" (
  "id"            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email"         VARCHAR(254) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255) NOT NULL,
  "role"          "AdminRole"  NOT NULL,
  "status"        "UserStatus" NOT NULL DEFAULT 'active',
  "last_login_at" TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "admin_users_role_idx"   ON "admin_users" ("role");
CREATE INDEX "admin_users_status_idx" ON "admin_users" ("status");

CREATE TABLE "admin_refresh_tokens" (
  "id"             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "admin_id"       UUID         NOT NULL,
  "token_hash"     CHAR(64)     NOT NULL UNIQUE,
  "family_id"      UUID         NOT NULL,
  "expires_at"     TIMESTAMP(3) NOT NULL,
  "revoked_at"     TIMESTAMP(3),
  "revoked_reason" VARCHAR(32),
  "user_agent"     VARCHAR(512),
  "ip_address"     VARCHAR(64),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_refresh_tokens_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE
);

CREATE INDEX "admin_refresh_tokens_admin_id_idx"    ON "admin_refresh_tokens" ("admin_id");
CREATE INDEX "admin_refresh_tokens_family_id_idx"  ON "admin_refresh_tokens" ("family_id");
CREATE INDEX "admin_refresh_tokens_expires_at_idx" ON "admin_refresh_tokens" ("expires_at");

-- updated_at triggers --------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER admin_users_set_updated_at
  BEFORE UPDATE ON "admin_users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

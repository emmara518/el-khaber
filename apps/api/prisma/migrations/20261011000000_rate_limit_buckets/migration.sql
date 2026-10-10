-- Shared-store rate limiting for multi-instance safety.
--
-- Replaces in-memory throttling with a PostgreSQL-backed fixed-window
-- counter. Each bucket is keyed by (policy, identifier, windowStart) so
-- different routes can have different limits (auth vs default) while
-- sharing a single table.
--
-- Fail-closed: if the database is unavailable, the service layer rejects
-- the request rather than falling back to in-memory state.

CREATE TABLE "rate_limit_buckets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policy" VARCHAR(64) NOT NULL,
  "identifier" VARCHAR(255) NOT NULL,
  "window_start" TIMESTAMPTZ NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_buckets_policy_identifier_window_start_key"
  ON "rate_limit_buckets" ("policy", "identifier", "window_start");

CREATE INDEX "rate_limit_buckets_policy_identifier_idx"
  ON "rate_limit_buckets" ("policy", "identifier");

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limit_buckets_updated_at
BEFORE UPDATE ON "rate_limit_buckets"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
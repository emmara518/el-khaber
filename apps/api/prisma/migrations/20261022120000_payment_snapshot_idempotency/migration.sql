-- PAY-001 / PAY-002: snapshot the commercial terms shown at submission and
-- make repeated manual-payment submissions idempotent at the database level.
--
-- Existing submissions are backfilled from their plan's current price. This
-- is the only defensible backfill because the historical amount was never
-- stored; after this migration every new row carries its own snapshot.

ALTER TABLE "payment_submissions"
  ADD COLUMN "amount" DECIMAL(10,2),
  ADD COLUMN "currency" VARCHAR(8);

UPDATE "payment_submissions" AS ps
SET "amount" = sp."price",
    "currency" = sp."currency"
FROM "subscription_plans" AS sp
WHERE sp."id" = ps."plan_id";

ALTER TABLE "payment_submissions"
  ALTER COLUMN "amount" SET NOT NULL,
  ALTER COLUMN "currency" SET NOT NULL;

CREATE UNIQUE INDEX "payment_submissions_user_id_plan_id_transfer_reference_key"
  ON "payment_submissions" ("user_id", "plan_id", "transfer_reference");

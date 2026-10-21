-- Al-Khabir payment-proof lifecycle metadata (PHASE 20).
--
-- ADDITIVE ONLY. Extends `payment_submissions` with the confirm-time
-- proof metadata bound by the proof lifecycle (HEAD + magic-byte
-- validated, then atomically attached to the still-pending submission):
--   1. proof_mime_type    — canonical MIME sniffed from magic bytes
--      (image/jpeg | image/png | image/webp), never client-trusted.
--   2. proof_byte_size    — object size in bytes from storage HEAD.
--   3. proof_confirmed_at — when the proof was validated and bound.
--
-- All three are NULLABLE: pre-existing submissions (and submissions
-- created without a proof) stay valid; no backfill, no data touched.
-- No existing tables are altered destructively.

ALTER TABLE "payment_submissions" ADD COLUMN "proof_mime_type" VARCHAR(128);
ALTER TABLE "payment_submissions" ADD COLUMN "proof_byte_size" INTEGER;
ALTER TABLE "payment_submissions" ADD COLUMN "proof_confirmed_at" TIMESTAMP(3);

-- DB-004: make product-conversation initiators referential and non-null.
--
-- A product conversation is keyed by (product_id, initiator_user_id). A NULL
-- initiator defeats the uniqueness intent (PostgreSQL treats NULLs as
-- distinct) and leaves a dangling user id. Existing product conversations
-- are required to have an initiator; the check is added after the FK so the
-- database rejects any future violation.

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_initiator_user_id_fkey"
  FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_product_initiator_required"
  CHECK ("product_id" IS NULL OR "initiator_user_id" IS NOT NULL);

-- Merchant product conversations (Phase D).
--
-- A conversation is scoped to EITHER a service request (customer ↔ technician,
-- existing) OR a product (initiator ↔ merchant). `service_request_id` becomes
-- nullable so product conversations can omit it; a CHECK enforces exactly one
-- scope. Product conversations are keyed by (product_id, initiator_user_id) so
-- opening the same product chat twice reuses the conversation.

-- AlterTable
ALTER TABLE "conversations"
  ADD COLUMN "product_id" UUID,
  ADD COLUMN "initiator_user_id" UUID,
  ALTER COLUMN "service_request_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "conversations_product_id_initiator_user_id_key"
  ON "conversations"("product_id", "initiator_user_id");

-- AddForeignKey
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one scope per conversation (service request XOR product).
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_scope_exclusive"
  CHECK (("service_request_id" IS NOT NULL) <> ("product_id" IS NOT NULL));

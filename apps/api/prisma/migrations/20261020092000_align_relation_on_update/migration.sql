-- Align relation ON UPDATE behaviour with prisma/schema.prisma.
-- Prisma's default for a relation is ON UPDATE CASCADE; the original
-- migrations omitted it (PostgreSQL default NO ACTION), so `migrate diff`
-- reported a drop/add pair on every run.
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";
ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_refresh_tokens" DROP CONSTRAINT "admin_refresh_tokens_admin_id_fkey";
ALTER TABLE "admin_refresh_tokens"
  ADD CONSTRAINT "admin_refresh_tokens_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

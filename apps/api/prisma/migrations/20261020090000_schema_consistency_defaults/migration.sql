-- Align the physical schema with prisma/schema.prisma.
--
-- `users.id` is generated client-side by Prisma (`@default(uuid())`) and
-- `users.updated_at` is maintained by Prisma (`@updatedAt`) plus the
-- existing set_updated_at trigger. The legacy database defaults were
-- redundant and caused `prisma migrate diff` drift on every clean deploy.
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

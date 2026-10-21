-- Immediate access-token revocation via tokenVersion.
--
-- Access tokens embed the subject's tokenVersion. The auth guard compares
-- the JWT claim against the database on every request, so incrementing
-- this column (logout, password reset, admin suspension) invalidates every
-- previously issued access token on the next request instead of after the
-- access-token TTL. Both the end-user authority (users) and the admin
-- authority (admin_users) are covered.

ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "admin_users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

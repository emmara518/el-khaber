-- AUTH-001: email changes require re-authentication and proof of ownership
-- of the new address before password recovery can use it.
--
-- ADDITIVE ONLY. Existing users keep email_change_pending=false, so their
-- current recovery address continues to work. A changed address is stored
-- immediately but marked pending; password-reset issuance is refused until
-- the one-time verification token is consumed.

ALTER TABLE "users"
  ADD COLUMN "email_change_pending" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "email_verification_tokens" (
  "id"         UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "new_email"  VARCHAR(254) NOT NULL,
  "token_hash" CHAR(64)     NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_verification_tokens_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "email_verification_tokens_user_id_idx"
  ON "email_verification_tokens" ("user_id");

CREATE INDEX "email_verification_tokens_expires_at_idx"
  ON "email_verification_tokens" ("expires_at");

-- This table is only ever accessed by the trusted API role. Keep the same
-- deny-by-default PostgREST posture as the rest of the public schema.
ALTER TABLE public."email_verification_tokens" ENABLE ROW LEVEL SECURITY;

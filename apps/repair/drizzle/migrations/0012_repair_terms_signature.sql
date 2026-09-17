ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "terms_version" text;
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "terms_signed_at" timestamptz;
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "terms_signer_name" text;

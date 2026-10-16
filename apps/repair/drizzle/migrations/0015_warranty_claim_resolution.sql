ALTER TABLE "warranty_claims" ADD COLUMN IF NOT EXISTS "resolution_kind" text;
ALTER TABLE "warranty_claims" ADD COLUMN IF NOT EXISTS "refund_ore" integer DEFAULT 0 NOT NULL;
ALTER TABLE "warranty_claims" ADD COLUMN IF NOT EXISTS "signer_name" text;
ALTER TABLE "warranty_claims" ADD COLUMN IF NOT EXISTS "signed_at" timestamp with time zone;
ALTER TABLE "warranty_claims" ADD COLUMN IF NOT EXISTS "signature_path" text;
ALTER TABLE "warranty_claims" ADD COLUMN IF NOT EXISTS "stripe_refund_id" text;

ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" text;
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "stripe_checkout_url" text;
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "repair_tickets_stripe_checkout_session_id_idx"
  ON "repair_tickets" ("stripe_checkout_session_id");

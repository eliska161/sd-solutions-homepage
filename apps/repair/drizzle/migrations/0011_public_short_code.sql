ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "public_short_code" text;
CREATE UNIQUE INDEX IF NOT EXISTS "repair_tickets_public_short_code_uidx" ON "repair_tickets" ("public_short_code");

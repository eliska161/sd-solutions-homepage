ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "pickup_pin" text;
CREATE UNIQUE INDEX IF NOT EXISTS "repair_tickets_pickup_pin_uidx" ON "repair_tickets" ("pickup_pin");

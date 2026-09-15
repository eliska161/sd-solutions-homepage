ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "dropoff_on" text;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "dropoff_slot" text;

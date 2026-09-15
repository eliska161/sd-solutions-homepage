DO $$ BEGIN
  CREATE TYPE "repair_source" AS ENUM('STAFF', 'CUSTOMER_PORTAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "repair_delivery_method" AS ENUM('IN_PERSON', 'POST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "source" "repair_source" DEFAULT 'STAFF' NOT NULL;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "inbound_method" "repair_delivery_method" DEFAULT 'IN_PERSON' NOT NULL;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "outbound_method" "repair_delivery_method" DEFAULT 'IN_PERSON' NOT NULL;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "inbound_postage_ore" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "outbound_postage_ore" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "received_at" timestamptz;
--> statement-breakpoint
UPDATE "repair_tickets"
SET "received_at" = "created_at"
WHERE "received_at" IS NULL AND "source" = 'STAFF';

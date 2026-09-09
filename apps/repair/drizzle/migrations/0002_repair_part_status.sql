DO $$ BEGIN
  CREATE TYPE "repair_part_status" AS ENUM('USED', 'ORDERED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "repair_parts" ADD COLUMN IF NOT EXISTS "status" "repair_part_status" DEFAULT 'USED' NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_parts" ADD COLUMN IF NOT EXISTS "notes" text;

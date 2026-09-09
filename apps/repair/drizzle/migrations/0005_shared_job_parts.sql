ALTER TABLE "repair_parts" ALTER COLUMN "ticket_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_parts" ADD COLUMN IF NOT EXISTS "refurbishment_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "repair_parts_refurbishment_id_idx" ON "repair_parts" USING btree ("refurbishment_id");

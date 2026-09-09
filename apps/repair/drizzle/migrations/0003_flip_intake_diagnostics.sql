DO $$ BEGIN
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "condition_grade" text;
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "cosmetic_fault_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "repair_fault_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "condition_comment" text;
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "fault_comment" text;
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "condition_summary" text;
  ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "fault_summary" text;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flip_intake_inspections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "refurbishment_id" uuid NOT NULL UNIQUE,
  "inspected_by_id" text,
  "damage_notes" text,
  "physical_zones" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "flip_intake_inspections"
    ADD CONSTRAINT "flip_intake_inspections_refurbishment_id_refurbishments_id_fk"
    FOREIGN KEY ("refurbishment_id") REFERENCES "public"."refurbishments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flip_intake_inspections_refurbishment_id_idx" ON "flip_intake_inspections" USING btree ("refurbishment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnostics_refurbishment_id_idx" ON "diagnostics" USING btree ("refurbishment_id");

ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "discount_ore" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "discount_label" text;

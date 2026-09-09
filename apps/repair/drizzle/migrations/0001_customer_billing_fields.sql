-- Backfill before NOT NULL
UPDATE "customers" SET "phone" = coalesce(nullif("phone", ''), 'Ukjent') WHERE "phone" IS NULL OR "phone" = '';--> statement-breakpoint
UPDATE "customers" SET "email" = coalesce(nullif("email", ''), 'ukjent@example.invalid') WHERE "email" IS NULL OR "email" = '';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "street_address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "postal_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'Norge' NOT NULL;

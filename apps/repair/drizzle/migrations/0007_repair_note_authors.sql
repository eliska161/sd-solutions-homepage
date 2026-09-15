DO $$ BEGIN
  CREATE TYPE "note_author_kind" AS ENUM('STAFF', 'CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "repair_notes" ADD COLUMN IF NOT EXISTS "author_name" text;
--> statement-breakpoint
ALTER TABLE "repair_notes" ADD COLUMN IF NOT EXISTS "author_kind" "note_author_kind" DEFAULT 'STAFF' NOT NULL;

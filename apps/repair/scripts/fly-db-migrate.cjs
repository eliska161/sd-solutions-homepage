/**
 * Fly release / production schema migrate (CommonJS so NODE_PATH works).
 *
 * - Empty DB: applies all drizzle/migrations normally
 * - Existing schema from earlier db:push / partial deploys:
 *   baseline ONLY the init migration (0000), then apply later migrations
 * - Never mark additive migrations as applied without running them
 * - Idempotent safety net for customer billing columns (street_address etc.)
 */
const path = require("node:path");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");
const { readMigrationFiles } = require("drizzle-orm/migrator");
const postgres = require("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — cannot migrate");
  process.exit(1);
}

const migrationsFolder = path.join(__dirname, "..", "drizzle", "migrations");

async function publicTableExists(client, tableName) {
  const rows = await client`
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = ${tableName}
    limit 1
  `;
  return rows.length > 0;
}

async function publicColumnExists(client, tableName, columnName) {
  const rows = await client`
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = ${tableName}
      and column_name = ${columnName}
    limit 1
  `;
  return rows.length > 0;
}

/**
 * If the DB was created outside Drizzle migrate (e.g. db:push), mark only the
 * init migration as applied so recreate-from-scratch SQL is skipped.
 * Later migrations must still run for real.
 */
async function baselineInitMigrationOnly(client) {
  const migrations = readMigrationFiles({ migrationsFolder });
  const init = migrations[0];
  if (!init) return;

  await client`create schema if not exists drizzle`;
  await client`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  const existing = await client`
    select 1 from drizzle.__drizzle_migrations
    where hash = ${init.hash}
    limit 1
  `;
  if (existing.length === 0) {
    await client`
      insert into drizzle.__drizzle_migrations ("hash", "created_at")
      values (${init.hash}, ${init.folderMillis})
    `;
    console.log(
      "==> Baselined init migration only:",
      init.hash.slice(0, 12) + "…",
    );
  } else {
    console.log("==> Init migration already recorded");
  }
}

/**
 * Recover from earlier bug: baselining ALL migrations marked 0001 applied
 * without adding columns. Safe to re-run (IF NOT EXISTS / coalesce updates).
 */
async function ensureCustomerBillingColumns(client) {
  const hasCustomers = await publicTableExists(client, "customers");
  if (!hasCustomers) return;

  const hasStreet = await publicColumnExists(
    client,
    "customers",
    "street_address",
  );
  if (hasStreet) {
    console.log("==> Customer billing columns already present");
    return;
  }

  console.log("==> Applying customer billing columns (idempotent repair)");
  await client`
    UPDATE "customers"
    SET "phone" = coalesce(nullif("phone", ''), 'Ukjent')
    WHERE "phone" IS NULL OR "phone" = ''
  `;
  await client`
    UPDATE "customers"
    SET "email" = coalesce(nullif("email", ''), 'ukjent@example.invalid')
    WHERE "email" IS NULL OR "email" = ''
  `;
  await client`ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL`;
  await client`ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL`;
  await client`
    ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "street_address" text DEFAULT '' NOT NULL
  `;
  await client`
    ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "postal_code" text DEFAULT '' NOT NULL
  `;
  await client`
    ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "city" text DEFAULT '' NOT NULL
  `;
  await client`
    ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'Norge' NOT NULL
  `;
  console.log("==> Customer billing columns ready");
}

async function ensureRepairPartStatus(client) {
  const hasTable = await publicTableExists(client, "repair_parts");
  if (!hasTable) return;

  await client.unsafe(`
    DO $$ BEGIN
      CREATE TYPE "repair_part_status" AS ENUM('USED', 'ORDERED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  const hasStatus = await publicColumnExists(client, "repair_parts", "status");
  if (!hasStatus) {
    console.log("==> Adding repair_parts.status / notes (idempotent repair)");
    await client.unsafe(`
      ALTER TABLE "repair_parts"
      ADD COLUMN IF NOT EXISTS "status" "repair_part_status" DEFAULT 'USED' NOT NULL
    `);
    await client.unsafe(`
      ALTER TABLE "repair_parts"
      ADD COLUMN IF NOT EXISTS "notes" text
    `);
  } else {
    console.log("==> repair_parts.status already present");
  }
}

/** Flip mottak / tilstand / diagnostikk — idempotent if migrate was skipped. */
async function ensureFlipIntakeDiagnostics(client) {
  const hasRefurb = await publicTableExists(client, "refurbishments");
  if (!hasRefurb) return;

  console.log("==> Ensuring flip intake / condition columns");
  await client.unsafe(`
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "condition_grade" text;
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "cosmetic_fault_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "repair_fault_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "condition_comment" text;
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "fault_comment" text;
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "condition_summary" text;
    ALTER TABLE "refurbishments" ADD COLUMN IF NOT EXISTS "fault_summary" text;
  `);

  await client.unsafe(`
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
    );
  `);

  await client.unsafe(`
    DO $$ BEGIN
      ALTER TABLE "flip_intake_inspections"
        ADD CONSTRAINT "flip_intake_inspections_refurbishment_id_refurbishments_id_fk"
        FOREIGN KEY ("refurbishment_id") REFERENCES "public"."refurbishments"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.unsafe(`
    CREATE INDEX IF NOT EXISTS "flip_intake_inspections_refurbishment_id_idx"
      ON "flip_intake_inspections" USING btree ("refurbishment_id");
  `);

  const hasDiagnostics = await publicTableExists(client, "diagnostics");
  if (hasDiagnostics) {
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS "diagnostics_refurbishment_id_idx"
        ON "diagnostics" USING btree ("refurbishment_id");
    `);
  }

  console.log("==> Flip intake / condition schema ready");
}

async function ensureTicketDiscount(client) {
  const hasTickets = await publicTableExists(client, "repair_tickets");
  if (!hasTickets) return;

  const hasDiscount = await publicColumnExists(
    client,
    "repair_tickets",
    "discount_ore",
  );
  if (hasDiscount) {
    console.log("==> repair_tickets.discount_ore already present");
    return;
  }

  console.log("==> Adding repair_tickets discount columns (idempotent)");
  await client.unsafe(`
    ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "discount_ore" integer DEFAULT 0 NOT NULL;
    ALTER TABLE "repair_tickets" ADD COLUMN IF NOT EXISTS "discount_label" text;
  `);
  console.log("==> Ticket discount columns ready");
}

async function ensureSharedJobParts(client) {
  const hasTable = await publicTableExists(client, "repair_parts");
  if (!hasTable) return;

  console.log("==> Ensuring shared job parts (ticket + flip)");
  await client.unsafe(`
    ALTER TABLE "repair_parts" ALTER COLUMN "ticket_id" DROP NOT NULL;
    ALTER TABLE "repair_parts" ADD COLUMN IF NOT EXISTS "refurbishment_id" uuid;
    CREATE INDEX IF NOT EXISTS "repair_parts_refurbishment_id_idx"
      ON "repair_parts" USING btree ("refurbishment_id");
  `);
  console.log("==> Shared job parts ready");
}

async function main() {
  console.log("==> Applying Drizzle migrations from", migrationsFolder);
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const db = drizzle(client);
  try {
    const hasUsers = await publicTableExists(client, "users");
    if (hasUsers) {
      console.log(
        "==> Existing schema detected — baseline init migration only (not later ones)",
      );
      await baselineInitMigrationOnly(client);
    }

    await migrate(db, { migrationsFolder });
    await ensureCustomerBillingColumns(client);
    await ensureRepairPartStatus(client);
    await ensureFlipIntakeDiagnostics(client);
    await ensureTicketDiscount(client);
    await ensureSharedJobParts(client);
    console.log("==> Migrations complete");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("==> Migration failed");
  console.error(err);
  process.exit(1);
});

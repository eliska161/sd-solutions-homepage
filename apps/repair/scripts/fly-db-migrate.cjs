/**
 * Fly release / production schema migrate (CommonJS so NODE_PATH works).
 * - Empty DB: applies drizzle/migrations
 * - Existing schema (e.g. created earlier): baselines migration journal, no destructive reset
 */
const fs = require("node:fs");
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

async function baselineIfNeeded(client) {
  const migrations = readMigrationFiles({ migrationsFolder });
  await client`create schema if not exists drizzle`;
  await client`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  for (const migration of migrations) {
    const existing = await client`
      select 1 from drizzle.__drizzle_migrations
      where hash = ${migration.hash}
      limit 1
    `;
    if (existing.length === 0) {
      await client`
        insert into drizzle.__drizzle_migrations ("hash", "created_at")
        values (${migration.hash}, ${migration.folderMillis})
      `;
      console.log("==> Baselined migration hash", migration.hash.slice(0, 12) + "…");
    } else {
      console.log("==> Migration already recorded");
    }
  }
}

async function main() {
  console.log("==> Applying Drizzle migrations from", migrationsFolder);
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);
  try {
    const hasUsers = await publicTableExists(client, "users");
    if (hasUsers) {
      console.log("==> Existing schema detected — baselining migrations (skip recreate)");
      await baselineIfNeeded(client);
    }

    await migrate(db, { migrationsFolder });
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

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as {
  repairSql?: ReturnType<typeof postgres>;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return postgres(url, { max: 10, prepare: false });
}

export function getSql() {
  if (!globalForDb.repairSql) {
    globalForDb.repairSql = createClient();
  }
  return globalForDb.repairSql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}

export type Db = ReturnType<typeof getDb>;

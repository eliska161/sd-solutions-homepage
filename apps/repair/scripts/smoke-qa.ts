import { eq, sql } from "drizzle-orm";
import {
  customers,
  devices,
  flipCandidates,
  inventoryTransactions,
  parts,
  refurbishments,
  repairTickets,
} from "../src/db/schema";
import { getDb } from "../src/lib/db";

async function main() {
  const db = getDb();
  const counts = {
    customers: (await db.select({ n: sql<number>`count(*)::int` }).from(customers))[0].n,
    devices: (await db.select({ n: sql<number>`count(*)::int` }).from(devices))[0].n,
    repairs: (await db.select({ n: sql<number>`count(*)::int` }).from(repairTickets))[0].n,
    parts: (await db.select({ n: sql<number>`count(*)::int` }).from(parts))[0].n,
    inventoryTx: (await db.select({ n: sql<number>`count(*)::int` }).from(inventoryTransactions))[0].n,
    flips: (await db.select({ n: sql<number>`count(*)::int` }).from(refurbishments))[0].n,
    candidates: (await db.select({ n: sql<number>`count(*)::int` }).from(flipCandidates))[0].n,
  };
  console.log("QA counts:", counts);
  if (counts.customers < 1 || counts.repairs < 1 || counts.parts < 1) {
    throw new Error("Seed data missing — run npm run db:seed");
  }
  const [stock] = await db.select().from(parts).where(eq(parts.active, true)).limit(1);
  if (!stock) throw new Error("No active parts");
  console.log("Smoke QA OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

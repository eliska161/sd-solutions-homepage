import { getDb, getSql } from "../src/lib/db";
import { repairTickets } from "../src/db/schema";
import { getPublicRepairByToken } from "../src/server/public-status";

async function main() {
  const db = getDb();
  const [t] = await db.select().from(repairTickets).limit(1);
  if (!t) throw new Error("no ticket");
  console.log("token_len", t.publicAccessToken.length);
  const pub = await getPublicRepairByToken(t.publicAccessToken);
  const raw = JSON.stringify(pub);
  console.log("public_ok", Boolean(pub));
  console.log("leaks_internal", /internalProblem|actualPartsCost|supplier|profit/i.test(raw));
  console.log("status", pub?.statusLabel, "tech", pub?.technicianName);
  console.log("bad_token", await getPublicRepairByToken("aa".repeat(32)));
  console.log("short_token", await getPublicRepairByToken("not-a-token"));
  await getSql().end({ timeout: 3 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

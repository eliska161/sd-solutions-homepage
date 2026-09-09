"use server";

import { desc, eq } from "drizzle-orm";
import { inventoryTransactions, parts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Inventory mutations. Part catalog CRUD lives in parts.ts;
 * stock ledger operations are re-exported here for a clear inventory API.
 */
export {
  listParts,
  createPart,
  updatePart,
  receiveStock,
  usePartOnRepair,
} from "@/server/parts";

export { listParts as listInventoryParts } from "@/server/parts";

export async function listInventoryMovements(limit = 100) {
  await requireSession();
  const db = getDb();
  return db
    .select({
      id: inventoryTransactions.id,
      partId: inventoryTransactions.partId,
      action: inventoryTransactions.action,
      quantityDelta: inventoryTransactions.quantityDelta,
      unitCostOre: inventoryTransactions.unitCostOre,
      resultingQuantity: inventoryTransactions.resultingQuantity,
      repairTicketId: inventoryTransactions.repairTicketId,
      note: inventoryTransactions.note,
      createdAt: inventoryTransactions.createdAt,
      partSku: parts.sku,
      partName: parts.name,
    })
    .from(inventoryTransactions)
    .leftJoin(parts, eq(parts.id, inventoryTransactions.partId))
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);
}

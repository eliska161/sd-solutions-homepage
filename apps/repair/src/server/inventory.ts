"use server";

import { desc, eq } from "drizzle-orm";
import { inventoryTransactions, parts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

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

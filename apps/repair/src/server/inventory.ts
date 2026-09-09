"use server";

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

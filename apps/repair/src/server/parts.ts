"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  inventoryTransactions,
  parts,
  repairParts,
  repairTickets,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getRepair } from "@/server/repairs";
import { ilike, or, sql } from "drizzle-orm";

const partTypeSchema = z.enum([
  "OEM",
  "ORIGINAL_PULL",
  "SOFT_OLED",
  "HARD_OLED",
  "LCD",
  "INCELL",
  "BATTERY",
  "FLEX",
  "OTHER",
]);

const partInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  partType: partTypeSchema.default("OTHER"),
  costPriceOre: z.number().int().min(0).default(0),
  sellPriceOre: z.number().int().min(0).optional().nullable(),
  quantityOnHand: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).default(0),
  location: z.string().optional().nullable(),
  warrantyDays: z.number().int().optional().nullable(),
  active: z.boolean().default(true),
});

export async function listParts(query?: string) {
  await requireSession();
  const db = getDb();
  const q = query?.trim();
  return db
    .select()
    .from(parts)
    .where(
      q
        ? or(ilike(parts.sku, `%${q}%`), ilike(parts.name, `%${q}%`))
        : undefined,
    )
    .orderBy(desc(parts.updatedAt));
}

export async function createPart(input: z.infer<typeof partInputSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = partInputSchema.parse(input);
  const db = getDb();

  const [row] = await db
    .insert(parts)
    .values({
      sku: data.sku,
      name: data.name,
      category: data.category || null,
      brand: data.brand || null,
      partType: data.partType,
      costPriceOre: data.costPriceOre,
      sellPriceOre: data.sellPriceOre ?? null,
      quantityOnHand: data.quantityOnHand ?? 0,
      minimumStock: data.minimumStock,
      location: data.location || null,
      warrantyDays: data.warrantyDays ?? null,
      active: data.active,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "part",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/parts");
  return row;
}

export async function updatePart(
  id: string,
  input: Partial<z.infer<typeof partInputSchema>>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = partInputSchema.partial().parse(input);
  const db = getDb();

  const [before] = await db.select().from(parts).where(eq(parts.id, id)).limit(1);
  if (!before) throw new Error("Del ikke funnet");

  const [row] = await db
    .update(parts)
    .set({
      ...data,
      category: data.category === undefined ? undefined : data.category || null,
      brand: data.brand === undefined ? undefined : data.brand || null,
      location: data.location === undefined ? undefined : data.location || null,
      updatedAt: new Date(),
    })
    .where(eq(parts.id, id))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "part",
    entityId: id,
    action: "update",
    before,
    after: row,
  });

  revalidatePath("/inventory/parts");
  return row;
}

export async function receiveStock(input: {
  partId: string;
  quantity: number;
  unitCostOre?: number;
  note?: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const schema = z.object({
    partId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitCostOre: z.number().int().min(0).optional(),
    note: z.string().optional(),
  });
  const data = schema.parse(input);
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(parts)
      .where(eq(parts.id, data.partId))
      .for("update");
    const part = locked[0];
    if (!part) throw new Error("Del ikke funnet");

    const resulting = part.quantityOnHand + data.quantity;
    const [updated] = await tx
      .update(parts)
      .set({
        quantityOnHand: resulting,
        costPriceOre: data.unitCostOre ?? part.costPriceOre,
        updatedAt: new Date(),
      })
      .where(eq(parts.id, data.partId))
      .returning();

    await tx.insert(inventoryTransactions).values({
      partId: data.partId,
      action: "RECEIVED",
      quantityDelta: data.quantity,
      unitCostOre: data.unitCostOre ?? part.costPriceOre,
      resultingQuantity: resulting,
      note: data.note || null,
      createdById: session.user.id,
    });

    return updated;
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/parts");
  revalidatePath("/inventory/movements");
  return result;
}

export async function usePartOnRepair(input: {
  ticketId: string;
  partId: string;
  quantity: number;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const schema = z.object({
    ticketId: z.string().uuid(),
    partId: z.string().uuid(),
    quantity: z.number().int().positive(),
  });
  const data = schema.parse(input);
  const db = getDb();

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const result = await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(parts)
      .where(eq(parts.id, data.partId))
      .for("update");
    const part = locked[0];
    if (!part) throw new Error("Del ikke funnet");

    const resulting = part.quantityOnHand - data.quantity;
    if (resulting < 0) {
      throw new Error("Ikke nok lagerbeholdning");
    }

    const [updated] = await tx
      .update(parts)
      .set({ quantityOnHand: resulting, updatedAt: new Date() })
      .where(eq(parts.id, data.partId))
      .returning();

    await tx.insert(inventoryTransactions).values({
      partId: data.partId,
      action: "USED",
      quantityDelta: -data.quantity,
      unitCostOre: part.costPriceOre,
      resultingQuantity: resulting,
      repairTicketId: data.ticketId,
      createdById: session.user.id,
    });

    const [repairPart] = await tx
      .insert(repairParts)
      .values({
        ticketId: data.ticketId,
        partId: data.partId,
        quantity: data.quantity,
        unitCostOre: part.costPriceOre,
        status: "USED",
      })
      .returning();

    const [{ total }] = await tx
      .select({
        total: sql<number>`coalesce(sum(${repairParts.quantity} * ${repairParts.unitCostOre}), 0)::int`,
      })
      .from(repairParts)
      .where(eq(repairParts.ticketId, data.ticketId));

    await tx
      .update(repairTickets)
      .set({ actualPartsCostOre: total, updatedAt: new Date() })
      .where(eq(repairTickets.id, data.ticketId));

    return { part: updated, repairPart, partName: part.name };
  });

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.part_used",
    message: `Brukte ${data.quantity} × ${result.partName}`,
    actorId: session.user.id,
  });

  revalidatePath("/inventory");
  revalidatePath(`/repairs/${data.ticketId}`);
  return { part: result.part, repairPart: result.repairPart };
}

/** Create a catalog part with 0 stock and attach it to the ticket as ORDERED (bestilt). */
export async function orderPartForRepair(input: {
  ticketId: string;
  name: string;
  details?: string | null;
  brand?: string | null;
  category?: string | null;
  partType?: z.infer<typeof partTypeSchema>;
  quantity?: number;
  estimatedCostOre?: number;
  setTicketWaiting?: boolean;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const schema = z.object({
    ticketId: z.string().uuid(),
    name: z.string().min(2, "Navn på del er påkrevd"),
    details: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    partType: partTypeSchema.default("OTHER"),
    quantity: z.number().int().positive().default(1),
    estimatedCostOre: z.number().int().min(0).default(0),
    setTicketWaiting: z.boolean().default(true),
  });
  const data = schema.parse(input);

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const db = getDb();
  const sku = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const notes = data.details?.trim() || null;

  const result = await db.transaction(async (tx) => {
    const [part] = await tx
      .insert(parts)
      .values({
        sku,
        name: data.name.trim(),
        category: data.category?.trim() || "Bestilt",
        brand: data.brand?.trim() || null,
        partType: data.partType,
        costPriceOre: data.estimatedCostOre,
        quantityOnHand: 0,
        minimumStock: 0,
        location: "BESTILT",
        active: true,
      })
      .returning();

    const [repairPart] = await tx
      .insert(repairParts)
      .values({
        ticketId: data.ticketId,
        partId: part.id,
        quantity: data.quantity,
        unitCostOre: data.estimatedCostOre,
        status: "ORDERED",
        notes,
      })
      .returning();

    const [{ total }] = await tx
      .select({
        total: sql<number>`coalesce(sum(${repairParts.quantity} * ${repairParts.unitCostOre}), 0)::int`,
      })
      .from(repairParts)
      .where(eq(repairParts.ticketId, data.ticketId));

    const ticketPatch: {
      actualPartsCostOre: number;
      updatedAt: Date;
      status?: typeof ticket.status;
    } = {
      actualPartsCostOre: total,
      updatedAt: new Date(),
    };

    if (
      data.setTicketWaiting &&
      ticket.status !== "WAITING_FOR_PART" &&
      ticket.status !== "COMPLETED" &&
      ticket.status !== "CANCELLED" &&
      ticket.status !== "RETURNED"
    ) {
      ticketPatch.status = "WAITING_FOR_PART";
    }

    await tx
      .update(repairTickets)
      .set(ticketPatch)
      .where(eq(repairTickets.id, data.ticketId));

    return { part, repairPart };
  });

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.part_ordered",
    message: `Bestilt del: ${data.quantity} × ${data.name.trim()}`,
    actorId: session.user.id,
    meta: { partId: result.part.id, notes },
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/parts");
  revalidatePath(`/repairs/${data.ticketId}`);
  revalidatePath("/repairs");
  return result;
}

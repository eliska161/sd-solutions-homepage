"use server";

import {
  inventoryTransactions,
  parts,
  repairParts,
  repairTickets,
  refurbishmentCosts,
  refurbishments,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { getRepair } from "@/server/repairs";
import { getFlip } from "@/server/flips";
import { and, desc, eq, ilike, isNotNull, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

/** Attach an in-stock part to a repair (consumes inventory). */
export async function attachPartToRepair(input: {
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

/** Remove a part line from a ticket. Restores stock for USED lines. */
export async function removePartFromRepair(input: {
  ticketId: string;
  repairPartId: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      ticketId: z.string().uuid(),
      repairPartId: z.string().uuid(),
    })
    .parse(input);
  const db = getDb();

  const ticket = await getRepair(data.ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const result = await db.transaction(async (tx) => {
    const [line] = await tx
      .select({
        id: repairParts.id,
        partId: repairParts.partId,
        quantity: repairParts.quantity,
        unitCostOre: repairParts.unitCostOre,
        status: repairParts.status,
        partName: parts.name,
      })
      .from(repairParts)
      .leftJoin(parts, eq(parts.id, repairParts.partId))
      .where(
        and(
          eq(repairParts.id, data.repairPartId),
          eq(repairParts.ticketId, data.ticketId),
        ),
      )
      .limit(1);
    if (!line) throw new Error("Del ikke funnet på ticket");

    if (line.status === "USED") {
      const locked = await tx
        .select()
        .from(parts)
        .where(eq(parts.id, line.partId))
        .for("update");
      const part = locked[0];
      if (!part) throw new Error("Del ikke funnet i lager");

      const resulting = part.quantityOnHand + line.quantity;
      await tx
        .update(parts)
        .set({ quantityOnHand: resulting, updatedAt: new Date() })
        .where(eq(parts.id, line.partId));

      await tx.insert(inventoryTransactions).values({
        partId: line.partId,
        action: "RETURNED",
        quantityDelta: line.quantity,
        unitCostOre: line.unitCostOre,
        resultingQuantity: resulting,
        repairTicketId: data.ticketId,
        createdById: session.user.id,
      });
    }

    await tx.delete(repairParts).where(eq(repairParts.id, line.id));

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

    return line;
  });

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "repair.part_removed",
    message: `Fjernet del: ${result.quantity} × ${result.partName ?? "ukjent"}`,
    actorId: session.user.id,
  });

  revalidatePath("/inventory");
  revalidatePath(`/repairs/${data.ticketId}`);
  return { ok: true };
}

/** Open ORDERED lines awaiting goods receipt (repairs + flips). */
export async function listOpenOrderedParts() {
  await requireSession();
  const db = getDb();
  return db
    .select({
      repairPartId: repairParts.id,
      ticketId: repairParts.ticketId,
      refurbishmentId: repairParts.refurbishmentId,
      ticketNumber: repairTickets.ticketNumber,
      flipNumber: refurbishments.flipNumber,
      quantity: repairParts.quantity,
      unitCostOre: repairParts.unitCostOre,
      notes: repairParts.notes,
      createdAt: repairParts.createdAt,
      partId: parts.id,
      partName: parts.name,
      partSku: parts.sku,
      quantityOnHand: parts.quantityOnHand,
    })
    .from(repairParts)
    .innerJoin(parts, eq(parts.id, repairParts.partId))
    .leftJoin(repairTickets, eq(repairTickets.id, repairParts.ticketId))
    .leftJoin(
      refurbishments,
      eq(refurbishments.id, repairParts.refurbishmentId),
    )
    .where(eq(repairParts.status, "ORDERED"))
    .orderBy(desc(repairParts.createdAt));
}

async function syncFlipPartsCost(
  // drizzle transaction client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  refurbishmentId: string,
) {
  const used = await tx
    .select()
    .from(repairParts)
    .where(
      and(
        eq(repairParts.refurbishmentId, refurbishmentId),
        eq(repairParts.status, "USED"),
      ),
    );

  // Replace PART cost lines that are inventory-linked with current used totals
  await tx
    .delete(refurbishmentCosts)
    .where(
      and(
        eq(refurbishmentCosts.refurbishmentId, refurbishmentId),
        eq(refurbishmentCosts.category, "PART"),
        isNotNull(refurbishmentCosts.partId),
      ),
    );

  for (const line of used) {
    const [part] = await tx
      .select({ name: parts.name })
      .from(parts)
      .where(eq(parts.id, line.partId))
      .limit(1);
    await tx.insert(refurbishmentCosts).values({
      refurbishmentId,
      category: "PART",
      label: part?.name ?? "Del",
      amountOre: line.quantity * line.unitCostOre,
      partId: line.partId,
    });
  }

  const [{ total }] = await tx
    .select({
      total: sql<number>`coalesce(sum(${refurbishmentCosts.amountOre}), 0)::int`,
    })
    .from(refurbishmentCosts)
    .where(
      and(
        eq(refurbishmentCosts.refurbishmentId, refurbishmentId),
        ne(refurbishmentCosts.category, "PURCHASE"),
      ),
    );

  await tx
    .update(refurbishments)
    .set({ actualRepairOre: total, updatedAt: new Date() })
    .where(eq(refurbishments.id, refurbishmentId));
}

/**
 * Receive an ordered part into stock and mark it USED on the job
 * (repair ticket or flip).
 */
export async function receiveOrderedPart(input: {
  repairPartId: string;
  unitCostOre?: number;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      repairPartId: z.string().uuid(),
      unitCostOre: z.number().int().min(0).optional(),
    })
    .parse(input);
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [line] = await tx
      .select({
        id: repairParts.id,
        ticketId: repairParts.ticketId,
        refurbishmentId: repairParts.refurbishmentId,
        partId: repairParts.partId,
        quantity: repairParts.quantity,
        unitCostOre: repairParts.unitCostOre,
        status: repairParts.status,
        partName: parts.name,
      })
      .from(repairParts)
      .innerJoin(parts, eq(parts.id, repairParts.partId))
      .where(eq(repairParts.id, data.repairPartId))
      .limit(1);

    if (!line) throw new Error("Bestilling ikke funnet");
    if (line.status !== "ORDERED") {
      throw new Error("Delen er ikke i bestilt-status");
    }

    const locked = await tx
      .select()
      .from(parts)
      .where(eq(parts.id, line.partId))
      .for("update");
    const part = locked[0];
    if (!part) throw new Error("Del ikke funnet i lager");

    const unitCost = data.unitCostOre ?? line.unitCostOre ?? part.costPriceOre;
    const afterReceive = part.quantityOnHand + line.quantity;

    await tx
      .update(parts)
      .set({
        quantityOnHand: afterReceive,
        costPriceOre: unitCost,
        updatedAt: new Date(),
      })
      .where(eq(parts.id, line.partId));

    await tx.insert(inventoryTransactions).values({
      partId: line.partId,
      action: "RECEIVED",
      quantityDelta: line.quantity,
      unitCostOre: unitCost,
      resultingQuantity: afterReceive,
      repairTicketId: line.ticketId,
      refurbishmentId: line.refurbishmentId,
      note: "Mottak av bestilt del",
      createdById: session.user.id,
    });

    const afterUse = afterReceive - line.quantity;
    await tx
      .update(parts)
      .set({ quantityOnHand: afterUse, updatedAt: new Date() })
      .where(eq(parts.id, line.partId));

    await tx.insert(inventoryTransactions).values({
      partId: line.partId,
      action: "USED",
      quantityDelta: -line.quantity,
      unitCostOre: unitCost,
      resultingQuantity: afterUse,
      repairTicketId: line.ticketId,
      refurbishmentId: line.refurbishmentId,
      note: "Tildelt jobb etter mottak",
      createdById: session.user.id,
    });

    await tx
      .update(repairParts)
      .set({
        status: "USED",
        unitCostOre: unitCost,
      })
      .where(eq(repairParts.id, line.id));

    if (line.ticketId) {
      const [{ total }] = await tx
        .select({
          total: sql<number>`coalesce(sum(${repairParts.quantity} * ${repairParts.unitCostOre}), 0)::int`,
        })
        .from(repairParts)
        .where(eq(repairParts.ticketId, line.ticketId));

      await tx
        .update(repairTickets)
        .set({ actualPartsCostOre: total, updatedAt: new Date() })
        .where(eq(repairTickets.id, line.ticketId));
    }

    if (line.refurbishmentId) {
      await syncFlipPartsCost(tx, line.refurbishmentId);
    }

    return line;
  });

  if (result.ticketId) {
    await addActivity({
      entityType: "repair_ticket",
      entityId: result.ticketId,
      type: "repair.part_received",
      message: `Mottatt bestilt del: ${result.quantity} × ${result.partName}`,
      actorId: session.user.id,
    });
    revalidatePath(`/repairs/${result.ticketId}`);
    revalidatePath("/repairs");
  }
  if (result.refurbishmentId) {
    await addActivity({
      entityType: "refurbishment",
      entityId: result.refurbishmentId,
      type: "flip.part_received",
      message: `Mottatt bestilt del: ${result.quantity} × ${result.partName}`,
      actorId: session.user.id,
    });
    revalidatePath(`/refurbishment/${result.refurbishmentId}`);
    revalidatePath("/refurbishment");
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/parts");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function listFlipParts(refurbishmentId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select({
      id: repairParts.id,
      quantity: repairParts.quantity,
      unitCostOre: repairParts.unitCostOre,
      status: repairParts.status,
      notes: repairParts.notes,
      partName: parts.name,
      partSku: parts.sku,
    })
    .from(repairParts)
    .leftJoin(parts, eq(parts.id, repairParts.partId))
    .where(eq(repairParts.refurbishmentId, refurbishmentId))
    .orderBy(desc(repairParts.createdAt));
}

export async function attachPartToFlip(input: {
  refurbishmentId: string;
  partId: string;
  quantity: number;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      refurbishmentId: z.string().uuid(),
      partId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
    .parse(input);

  const flip = await getFlip(data.refurbishmentId);
  if (!flip) throw new Error("Flip ikke funnet");

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(parts)
      .where(eq(parts.id, data.partId))
      .for("update");
    const part = locked[0];
    if (!part) throw new Error("Del ikke funnet");

    const resulting = part.quantityOnHand - data.quantity;
    if (resulting < 0) throw new Error("Ikke nok lagerbeholdning");

    await tx
      .update(parts)
      .set({ quantityOnHand: resulting, updatedAt: new Date() })
      .where(eq(parts.id, data.partId));

    await tx.insert(inventoryTransactions).values({
      partId: data.partId,
      action: "USED",
      quantityDelta: -data.quantity,
      unitCostOre: part.costPriceOre,
      resultingQuantity: resulting,
      refurbishmentId: data.refurbishmentId,
      createdById: session.user.id,
    });

    const [repairPart] = await tx
      .insert(repairParts)
      .values({
        refurbishmentId: data.refurbishmentId,
        partId: data.partId,
        quantity: data.quantity,
        unitCostOre: part.costPriceOre,
        status: "USED",
      })
      .returning();

    await syncFlipPartsCost(tx, data.refurbishmentId);
    return { part, repairPart };
  });

  await addActivity({
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    type: "flip.part_used",
    message: `Brukte ${data.quantity} × ${result.part.name}`,
    actorId: session.user.id,
  });

  revalidatePath("/inventory");
  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return result;
}

export async function orderPartForFlip(input: {
  refurbishmentId: string;
  name: string;
  details?: string | null;
  brand?: string | null;
  category?: string | null;
  partType?: z.infer<typeof partTypeSchema>;
  quantity?: number;
  estimatedCostOre?: number;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      refurbishmentId: z.string().uuid(),
      name: z.string().min(2, "Navn på del er påkrevd"),
      details: z.string().optional().nullable(),
      brand: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
      partType: partTypeSchema.default("OTHER"),
      quantity: z.number().int().positive().default(1),
      estimatedCostOre: z.number().int().min(0).default(0),
    })
    .parse(input);

  const flip = await getFlip(data.refurbishmentId);
  if (!flip) throw new Error("Flip ikke funnet");

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
        refurbishmentId: data.refurbishmentId,
        partId: part.id,
        quantity: data.quantity,
        unitCostOre: data.estimatedCostOre,
        status: "ORDERED",
        notes,
      })
      .returning();

    await tx
      .update(refurbishments)
      .set({ status: "WAITING_FOR_PARTS", updatedAt: new Date() })
      .where(
        and(
          eq(refurbishments.id, data.refurbishmentId),
          ne(refurbishments.status, "SOLD"),
          ne(refurbishments.status, "ARCHIVED"),
        ),
      );

    return { part, repairPart };
  });

  await addActivity({
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    type: "flip.part_ordered",
    message: `Bestilt del: ${data.quantity} × ${data.name.trim()}`,
    actorId: session.user.id,
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/parts");
  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return result;
}

export async function removePartFromFlip(input: {
  refurbishmentId: string;
  repairPartId: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      refurbishmentId: z.string().uuid(),
      repairPartId: z.string().uuid(),
    })
    .parse(input);

  const flip = await getFlip(data.refurbishmentId);
  if (!flip) throw new Error("Flip ikke funnet");

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [line] = await tx
      .select({
        id: repairParts.id,
        partId: repairParts.partId,
        quantity: repairParts.quantity,
        unitCostOre: repairParts.unitCostOre,
        status: repairParts.status,
        partName: parts.name,
      })
      .from(repairParts)
      .leftJoin(parts, eq(parts.id, repairParts.partId))
      .where(
        and(
          eq(repairParts.id, data.repairPartId),
          eq(repairParts.refurbishmentId, data.refurbishmentId),
        ),
      )
      .limit(1);
    if (!line) throw new Error("Del ikke funnet på flip");

    if (line.status === "USED") {
      const locked = await tx
        .select()
        .from(parts)
        .where(eq(parts.id, line.partId))
        .for("update");
      const part = locked[0];
      if (!part) throw new Error("Del ikke funnet i lager");

      const resulting = part.quantityOnHand + line.quantity;
      await tx
        .update(parts)
        .set({ quantityOnHand: resulting, updatedAt: new Date() })
        .where(eq(parts.id, line.partId));

      await tx.insert(inventoryTransactions).values({
        partId: line.partId,
        action: "RETURNED",
        quantityDelta: line.quantity,
        unitCostOre: line.unitCostOre,
        resultingQuantity: resulting,
        refurbishmentId: data.refurbishmentId,
        createdById: session.user.id,
      });
    }

    await tx.delete(repairParts).where(eq(repairParts.id, line.id));
    await syncFlipPartsCost(tx, data.refurbishmentId);
    return line;
  });

  await addActivity({
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    type: "flip.part_removed",
    message: `Fjernet del: ${result.quantity} × ${result.partName ?? "ukjent"}`,
    actorId: session.user.id,
  });

  revalidatePath("/inventory");
  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return { ok: true };
}


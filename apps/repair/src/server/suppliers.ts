"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supplierParts, suppliers } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const supplierInputSchema = z.object({
  name: z.string().min(1),
  website: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  currency: z.string().default("NOK"),
  defaultShippingOre: z.number().int().min(0).default(0),
  apiSupported: z.boolean().default(false),
  active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

const supplierPartSchema = z.object({
  supplierId: z.string().uuid(),
  partId: z.string().uuid().optional().nullable(),
  supplierSku: z.string().optional().nullable(),
  productUrl: z.string().optional().nullable(),
  publicPriceOre: z.number().int().min(0).optional().nullable(),
  proPriceOre: z.number().int().min(0).optional().nullable(),
  currency: z.string().default("NOK"),
  shippingCostOre: z.number().int().min(0).optional().nullable(),
  priceSource: z.enum(["MANUAL", "CSV", "OFFICIAL_API", "UNVERIFIED"]).default("MANUAL"),
  active: z.boolean().default(true),
});

export async function listSuppliers(includeInactive = false) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(suppliers)
    .where(includeInactive ? undefined : eq(suppliers.active, true))
    .orderBy(desc(suppliers.createdAt));
}

export async function createSupplier(input: z.infer<typeof supplierInputSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = supplierInputSchema.parse(input);
  const db = getDb();

  const [row] = await db
    .insert(suppliers)
    .values({
      name: data.name,
      website: data.website || null,
      contact: data.contact || null,
      currency: data.currency,
      defaultShippingOre: data.defaultShippingOre,
      apiSupported: data.apiSupported,
      active: data.active,
      notes: data.notes || null,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "supplier",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/inventory/suppliers");
  return row;
}

export async function updateSupplier(
  id: string,
  input: Partial<z.infer<typeof supplierInputSchema>>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = supplierInputSchema.partial().parse(input);
  const db = getDb();

  const [before] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1);
  if (!before) throw new Error("Leverandør ikke funnet");

  const [row] = await db
    .update(suppliers)
    .set({
      ...data,
      website: data.website === undefined ? undefined : data.website || null,
      contact: data.contact === undefined ? undefined : data.contact || null,
      notes: data.notes === undefined ? undefined : data.notes || null,
    })
    .where(eq(suppliers.id, id))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "supplier",
    entityId: id,
    action: "update",
    before,
    after: row,
  });

  revalidatePath("/inventory/suppliers");
  return row;
}

export async function upsertSupplierPart(input: z.infer<typeof supplierPartSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = supplierPartSchema.parse(input);
  const db = getDb();

  const existing = data.partId
    ? await db
        .select()
        .from(supplierParts)
        .where(
          and(
            eq(supplierParts.supplierId, data.supplierId),
            eq(supplierParts.partId, data.partId),
          ),
        )
        .limit(1)
    : [];

  if (existing[0]) {
    const [row] = await db
      .update(supplierParts)
      .set({
        supplierSku: data.supplierSku || null,
        productUrl: data.productUrl || null,
        publicPriceOre: data.publicPriceOre ?? null,
        proPriceOre: data.proPriceOre ?? null,
        currency: data.currency,
        shippingCostOre: data.shippingCostOre ?? null,
        priceSource: data.priceSource,
        lastVerifiedAt: new Date(),
        active: data.active,
      })
      .where(eq(supplierParts.id, existing[0].id))
      .returning();
    revalidatePath("/inventory/suppliers");
    return row;
  }

  const [row] = await db
    .insert(supplierParts)
    .values({
      supplierId: data.supplierId,
      partId: data.partId || null,
      supplierSku: data.supplierSku || null,
      productUrl: data.productUrl || null,
      publicPriceOre: data.publicPriceOre ?? null,
      proPriceOre: data.proPriceOre ?? null,
      currency: data.currency,
      shippingCostOre: data.shippingCostOre ?? null,
      priceSource: data.priceSource,
      lastVerifiedAt: new Date(),
      active: data.active,
    })
    .returning();

  revalidatePath("/inventory/suppliers");
  return row;
}

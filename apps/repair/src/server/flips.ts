"use server";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  flipCandidates,
  refurbishmentAcquisitions,
  refurbishmentCosts,
  refurbishments,
  resaleListings,
  resales,
} from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { dealRisk, roiBps } from "@/lib/money";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { nextPublicId } from "@/lib/sequences";
import { requireSession } from "@/lib/session";

const candidateSchema = z.object({
  listingUrl: z.string().optional().nullable(),
  platform: z.string().default("FINN"),
  seller: z.string().optional().nullable(),
  listingId: z.string().optional().nullable(),
  model: z.string().min(1),
  storage: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  askingPriceOre: z.number().int().min(0),
  shippingOre: z.number().int().min(0).default(0),
  reportedFault: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  estimatedRepairOre: z.number().int().min(0).default(0),
  estimatedResaleOre: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const flipStatusSchema = z.enum([
  "SEARCHING",
  "CANDIDATE",
  "PURCHASED",
  "RECEIVED",
  "DIAGNOSTICS",
  "WAITING_FOR_PARTS",
  "IN_REPAIR",
  "TESTING",
  "READY_TO_LIST",
  "LISTED",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
]);

function computeCandidateEconomics(data: {
  askingPriceOre: number;
  shippingOre: number;
  estimatedRepairOre: number;
  estimatedResaleOre: number;
}) {
  const estimatedInvestmentOre =
    data.askingPriceOre + data.shippingOre + data.estimatedRepairOre;
  const estimatedProfitOre = data.estimatedResaleOre - estimatedInvestmentOre;
  const estimatedRoiBps = roiBps(estimatedProfitOre, estimatedInvestmentOre);
  const risk = dealRisk(estimatedProfitOre, estimatedRoiBps);
  return { estimatedInvestmentOre, estimatedProfitOre, estimatedRoiBps, risk };
}

export async function listCandidates() {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(flipCandidates)
    .where(sql`${flipCandidates.convertedRefurbishmentId} is null`)
    .orderBy(desc(flipCandidates.createdAt));
}

export async function createCandidate(input: z.infer<typeof candidateSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = candidateSchema.parse(input);
  const economics = computeCandidateEconomics(data);
  const db = getDb();

  const [row] = await db
    .insert(flipCandidates)
    .values({
      listingUrl: data.listingUrl || null,
      platform: data.platform,
      seller: data.seller || null,
      listingId: data.listingId || null,
      model: data.model,
      storage: data.storage || null,
      color: data.color || null,
      askingPriceOre: data.askingPriceOre,
      shippingOre: data.shippingOre,
      reportedFault: data.reportedFault || null,
      condition: data.condition || null,
      estimatedRepairOre: data.estimatedRepairOre,
      estimatedResaleOre: data.estimatedResaleOre,
      ...economics,
      notes: data.notes || null,
      createdById: session.user.id,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "flip_candidate",
    entityId: row.id,
    action: "create",
    after: row,
  });

  revalidatePath("/refurbishment/candidates");
  return row;
}

export async function convertCandidateToFlip(
  candidateId: string,
  opts?: { actualPurchaseOre?: number },
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const [candidate] = await db
    .select()
    .from(flipCandidates)
    .where(eq(flipCandidates.id, candidateId))
    .limit(1);
  if (!candidate) throw new Error("Kandidat ikke funnet");
  if (candidate.convertedRefurbishmentId) {
    throw new Error("Kandidat er allerede konvertert");
  }

  const flipNumber = await nextPublicId("FLIP");
  const purchaseOre = opts?.actualPurchaseOre ?? candidate.askingPriceOre;
  const now = new Date();

  const [flip] = await db
    .insert(refurbishments)
    .values({
      flipNumber,
      candidateId: candidate.id,
      status: "PURCHASED",
      model: candidate.model,
      storage: candidate.storage,
      color: candidate.color,
      estimatedPurchaseOre: candidate.askingPriceOre,
      actualPurchaseOre: purchaseOre,
      estimatedRepairOre: candidate.estimatedRepairOre,
      estimatedSaleOre: candidate.estimatedResaleOre,
      estimatedProfitOre: candidate.estimatedProfitOre,
      estimatedRoiBps: candidate.estimatedRoiBps,
      notes: candidate.notes,
      createdById: session.user.id,
      purchasedAt: now,
    })
    .returning();

  await db.insert(refurbishmentAcquisitions).values({
    refurbishmentId: flip.id,
    purchasePriceOre: purchaseOre,
    shippingOre: candidate.shippingOre,
    platform: candidate.platform,
    seller: candidate.seller,
    listingUrl: candidate.listingUrl,
    originalDescription: candidate.reportedFault,
    purchasedAt: now,
  });

  await db.insert(refurbishmentCosts).values({
    refurbishmentId: flip.id,
    category: "PURCHASE",
    label: "Kjøpspris",
    amountOre: purchaseOre,
  });

  if (candidate.shippingOre > 0) {
    await db.insert(refurbishmentCosts).values({
      refurbishmentId: flip.id,
      category: "SHIPPING",
      label: "Frakt ved kjøp",
      amountOre: candidate.shippingOre,
    });
  }

  await db
    .update(flipCandidates)
    .set({ convertedRefurbishmentId: flip.id })
    .where(eq(flipCandidates.id, candidateId));

  await addActivity({
    entityType: "refurbishment",
    entityId: flip.id,
    type: "flip.created",
    message: `Flip ${flipNumber} opprettet fra kandidat`,
    actorId: session.user.id,
  });

  revalidatePath("/refurbishment");
  revalidatePath("/refurbishment/candidates");
  revalidatePath("/refurbishment/active");
  return flip;
}

export async function listFlips(status?: z.infer<typeof flipStatusSchema>) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(refurbishments)
    .where(status ? eq(refurbishments.status, status) : undefined)
    .orderBy(desc(refurbishments.createdAt));
}

export async function getFlip(id: string) {
  await requireSession();
  const db = getDb();
  const [flip] = await db
    .select()
    .from(refurbishments)
    .where(eq(refurbishments.id, id))
    .limit(1);
  if (!flip) return null;

  const costs = await db
    .select()
    .from(refurbishmentCosts)
    .where(eq(refurbishmentCosts.refurbishmentId, id));
  const listings = await db
    .select()
    .from(resaleListings)
    .where(eq(resaleListings.refurbishmentId, id));
  const sales = await db
    .select()
    .from(resales)
    .where(eq(resales.refurbishmentId, id));

  return { flip, costs, listings, sales };
}

const updateFlipDeviceSchema = z.object({
  refurbishmentId: z.string().uuid(),
  model: z.string().min(1).optional(),
  storage: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  imei: z.string().optional().nullable(),
  batteryHealth: z.number().int().min(0).max(100).optional().nullable(),
  activationLockClear: z.boolean().optional(),
  findMyOff: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function updateFlipDevice(
  input: z.infer<typeof updateFlipDeviceSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = updateFlipDeviceSchema.parse(input);
  const db = getDb();

  const before = await getFlip(data.refurbishmentId);
  if (!before) throw new Error("Flip ikke funnet");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.model !== undefined) patch.model = data.model.trim();
  if (data.storage !== undefined) patch.storage = data.storage?.trim() || null;
  if (data.color !== undefined) patch.color = data.color?.trim() || null;
  if (data.serialNumber !== undefined) {
    patch.serialNumber = data.serialNumber?.trim() || null;
  }
  if (data.imei !== undefined) {
    const digits = (data.imei ?? "").replace(/\D/g, "");
    patch.imei = digits || null;
  }
  if (data.batteryHealth !== undefined) patch.batteryHealth = data.batteryHealth;
  if (data.activationLockClear !== undefined) {
    patch.activationLockClear = data.activationLockClear;
  }
  if (data.findMyOff !== undefined) patch.findMyOff = data.findMyOff;
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;

  const [row] = await db
    .update(refurbishments)
    .set(patch)
    .where(eq(refurbishments.id, data.refurbishmentId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    action: "device_update",
    before: before.flip,
    after: row,
  });

  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return row;
}

const updateFlipConditionSchema = z.object({
  refurbishmentId: z.string().uuid(),
  conditionGrade: z.string().min(1),
  cosmeticFaultKeys: z.array(z.string()).default([]),
  repairFaultKeys: z.array(z.string()).default([]),
  conditionComment: z.string().optional().nullable(),
  faultComment: z.string().optional().nullable(),
});

export async function updateFlipConditionFaults(
  input: z.infer<typeof updateFlipConditionSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = updateFlipConditionSchema.parse(input);
  const db = getDb();

  const before = await getFlip(data.refurbishmentId);
  if (!before) throw new Error("Flip ikke funnet");

  const {
    formatConditionSummary,
    formatProblemSummary,
    CONDITION_GRADES,
    COSMETIC_FAULTS,
    REPAIR_FAULTS,
  } = await import("@/lib/intake-options");

  const gradeOk = CONDITION_GRADES.some((g) => g.key === data.conditionGrade);
  if (!gradeOk) throw new Error("Ugyldig tilstandskarakter");

  const cosmeticKeys = new Set(COSMETIC_FAULTS.map((f) => f.key));
  const repairKeys = new Set(REPAIR_FAULTS.map((f) => f.key));
  const cosmeticFaultKeys = data.cosmeticFaultKeys.filter((k) =>
    cosmeticKeys.has(k),
  );
  const repairFaultKeys = data.repairFaultKeys.filter((k) => repairKeys.has(k));

  const conditionSummary = formatConditionSummary(
    data.conditionGrade,
    cosmeticFaultKeys,
    data.conditionComment,
  );
  const faultSummary = formatProblemSummary(
    repairFaultKeys,
    data.faultComment,
  );

  const [row] = await db
    .update(refurbishments)
    .set({
      conditionGrade: data.conditionGrade,
      cosmeticFaultKeys,
      repairFaultKeys,
      conditionComment: data.conditionComment?.trim() || null,
      faultComment: data.faultComment?.trim() || null,
      conditionSummary,
      faultSummary,
      updatedAt: new Date(),
    })
    .where(eq(refurbishments.id, data.refurbishmentId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    action: "condition_faults_update",
    before: before.flip,
    after: row,
  });

  await addActivity({
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    type: "flip.condition_updated",
    message: "Tilstand og feil oppdatert",
    actorId: session.user.id,
  });

  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return row;
}

export async function updateFlipStatus(
  id: string,
  status: z.infer<typeof flipStatusSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const next = flipStatusSchema.parse(status);
  const db = getDb();

  const before = await getFlip(id);
  if (!before) throw new Error("Flip ikke funnet");

  const patch: Record<string, unknown> = {
    status: next,
    updatedAt: new Date(),
  };
  if (next === "RECEIVED") patch.receivedAt = new Date();
  if (next === "SOLD") patch.soldAt = new Date();
  if (next === "ARCHIVED") patch.archivedAt = new Date();

  const [row] = await db
    .update(refurbishments)
    .set(patch)
    .where(eq(refurbishments.id, id))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "refurbishment",
    entityId: id,
    action: "status_change",
    before: before.flip,
    after: row,
  });

  revalidatePath("/refurbishment");
  return row;
}

const costCategorySchema = z.enum([
  "PURCHASE",
  "SHIPPING",
  "PART",
  "CONSUMABLE",
  "TOOL",
  "PLATFORM_FEE",
  "OTHER",
]);

export async function addFlipCost(input: {
  refurbishmentId: string;
  category: z.infer<typeof costCategorySchema>;
  label: string;
  amountOre: number;
  partId?: string | null;
  isBusinessAsset?: boolean;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      refurbishmentId: z.string().uuid(),
      category: costCategorySchema,
      label: z.string().min(1),
      amountOre: z.number().int(),
      partId: z.string().uuid().optional().nullable(),
      isBusinessAsset: z.boolean().default(false),
    })
    .parse(input);
  const db = getDb();

  const [row] = await db
    .insert(refurbishmentCosts)
    .values({
      refurbishmentId: data.refurbishmentId,
      category: data.category,
      label: data.label,
      amountOre: data.amountOre,
      partId: data.partId || null,
      isBusinessAsset: data.isBusinessAsset,
    })
    .returning();

  const [{ total }] = await db
    .select({
      total: sql<number>`coalesce(sum(${refurbishmentCosts.amountOre}), 0)::int`,
    })
    .from(refurbishmentCosts)
    .where(
      and(
        eq(refurbishmentCosts.refurbishmentId, data.refurbishmentId),
        ne(refurbishmentCosts.category, "PURCHASE"),
      ),
    );

  await db
    .update(refurbishments)
    .set({ actualRepairOre: total, updatedAt: new Date() })
    .where(eq(refurbishments.id, data.refurbishmentId));

  revalidatePath("/refurbishment");
  return row;
}

export async function removeFlipCost(input: {
  costId: string;
  refurbishmentId: string;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      costId: z.string().uuid(),
      refurbishmentId: z.string().uuid(),
    })
    .parse(input);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(refurbishmentCosts)
    .where(
      and(
        eq(refurbishmentCosts.id, data.costId),
        eq(refurbishmentCosts.refurbishmentId, data.refurbishmentId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Kostnad ikke funnet");
  if (existing.category === "PURCHASE") {
    throw new Error("Kan ikke fjerne kjøpspris her");
  }

  await db
    .delete(refurbishmentCosts)
    .where(eq(refurbishmentCosts.id, data.costId));

  const [{ total }] = await db
    .select({
      total: sql<number>`coalesce(sum(${refurbishmentCosts.amountOre}), 0)::int`,
    })
    .from(refurbishmentCosts)
    .where(
      and(
        eq(refurbishmentCosts.refurbishmentId, data.refurbishmentId),
        ne(refurbishmentCosts.category, "PURCHASE"),
      ),
    );

  await db
    .update(refurbishments)
    .set({ actualRepairOre: total, updatedAt: new Date() })
    .where(eq(refurbishments.id, data.refurbishmentId));

  revalidatePath("/refurbishment");
  revalidatePath(`/refurbishment/${data.refurbishmentId}`);
  return { ok: true };
}

export async function createListing(input: {
  refurbishmentId: string;
  title: string;
  salePriceOre: number;
  platform?: string;
  description?: string | null;
  minimumPriceOre?: number | null;
  condition?: string | null;
  batteryHealth?: number | null;
  listingUrl?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      refurbishmentId: z.string().uuid(),
      title: z.string().min(1),
      salePriceOre: z.number().int().min(0),
      platform: z.string().default("FINN"),
      description: z.string().optional().nullable(),
      minimumPriceOre: z.number().int().min(0).optional().nullable(),
      condition: z.string().optional().nullable(),
      batteryHealth: z.number().int().min(0).max(100).optional().nullable(),
      listingUrl: z.string().optional().nullable(),
    })
    .parse(input);
  const db = getDb();

  const [row] = await db
    .insert(resaleListings)
    .values({
      refurbishmentId: data.refurbishmentId,
      title: data.title,
      salePriceOre: data.salePriceOre,
      platform: data.platform,
      description: data.description || null,
      minimumPriceOre: data.minimumPriceOre ?? null,
      condition: data.condition || null,
      batteryHealth: data.batteryHealth ?? null,
      listingUrl: data.listingUrl || null,
      status: "LISTED",
    })
    .returning();

  await db
    .update(refurbishments)
    .set({ status: "LISTED", updatedAt: new Date() })
    .where(eq(refurbishments.id, data.refurbishmentId));

  revalidatePath("/refurbishment/listed");
  return row;
}

export async function recordSale(input: {
  refurbishmentId: string;
  salePriceOre: number;
  listingId?: string | null;
  platform?: string | null;
  buyerName?: string | null;
  shippingOre?: number;
  platformFeesOre?: number;
  otherFeesOre?: number;
  soldAt?: Date;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      refurbishmentId: z.string().uuid(),
      salePriceOre: z.number().int().min(0),
      listingId: z.string().uuid().optional().nullable(),
      platform: z.string().optional().nullable(),
      buyerName: z.string().optional().nullable(),
      shippingOre: z.number().int().min(0).default(0),
      platformFeesOre: z.number().int().min(0).default(0),
      otherFeesOre: z.number().int().min(0).default(0),
      soldAt: z.coerce.date().optional(),
    })
    .parse(input);
  const db = getDb();

  const detail = await getFlip(data.refurbishmentId);
  if (!detail) throw new Error("Flip ikke funnet");

  const soldAt = data.soldAt ?? new Date();
  const [sale] = await db
    .insert(resales)
    .values({
      refurbishmentId: data.refurbishmentId,
      listingId: data.listingId || null,
      salePriceOre: data.salePriceOre,
      platform: data.platform || null,
      buyerName: data.buyerName || null,
      shippingOre: data.shippingOre,
      platformFeesOre: data.platformFeesOre,
      otherFeesOre: data.otherFeesOre,
      soldAt,
    })
    .returning();

  const costTotal = detail.costs.reduce((s, c) => s + c.amountOre, 0);
  const net =
    data.salePriceOre -
    data.shippingOre -
    data.platformFeesOre -
    data.otherFeesOre;
  const profit = net - costTotal;
  const investment = costTotal;
  const actualRoi = roiBps(profit, investment);

  await db
    .update(refurbishments)
    .set({
      status: "SOLD",
      actualSaleOre: data.salePriceOre,
      actualProfitOre: profit,
      actualRoiBps: actualRoi,
      soldAt,
      updatedAt: new Date(),
    })
    .where(eq(refurbishments.id, data.refurbishmentId));

  if (data.listingId) {
    await db
      .update(resaleListings)
      .set({ status: "SOLD", updatedAt: new Date() })
      .where(eq(resaleListings.id, data.listingId));
  }

  await addActivity({
    entityType: "refurbishment",
    entityId: data.refurbishmentId,
    type: "flip.sold",
    message: `Solgt for ${data.salePriceOre} øre`,
    actorId: session.user.id,
  });

  revalidatePath("/refurbishment");
  revalidatePath("/refurbishment/sold");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return sale;
}

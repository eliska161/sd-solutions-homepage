"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { customers, repairTickets, warranties, warrantyClaims } from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { formatNokFromOre } from "@/lib/money";
import { renderWarrantySlipPdf } from "@/lib/pdf/customer-document";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { storeCustomerPdf } from "@/lib/store-customer-pdf";
import { loadTicketCharge } from "@/lib/ticket-totals";
import {
  markTicketRefunded,
  refundStripeForTicket,
} from "@/server/payments";
import { getCustomer } from "@/server/customers";
import { getDevice } from "@/server/devices";
import { getRepair, updateRepairStatus } from "@/server/repairs";

const claimStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "APPROVED",
  "REJECTED",
  "RESOLVED",
  "CLOSED",
]);

export async function createWarrantyForRepair(
  ticketId: string,
  opts?: { days?: number; notes?: string },
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const db = getDb();

  const ticket = await getRepair(ticketId);
  if (!ticket) throw new Error("Reparasjon ikke funnet");

  const days = opts?.days ?? ticket.warrantyDays ?? 90;
  const startsAt = ticket.completedAt ?? new Date();
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + days);

  const [row] = await db
    .insert(warranties)
    .values({
      ticketId,
      startsAt,
      endsAt,
      days,
      notes: opts?.notes || null,
    })
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "warranty",
    entityId: row.id,
    action: "create",
    after: row,
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: ticketId,
    type: "warranty.created",
    message: `Garanti ${days} dager opprettet`,
    actorId: session.user.id,
  });

  revalidatePath("/warranty");
  revalidatePath(`/repairs/${ticketId}`);
  return row;
}

export async function listClaims(status?: z.infer<typeof claimStatusSchema>) {
  await requireSession();
  const db = getDb();
  return db
    .select({
      id: warrantyClaims.id,
      description: warrantyClaims.description,
      status: warrantyClaims.status,
      resolution: warrantyClaims.resolution,
      resolutionKind: warrantyClaims.resolutionKind,
      refundOre: warrantyClaims.refundOre,
      createdAt: warrantyClaims.createdAt,
      ticketId: warrantyClaims.ticketId,
      ticketNumber: repairTickets.ticketNumber,
      customerName: customers.name,
    })
    .from(warrantyClaims)
    .leftJoin(repairTickets, eq(repairTickets.id, warrantyClaims.ticketId))
    .leftJoin(customers, eq(customers.id, repairTickets.customerId))
    .where(status ? eq(warrantyClaims.status, status) : undefined)
    .orderBy(desc(warrantyClaims.createdAt));
}

export async function getWarrantyForTicket(ticketId: string) {
  await requireSession();
  const db = getDb();
  const [row] = await db
    .select()
    .from(warranties)
    .where(eq(warranties.ticketId, ticketId))
    .limit(1);
  return row ?? null;
}

export async function createClaim(input: {
  warrantyId: string;
  description: string;
  ticketId?: string | null;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = z
    .object({
      warrantyId: z.string().uuid(),
      description: z.string().min(1),
      ticketId: z.string().uuid().optional().nullable(),
    })
    .parse(input);
  const db = getDb();

  const [warranty] = await db
    .select()
    .from(warranties)
    .where(eq(warranties.id, data.warrantyId))
    .limit(1);
  if (!warranty) throw new Error("Garanti ikke funnet");

  const [row] = await db
    .insert(warrantyClaims)
    .values({
      warrantyId: data.warrantyId,
      ticketId: data.ticketId || warranty.ticketId,
      description: data.description,
      status: "OPEN",
      createdById: session.user.id,
    })
    .returning();

  await addActivity({
    entityType: "warranty_claim",
    entityId: row.id,
    type: "warranty.claim_created",
    message: "Garantikrav opprettet",
    actorId: session.user.id,
  });

  revalidatePath("/warranty");
  return row;
}

export async function updateClaimStatus(
  claimId: string,
  status: z.infer<typeof claimStatusSchema>,
  resolution?: string,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const next = claimStatusSchema.parse(status);
  const db = getDb();

  const [before] = await db
    .select()
    .from(warrantyClaims)
    .where(eq(warrantyClaims.id, claimId))
    .limit(1);
  if (!before) throw new Error("Krav ikke funnet");

  const [row] = await db
    .update(warrantyClaims)
    .set({
      status: next,
      resolution: resolution ?? before.resolution,
      updatedAt: new Date(),
    })
    .where(eq(warrantyClaims.id, claimId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "warranty_claim",
    entityId: claimId,
    action: "status_change",
    before,
    after: row,
  });

  revalidatePath("/warranty");
  return row;
}

export async function listClaimsForTicket(ticketId: string) {
  await requireSession();
  const db = getDb();
  return db
    .select()
    .from(warrantyClaims)
    .where(eq(warrantyClaims.ticketId, ticketId))
    .orderBy(desc(warrantyClaims.createdAt));
}

export async function getLatestWarrantyClaim(ticketId: string) {
  const rows = await listClaimsForTicket(ticketId);
  return rows[0] ?? null;
}

const completeSchema = z.object({
  ticketId: z.string().uuid(),
  description: z.string().min(1, "Beskriv kravet"),
  outcome: z.enum(["repair", "refund", "reject"]),
  refundOre: z.number().int().min(0).optional(),
  signerName: z.string().optional(),
  signedOnPaper: z.boolean().optional(),
});

export async function completeWarrantyCase(input: {
  ticketId: string;
  description: string;
  outcome: "repair" | "refund" | "reject";
  refundOre?: number;
  signerName?: string;
  signedOnPaper?: boolean;
}) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = completeSchema.parse(input);
  const ticket = await getRepair(data.ticketId);
  if (!ticket) return { ok: false as const, error: "Saken ble ikke funnet" };

  let warranty = await getWarrantyForTicket(data.ticketId);
  if (!warranty) {
    warranty = await createWarrantyForRepair(data.ticketId);
  }

  const [charge, customer, device] = await Promise.all([
    loadTicketCharge(data.ticketId),
    getCustomer(ticket.customerId),
    getDevice(ticket.deviceId),
  ]);
  const cap = Math.max(charge.totalOre, 0);
  const refundOre =
    data.outcome === "refund"
      ? Math.min(Math.max(0, data.refundOre ?? cap), cap || data.refundOre || 0)
      : 0;
  if (data.outcome === "refund" && refundOre <= 0) {
    return { ok: false as const, error: "Oppgi et refusjonsbeløp" };
  }

  const needsSign = data.outcome !== "reject";
  const signerName = (data.signerName || customer?.name || "").trim();
  if (needsSign && (!data.signedOnPaper || signerName.length < 2)) {
    return { ok: false as const, error: "Skriv ut butikkeksemplaret og la kunden signere med penn" };
  }

  let stripeRefundId: string | null = null;
  let stripeRefundError: string | undefined;
  if (data.outcome === "refund") {
    const refund = await refundStripeForTicket({
      ticketId: data.ticketId,
      paymentIntentId: ticket.stripePaymentIntentId,
      amountOre: refundOre,
    });
    stripeRefundId = refund.refundId;
    stripeRefundError = refund.error;
    await markTicketRefunded({
      ticketId: data.ticketId,
      refundOre,
      refundId: stripeRefundId,
      full: cap > 0 && refundOre >= cap,
    });
  }

  const kind =
    data.outcome === "repair" ? "REPAIR" : data.outcome === "refund" ? "REFUND" : "REJECT";
  const status =
    data.outcome === "reject" ? "REJECTED" : data.outcome === "repair" ? "APPROVED" : "RESOLVED";
  const outcomeLabel =
    data.outcome === "repair"
      ? "Garantiarbeid uten kostnad"
      : data.outcome === "refund"
        ? `Tilbakebetaling ${formatNokFromOre(refundOre)}`
        : "Krav avvist";

  const db = getDb();
  const [row] = await db
    .insert(warrantyClaims)
    .values({
      warrantyId: warranty.id,
      ticketId: data.ticketId,
      description: data.description.trim(),
      status,
      resolution: outcomeLabel,
      resolutionKind: kind,
      refundOre,
      signerName: signerName || null,
      signedAt: needsSign ? new Date() : null,
      signaturePath: null,
      stripeRefundId,
      createdById: session.user.id,
    })
    .returning();

  await addActivity({
    entityType: "repair_ticket",
    entityId: data.ticketId,
    type: "warranty.case",
    message: `Garantisak: ${outcomeLabel}`,
    actorId: session.user.id,
    meta: { claimId: row.id, outcome: data.outcome, refundOre },
  });

  if (
    data.outcome === "repair" &&
    (ticket.status === "COMPLETED" || ticket.status === "READY_FOR_PICKUP")
  ) {
    await updateRepairStatus(data.ticketId, "IN_REPAIR", {
      note: "Garantisak — jobben tas inn på nytt",
    });
  }

  const deviceLabel = [device?.brand, device?.model, device?.storage, device?.color]
    .filter(Boolean)
    .join(" ");
  const pdf = await renderWarrantySlipPdf({
    ticketNumber: ticket.ticketNumber,
    customerName: customer?.name || signerName || "Kunde",
    deviceLabel,
    issuedAt: new Date(),
    outcomeLabel,
    description: data.description.trim(),
    refundLabel: data.outcome === "refund" ? formatNokFromOre(refundOre) : null,
    originalTotalLabel: formatNokFromOre(charge.totalOre),
    signerName: signerName || "—",
    signaturePng: null,
  });
  await storeCustomerPdf({
    ticketId: data.ticketId,
    category: "WARRANTY",
    fileName: `garanti-${ticket.ticketNumber}.pdf`,
    description: "Garantibevis",
    buffer: pdf,
  });

  revalidatePath("/warranty");
  revalidatePath(`/repairs/${data.ticketId}`);
  revalidatePath(`/repairs/${data.ticketId}/garanti`);
  return {
    ok: true as const,
    claimId: row.id,
    outcome: data.outcome,
    stripeRefundError,
  };
}

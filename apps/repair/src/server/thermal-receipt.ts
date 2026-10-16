import bwipjs from "bwip-js/node";
import {
  DELIVERY_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
  formatDate,
} from "@/lib/labels";
import { publicStatusUrl } from "@/lib/mail";
import { formatNokFromOre, vatFromGrossOre } from "@/lib/money";
import { allocatePublicShortCode } from "@/lib/public-link";
import { VAT_NOT_COLLECTED } from "@/lib/vat";
import type { WorkshopReceiptInput } from "@/lib/thermal/types";
import { getDb } from "@/lib/db";
import { repairTickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCustomer } from "@/server/customers";
import { getDevice } from "@/server/devices";
import { EMPTY_STRIPE_SLIP, stripePaymentSlip } from "@/server/payments";
import {
  getRepair,
  getRepairAssigneeName,
  listRepairNotes,
} from "@/server/repairs";
import { getSetting, isCustomerVatCharged } from "@/server/settings";
import { loadTicketCharge } from "@/lib/ticket-totals";
import { getLatestWarrantyClaim, getWarrantyForTicket } from "@/server/warranty";

type CompanyInfo = {
  orgNumber?: string;
};

async function statusQr(url: string) {
  const png = await bwipjs.toBuffer({
    bcid: "qrcode",
    text: url,
    scale: 3,
    includetext: false,
  });
  return `data:image/png;base64,${png.toString("base64")}`;
}

export type WarrantyThermalDraft = {
  copy: "store" | "customer";
  outcome: "repair" | "refund" | "reject";
  description: string;
  refundOre?: number;
  signerName?: string | null;
};

function warrantySlip(
  shared: WorkshopReceiptInput,
  opts: {
    copy: "store" | "customer";
    outcome: "repair" | "refund" | "reject";
    description: string;
    refundOre: number;
    signerName?: string | null;
  },
): WorkshopReceiptInput {
  const refund = opts.outcome === "refund" && opts.refundOre > 0;
  const kindLabel =
    opts.outcome === "refund"
      ? "Tilbakebetaling"
      : opts.outcome === "reject"
        ? "Avvist"
        : "Garantiarbeid";
  const store = opts.copy === "store";
  const needsSign = opts.outcome !== "reject";
  return {
    ...shared,
    kind: "warranty",
    heading: refund ? "KREDITNOTA" : "GARANTIKVITTERING",
    copyLabel: store ? "BUTIKKENS EKSEMPLAR" : "KUNDEEKSEMPLAR",
    paymentLabel: kindLabel,
    paymentDetail: opts.description,
    problem: opts.description,
    lines: refund
      ? [
          {
            name: kindLabel,
            amountLabel: `−${formatNokFromOre(opts.refundOre)}`,
          },
        ]
      : [
          {
            name: kindLabel,
            amountLabel: formatNokFromOre(0),
          },
        ],
    netLabel: null,
    vatLabel: null,
    totalLabel: refund ? `−${formatNokFromOre(opts.refundOre)}` : formatNokFromOre(0),
    thanks: store
      ? needsSign
        ? "Signer med penn i feltet."
        : "Ta vare på denne kvitteringen."
      : refund
        ? "Beløpet tilbakebetales. Ta vare på denne kvitteringen."
        : "Garantiarbeid. Ta vare på denne kvitteringen.",
    signerName: opts.signerName || shared.customerName,
    signaturePng: null,
    signatureBox: store && needsSign,
    statusQr: store ? null : shared.statusQr,
    statusUrl: store ? null : shared.statusUrl,
  };
}

export async function workshopReceiptPayloads(ticketId: string): Promise<{
  purchase: WorkshopReceiptInput;
  repair: WorkshopReceiptInput;
  warranty: WorkshopReceiptInput | null;
  warrantyStore: WorkshopReceiptInput | null;
} | null> {
  const ticket = await getRepair(ticketId);
  if (!ticket) return null;
  const [customer, device, charge, warranty, notes, technician, chargeVat, company, claim] =
    await Promise.all([
      getCustomer(ticket.customerId),
      getDevice(ticket.deviceId),
      loadTicketCharge(ticketId),
      getWarrantyForTicket(ticketId),
      listRepairNotes(ticketId),
      getRepairAssigneeName(ticket.assigneeId),
      isCustomerVatCharged(),
      getSetting<CompanyInfo>("company.info"),
      getLatestWarrantyClaim(ticketId),
    ]);

  const db = getDb();
  let code = ticket.publicShortCode;
  if (!code && ticket.publicAccessToken) {
    code = await allocatePublicShortCode();
    await db
      .update(repairTickets)
      .set({ publicShortCode: code, updatedAt: new Date() })
      .where(eq(repairTickets.id, ticketId));
  }

  const deviceLabel = [
    device?.brand,
    device?.model,
    device?.storage,
    device?.color,
    device?.variant,
  ]
    .filter((part) => part && String(part).trim())
    .join(" ");
  const address = [
    customer?.streetAddress,
    `${customer?.postalCode ?? ""} ${customer?.city ?? ""}`.trim(),
  ]
    .filter((part) => part && part.trim())
    .join(", ");

  const lines = charge.lines.map((line) => ({
    name: line.name,
    amountLabel: formatNokFromOre(line.amountOre),
  }));
  if (charge.discountOre > 0) {
    lines.push({
      name: charge.discountLabel || "Rabatt",
      amountLabel: `−${formatNokFromOre(charge.discountOre)}`,
    });
  }
  if (charge.postageOre > 0) {
    lines.push({
      name: "Returporto",
      amountLabel: formatNokFromOre(charge.postageOre),
    });
  }
  if (!lines.length && (ticket.customerPriceOre ?? 0) > 0) {
    lines.push({
      name: "Reparasjon",
      amountLabel: formatNokFromOre(ticket.customerPriceOre ?? 0),
    });
  }

  const vat = chargeVat ? vatFromGrossOre(charge.totalOre) : null;
  const statusUrl = code ? publicStatusUrl(code) : null;
  const qr = statusUrl ? await statusQr(statusUrl) : null;
  const paid = ticket.paymentStatus === "PAID";
  const slip = paid
    ? await stripePaymentSlip({
        paymentIntentId: ticket.stripePaymentIntentId,
        checkoutSessionId: ticket.stripeCheckoutSessionId,
      })
    : EMPTY_STRIPE_SLIP;

  const paymentLabel = paid
    ? ticket.stripePaymentIntentId
      ? "Betalt med kort"
      : "Betalt i butikk"
    : PAYMENT_STATUS_LABELS[ticket.paymentStatus] || ticket.paymentStatus;

  const warrantyLabel = warranty
    ? `${warranty.days} dager, til ${formatDate(warranty.endsAt).split(",")[0] || formatDate(warranty.endsAt)}`
    : ticket.warrantyDays
      ? `${ticket.warrantyDays} dager på utført arbeid`
      : "90 dager på utført arbeid";

  const workNotes = notes
    .filter((note) => note.visibility === "CUSTOMER")
    .slice(0, 6)
    .map((note) => note.content.trim())
    .filter(Boolean);

  const org = company?.orgNumber?.trim();
  const footer = [
    org ? `Org.nr ${org}` : "",
    "Kjopsbevis. Ta med ved reklamasjon.",
    `Garanti: ${warrantyLabel}`,
    chargeVat ? "Priser inkl. 25 % mva." : "Mva samles ikke inn.",
    "sd-solutions.org",
  ].filter(Boolean);

  const shared = {
    ticket: ticket.ticketNumber,
    issuedAt: new Date().toISOString(),
    cashier: technician,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    customerEmail: customer?.email ?? null,
    customerAddress: address || null,
    device: deviceLabel || null,
    imei: device?.imei ?? null,
    serialNumber: device?.serialNumber ?? null,
    paymentLabel,
    paymentDetail: paid
      ? slip.paymentDetail || (ticket.stripePaymentIntentId ? "Kort" : "Kontant/butikk")
      : "Ikke betalt ennå",
    cardBrand: slip.cardBrand,
    cardLast4: slip.cardLast4,
    authCode: slip.authCode,
    transactionId: slip.transactionId,
    paymentIntentId: slip.paymentIntentId,
    chargeId: slip.chargeId,
    fundingLabel: slip.fundingLabel,
    entryMethod: slip.entryMethod,
    wallet: slip.wallet,
    aid: slip.aid,
    applicationName: slip.applicationName,
    cardCountry: slip.cardCountry,
    networkTxnId: slip.networkTxnId,
    statement: slip.statement,
    paidAt: ticket.paidAt ? formatDate(ticket.paidAt) : null,
    lines,
    netLabel: vat?.netLabel ?? null,
    vatLabel: vat?.vatLabel ?? null,
    vatNote: chargeVat ? null : VAT_NOT_COLLECTED,
    totalLabel: formatNokFromOre(charge.totalOre),
    statusUrl,
    statusQr: qr,
    footer,
  } satisfies Partial<WorkshopReceiptInput>;

  const purchase: WorkshopReceiptInput = {
    ...shared,
    kind: "purchase",
    heading: "KJØPSKVITTERING",
    thanks: "Takk for handelen. Velkommen tilbake.",
  };

  const repair: WorkshopReceiptInput = {
    ...shared,
    kind: "repair",
    heading: "REPARASJONSKVITTERING",
    problem: ticket.customerProblem,
    inbound: DELIVERY_METHOD_LABELS[ticket.inboundMethod] || ticket.inboundMethod,
    outbound: DELIVERY_METHOD_LABELS[ticket.outboundMethod] || ticket.outboundMethod,
    receivedAt: ticket.receivedAt ? formatDate(ticket.receivedAt) : null,
    completedAt: ticket.completedAt ? formatDate(ticket.completedAt) : null,
    status: REPAIR_STATUS_LABELS[ticket.status] || ticket.status,
    technician,
    warranty: warrantyLabel,
    workNotes,
    thanks: "Takk for at du lot oss fikse den. Velkommen tilbake.",
  };

  const claimOutcome =
    claim?.resolutionKind === "REFUND"
      ? "refund"
      : claim?.resolutionKind === "REJECT"
        ? "reject"
        : "repair";
  const warrantyCustomer = claim
    ? warrantySlip(purchase, {
        copy: "customer",
        outcome: claimOutcome,
        description: claim.description,
        refundOre: claim.refundOre,
        signerName: claim.signerName,
      })
    : null;
  const warrantyStore = claim
    ? warrantySlip(purchase, {
        copy: "store",
        outcome: claimOutcome,
        description: claim.description,
        refundOre: claim.refundOre,
        signerName: claim.signerName,
      })
    : null;

  return {
    purchase,
    repair,
    warranty: warrantyCustomer,
    warrantyStore,
  };
}

export async function warrantyThermalPayload(
  ticketId: string,
  draft: WarrantyThermalDraft,
): Promise<WorkshopReceiptInput | null> {
  const payload = await workshopReceiptPayloads(ticketId);
  if (!payload) return null;
  return warrantySlip(payload.purchase, {
    copy: draft.copy,
    outcome: draft.outcome,
    description: draft.description.trim(),
    refundOre: Math.max(0, draft.refundOre ?? 0),
    signerName: draft.signerName ?? payload.purchase.customerName,
  });
}

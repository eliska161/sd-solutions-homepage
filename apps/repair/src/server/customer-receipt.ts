import { eq } from "drizzle-orm";
import {
  customers,
  devices,
  repairTickets,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { publicStatusUrl, type MailFile } from "@/lib/mail";
import { allocatePublicShortCode } from "@/lib/public-link";
import { renderReceiptPdf } from "@/lib/pdf/customer-document";
import { loadTicketCharge } from "@/lib/ticket-totals";
import { storeCustomerPdf } from "@/lib/store-customer-pdf";
import { stripePaymentSlip } from "@/server/payments";

export async function createAndStoreReceiptPdf(
  ticketId: string,
  paymentOverride?: string,
): Promise<MailFile | null> {
  const db = getDb();
  const [row] = await db
    .select({
      ticketNumber: repairTickets.ticketNumber,
      customerName: customers.name,
      customerPhone: customers.phone,
      brand: devices.brand,
      model: devices.model,
      variant: devices.variant,
      paymentStatus: repairTickets.paymentStatus,
      warrantyDays: repairTickets.warrantyDays,
      publicAccessToken: repairTickets.publicAccessToken,
      publicShortCode: repairTickets.publicShortCode,
      stripeCheckoutSessionId: repairTickets.stripeCheckoutSessionId,
      stripePaymentIntentId: repairTickets.stripePaymentIntentId,
    })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (!row) return null;

  const charge = await loadTicketCharge(ticketId);
  const deviceLabel = [row.brand, row.model, row.variant]
    .filter(Boolean)
    .join(" ");

  let code = row.publicShortCode;
  if (!code && row.publicAccessToken) {
    code = await allocatePublicShortCode();
    await db
      .update(repairTickets)
      .set({ publicShortCode: code, updatedAt: new Date() })
      .where(eq(repairTickets.id, ticketId));
  }

  const slip = await stripePaymentSlip({
    paymentIntentId: row.stripePaymentIntentId,
    checkoutSessionId: row.stripeCheckoutSessionId,
  });

  const buffer = await renderReceiptPdf({
    ticketNumber: row.ticketNumber,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    deviceLabel,
    issuedAt: new Date(),
    paymentLabel:
      paymentOverride ||
      PAYMENT_STATUS_LABELS[row.paymentStatus] ||
      row.paymentStatus,
    paymentDetail: slip.paymentDetail,
    cardBrand: slip.cardBrand,
    cardLast4: slip.cardLast4,
    authCode: slip.authCode,
    transactionId: slip.transactionId,
    statusUrl: code ? publicStatusUrl(code) : null,
    lines: charge.lines,
    discount:
      charge.discountOre > 0
        ? { label: charge.discountLabel || "Rabatt", amountOre: charge.discountOre }
        : null,
    postageOre: charge.postageOre,
    totalOre: charge.totalOre,
    warrantyDays: row.warrantyDays,
  });

  await storeCustomerPdf({
    ticketId,
    category: "RECEIPT",
    fileName: `kvittering-${row.ticketNumber}.pdf`,
    description: "Kvittering",
    buffer,
  });

  return {
    filename: `kvittering-${row.ticketNumber}.pdf`,
    content: buffer,
    contentType: "application/pdf",
  };
}

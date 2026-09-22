import { eq } from "drizzle-orm";
import {
  customers,
  devices,
  repairTickets,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";
import type { MailFile } from "@/lib/mail";
import { renderReceiptPdf } from "@/lib/pdf/customer-document";
import { loadTicketCharge } from "@/lib/ticket-totals";
import { storeCustomerPdf } from "@/lib/store-customer-pdf";

export async function createAndStoreReceiptPdf(
  ticketId: string,
  paymentOverride?: string,
): Promise<MailFile | null> {
  const db = getDb();
  const [row] = await db
    .select({
      ticketNumber: repairTickets.ticketNumber,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      streetAddress: customers.streetAddress,
      postalCode: customers.postalCode,
      city: customers.city,
      brand: devices.brand,
      model: devices.model,
      variant: devices.variant,
      paymentStatus: repairTickets.paymentStatus,
      warrantyDays: repairTickets.warrantyDays,
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
  const address = [row.streetAddress, `${row.postalCode} ${row.city}`.trim()]
    .filter((part) => part && part.trim())
    .join(", ");

  const buffer = await renderReceiptPdf({
    ticketNumber: row.ticketNumber,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    customerAddress: address || null,
    deviceLabel,
    issuedAt: new Date(),
    paymentLabel:
      paymentOverride ||
      PAYMENT_STATUS_LABELS[row.paymentStatus] ||
      row.paymentStatus,
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
    fileName: `faktura-${row.ticketNumber}.pdf`,
    description: "Faktura / kvittering",
    buffer,
  });

  return {
    filename: `faktura-${row.ticketNumber}.pdf`,
    content: buffer,
    contentType: "application/pdf",
  };
}

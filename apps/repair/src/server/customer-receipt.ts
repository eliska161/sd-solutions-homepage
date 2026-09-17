import { eq } from "drizzle-orm";
import {
  customers,
  devices,
  repairServices,
  repairTickets,
  services,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import type { MailFile } from "@/lib/mail";
import { renderReceiptPdf } from "@/lib/pdf/customer-document";
import { storeCustomerPdf } from "@/lib/store-customer-pdf";

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Ikke betalt",
  PARTIAL: "Delvis betalt",
  PAID: "Betalt",
  REFUNDED: "Refundert",
};

export async function createAndStoreReceiptPdf(
  ticketId: string,
): Promise<MailFile | null> {
  const db = getDb();
  const [row] = await db
    .select({
      ticketNumber: repairTickets.ticketNumber,
      customerName: customers.name,
      brand: devices.brand,
      model: devices.model,
      variant: devices.variant,
      customerPriceOre: repairTickets.customerPriceOre,
      discountOre: repairTickets.discountOre,
      discountLabel: repairTickets.discountLabel,
      outboundPostageOre: repairTickets.outboundPostageOre,
      paymentStatus: repairTickets.paymentStatus,
      warrantyDays: repairTickets.warrantyDays,
    })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (!row) return null;

  const lines = await db
    .select({
      name: services.name,
      priceOre: repairServices.priceOre,
    })
    .from(repairServices)
    .leftJoin(services, eq(services.id, repairServices.serviceId))
    .where(eq(repairServices.ticketId, ticketId));

  const postageOre = row.outboundPostageOre ?? 0;
  const servicesTotal = lines.reduce((sum, line) => sum + line.priceOre, 0);
  const discountOre = row.discountOre ?? 0;
  const totalOre = Math.max(0, servicesTotal - discountOre) + postageOre;
  const deviceLabel = [row.brand, row.model, row.variant]
    .filter(Boolean)
    .join(" ");

  const buffer = await renderReceiptPdf({
    ticketNumber: row.ticketNumber,
    customerName: row.customerName,
    deviceLabel,
    issuedAt: new Date(),
    paymentLabel: PAYMENT_LABEL[row.paymentStatus] || row.paymentStatus,
    lines: lines.map((line) => ({
      name: line.name?.trim() || "Tjeneste",
      amountOre: line.priceOre,
    })),
    discount:
      discountOre > 0
        ? {
            label: row.discountLabel?.trim() || "Rabatt",
            amountOre: discountOre,
          }
        : null,
    postageOre,
    totalOre,
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

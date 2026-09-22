import { eq } from "drizzle-orm";
import { repairServices, repairTickets, services } from "@/db/schema";
import { getDb } from "@/lib/db";

export type TicketChargeLine = {
  name: string;
  amountOre: number;
};

export type TicketCharge = {
  lines: TicketChargeLine[];
  discountOre: number;
  discountLabel: string | null;
  postageOre: number;
  totalOre: number;
};

export async function loadTicketCharge(ticketId: string): Promise<TicketCharge> {
  const db = getDb();
  const [ticket] = await db
    .select({
      customerPriceOre: repairTickets.customerPriceOre,
      discountOre: repairTickets.discountOre,
      discountLabel: repairTickets.discountLabel,
      outboundPostageOre: repairTickets.outboundPostageOre,
    })
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);

  const rows = await db
    .select({
      name: services.name,
      priceOre: repairServices.priceOre,
    })
    .from(repairServices)
    .leftJoin(services, eq(services.id, repairServices.serviceId))
    .where(eq(repairServices.ticketId, ticketId));

  const lines = rows.map((row) => ({
    name: row.name?.trim() || "Tjeneste",
    amountOre: row.priceOre,
  }));
  const servicesTotal = lines.reduce((sum, line) => sum + line.amountOre, 0);
  const discountOre = ticket?.discountOre ?? 0;
  const postageOre = ticket?.outboundPostageOre ?? 0;
  const afterDiscount =
    lines.length > 0
      ? Math.max(0, servicesTotal - discountOre)
      : Math.max(0, ticket?.customerPriceOre ?? 0);
  return {
    lines,
    discountOre: lines.length > 0 ? discountOre : 0,
    discountLabel: ticket?.discountLabel?.trim() || "Rabatt",
    postageOre,
    totalOre: afterDiscount + postageOre,
  };
}

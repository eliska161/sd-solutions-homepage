import { and, eq } from "drizzle-orm";
import { parts, repairParts, repairServices, repairTickets, services } from "@/db/schema";
import { looksLikeBatteryJob } from "@/lib/battery-calibrate";
import { getDb } from "@/lib/db";

export async function ticketIsBatteryJob(ticketId: string): Promise<boolean> {
  const db = getDb();
  const [ticket] = await db
    .select({
      customerProblem: repairTickets.customerProblem,
      internalProblem: repairTickets.internalProblem,
    })
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (looksLikeBatteryJob(ticket?.customerProblem, ticket?.internalProblem)) {
    return true;
  }

  const [batteryPart] = await db
    .select({ id: repairParts.id })
    .from(repairParts)
    .innerJoin(parts, eq(parts.id, repairParts.partId))
    .where(
      and(eq(repairParts.ticketId, ticketId), eq(parts.partType, "BATTERY")),
    )
    .limit(1);
  if (batteryPart) return true;

  const named = await db
    .select({ name: services.name })
    .from(repairServices)
    .innerJoin(services, eq(services.id, repairServices.serviceId))
    .where(eq(repairServices.ticketId, ticketId));
  return looksLikeBatteryJob(...named.map((row) => row.name));
}

"use server";

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  customers,
  parts,
  refurbishments,
  repairTickets,
  resales,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function getDashboardStats() {
  await requireSession();
  const db = getDb();

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const [openRepairs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairTickets)
    .where(
      sql`${repairTickets.status} not in ('COMPLETED', 'CANCELLED', 'RETURNED')`,
    );

  const [completedThisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairTickets)
    .where(
      and(
        eq(repairTickets.status, "COMPLETED"),
        gte(repairTickets.completedAt, monthStart),
        lt(repairTickets.completedAt, nextMonth),
      ),
    );

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(sql`${customers.archivedAt} is null`);

  const [activeFlips] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(refurbishments)
    .where(
      sql`${refurbishments.status} not in ('SOLD', 'ARCHIVED')`,
    );

  const [lowStockCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(parts)
    .where(
      and(
        eq(parts.active, true),
        sql`${parts.quantityOnHand} <= ${parts.minimumStock}`,
      ),
    );

  const recentRepairs = await db
    .select()
    .from(repairTickets)
    .orderBy(desc(repairTickets.createdAt))
    .limit(8);

  const recentFlips = await db
    .select()
    .from(refurbishments)
    .orderBy(desc(refurbishments.updatedAt))
    .limit(5);

  const lowStock = await db
    .select()
    .from(parts)
    .where(
      and(
        eq(parts.active, true),
        sql`${parts.quantityOnHand} <= ${parts.minimumStock}`,
      ),
    )
    .orderBy(parts.quantityOnHand)
    .limit(10);

  const [repairRevenue] = await db
    .select({
      revenueOre: sql<number>`coalesce(sum(${repairTickets.customerPriceOre}), 0)::int`,
      partsCostOre: sql<number>`coalesce(sum(${repairTickets.actualPartsCostOre}), 0)::int`,
      otherCostsOre: sql<number>`coalesce(sum(${repairTickets.otherCostsOre}), 0)::int`,
    })
    .from(repairTickets)
    .where(
      and(
        eq(repairTickets.status, "COMPLETED"),
        gte(repairTickets.completedAt, monthStart),
        lt(repairTickets.completedAt, nextMonth),
      ),
    );

  const [flipSales] = await db
    .select({
      revenueOre: sql<number>`coalesce(sum(${resales.salePriceOre}), 0)::int`,
      feesOre: sql<number>`coalesce(sum(${resales.platformFeesOre} + ${resales.shippingOre} + ${resales.otherFeesOre}), 0)::int`,
    })
    .from(resales)
    .where(and(gte(resales.soldAt, monthStart), lt(resales.soldAt, nextMonth)));

  const [flipProfit] = await db
    .select({
      profitOre: sql<number>`coalesce(sum(${refurbishments.actualProfitOre}), 0)::int`,
    })
    .from(refurbishments)
    .where(
      and(
        eq(refurbishments.status, "SOLD"),
        gte(refurbishments.soldAt, monthStart),
        lt(refurbishments.soldAt, nextMonth),
      ),
    );

  const monthlyRepairRevenueOre = repairRevenue?.revenueOre ?? 0;
  const monthlyRepairProfitOre =
    monthlyRepairRevenueOre -
    (repairRevenue?.partsCostOre ?? 0) -
    (repairRevenue?.otherCostsOre ?? 0);
  const monthlyFlipRevenueOre = flipSales?.revenueOre ?? 0;
  const monthlyFlipProfitOre = flipProfit?.profitOre ?? 0;

  return {
    counts: {
      openRepairs: openRepairs?.count ?? 0,
      completedThisMonth: completedThisMonth?.count ?? 0,
      customers: customerCount?.count ?? 0,
      activeFlips: activeFlips?.count ?? 0,
      lowStock: lowStockCount?.count ?? 0,
    },
    recentRepairs,
    recentFlips,
    lowStock,
    monthly: {
      repairRevenueOre: monthlyRepairRevenueOre,
      repairProfitOre: monthlyRepairProfitOre,
      flipRevenueOre: monthlyFlipRevenueOre,
      flipProfitOre: monthlyFlipProfitOre,
      totalRevenueOre: monthlyRepairRevenueOre + monthlyFlipRevenueOre,
      totalProfitOre: monthlyRepairProfitOre + monthlyFlipProfitOre,
    },
  };
}

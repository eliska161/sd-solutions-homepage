import { NextResponse } from "next/server";
import { publicTicketLinkFilter } from "@/lib/public-link";
import { getDb } from "@/lib/db";
import { repairTickets } from "@/db/schema";
import { ensurePickupCheckout } from "@/server/payments";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const filter = publicTicketLinkFilter(token);
  if (!filter) {
    return NextResponse.redirect(new URL("/s", request.url));
  }
  const db = getDb();
  const [ticket] = await db
    .select({ id: repairTickets.id, paymentStatus: repairTickets.paymentStatus })
    .from(repairTickets)
    .where(filter)
    .limit(1);
  if (!ticket) {
    return NextResponse.redirect(new URL(`/s/${token}`, request.url));
  }
  if (ticket.paymentStatus === "PAID") {
    return NextResponse.redirect(new URL(`/s/${token}?betalt=1`, request.url));
  }
  const checkout = await ensurePickupCheckout(ticket.id);
  if (checkout.ok && checkout.paid) {
    return NextResponse.redirect(new URL(`/s/${token}?betalt=1`, request.url));
  }
  if (checkout.ok && checkout.url) {
    return NextResponse.redirect(checkout.url);
  }
  return NextResponse.redirect(new URL(`/s/${token}`, request.url));
}

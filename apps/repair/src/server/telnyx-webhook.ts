import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { customers, repairNotes, repairTickets } from "@/db/schema";
import { getDb } from "@/lib/db";
import { nationalPhoneDigits } from "@/lib/phone";

type TelnyxEvent = {
  data?: {
    id?: string;
    event_type?: string;
    payload?: {
      direction?: string;
      text?: string;
      from?: { phone_number?: string };
      to?: Array<{ phone_number?: string; status?: string }>;
      errors?: Array<{ code?: string; title?: string; detail?: string }>;
    };
  };
};

export async function handleTelnyxMessagingEvent(
  event: TelnyxEvent,
  source: "primary" | "failover",
) {
  const type = event.data?.event_type ?? "";
  const payload = event.data?.payload;
  if (!type || !payload) return;

  if (type === "message.received") {
    await ingestInboundSms(payload);
    return;
  }

  if (
    type === "message.finalized" ||
    type === "message.sent" ||
    type === "message.failed"
  ) {
    const status = payload.to?.[0]?.status ?? type;
    const errors = payload.errors?.map((e) => e.detail || e.title).filter(Boolean);
    console.log("==> Telnyx SMS", {
      source,
      type,
      status,
      errors: errors?.length ? errors : undefined,
    });
  }
}

async function ingestInboundSms(payload: NonNullable<TelnyxEvent["data"]>["payload"]) {
  const from = payload?.from?.phone_number ?? "";
  const text = payload?.text?.trim() ?? "";
  const digits = nationalPhoneDigits(from);
  if (!digits || text.length < 1) {
    console.warn("==> Telnyx inbound uten gyldig norsk nummer eller tekst", from);
    return;
  }

  const db = getDb();
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
    })
    .from(customers)
    .where(
      sql`right(regexp_replace(${customers.phone}, '[^0-9]', '', 'g'), 8) = ${digits}`,
    )
    .limit(1);

  if (!customer) {
    console.warn("==> Telnyx inbound fra ukjent nummer", from);
    return;
  }

  const [ticket] = await db
    .select({ id: repairTickets.id, ticketNumber: repairTickets.ticketNumber })
    .from(repairTickets)
    .where(
      and(
        eq(repairTickets.customerId, customer.id),
        notInArray(repairTickets.status, ["CANCELLED"]),
      ),
    )
    .orderBy(desc(repairTickets.createdAt))
    .limit(1);

  if (!ticket) {
    console.warn("==> Telnyx inbound uten sak for", customer.id);
    return;
  }

  await db.insert(repairNotes).values({
    ticketId: ticket.id,
    authorId: null,
    authorName: customer.name?.trim() || "Kunde",
    authorKind: "CUSTOMER",
    content: text,
    visibility: "CUSTOMER",
  });
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { quoteItems, quotes } from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertCanWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const quoteItemInput = z.object({
  kind: z.enum(["SERVICE", "PART", "CUSTOM"]).default("CUSTOM"),
  serviceId: z.string().uuid().optional().nullable(),
  partId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPriceOre: z.number().int().min(0),
});

const createQuoteSchema = z.object({
  customerId: z.string().uuid(),
  ticketId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  items: z.array(quoteItemInput).min(1),
});

const quoteStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

export async function createQuote(input: z.infer<typeof createQuoteSchema>) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const data = createQuoteSchema.parse(input);
  const db = getDb();

  const totalOre = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceOre,
    0,
  );

  const [quote] = await db
    .insert(quotes)
    .values({
      customerId: data.customerId,
      ticketId: data.ticketId || null,
      notes: data.notes || null,
      validUntil: data.validUntil ?? null,
      totalOre,
      status: "DRAFT",
      createdById: session.user.id,
    })
    .returning();

  await db.insert(quoteItems).values(
    data.items.map((item) => ({
      quoteId: quote.id,
      kind: item.kind,
      serviceId: item.serviceId || null,
      partId: item.partId || null,
      description: item.description,
      quantity: item.quantity,
      unitPriceOre: item.unitPriceOre,
    })),
  );

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "quote",
    entityId: quote.id,
    action: "create",
    after: quote,
  });
  await addActivity({
    entityType: "quote",
    entityId: quote.id,
    type: "quote.created",
    message: `Tilbud opprettet (${totalOre} øre)`,
    actorId: session.user.id,
  });

  revalidatePath("/quotes");
  return quote;
}

export async function updateQuoteStatus(
  quoteId: string,
  status: z.infer<typeof quoteStatusSchema>,
) {
  const session = await requireSession();
  assertCanWrite(session.user.role);
  const next = quoteStatusSchema.parse(status);
  const db = getDb();

  const before = await getQuote(quoteId);
  if (!before) throw new Error("Tilbud ikke funnet");

  const [row] = await db
    .update(quotes)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(quotes.id, quoteId))
    .returning();

  await writeAuditLog({
    actorId: session.user.id,
    entityType: "quote",
    entityId: quoteId,
    action: "status_change",
    before: before.quote,
    after: row,
  });

  revalidatePath("/quotes");
  return row;
}

export async function getQuote(quoteId: string) {
  await requireSession();
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote) return null;
  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quoteId));
  return { quote, items };
}

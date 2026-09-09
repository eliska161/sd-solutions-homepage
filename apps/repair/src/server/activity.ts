"use server";

import { and, desc, eq } from "drizzle-orm";
import { activityEvents } from "@/db/schema";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function listActivity(opts?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  await requireSession();
  const db = getDb();
  const limit = opts?.limit ?? 40;
  const conditions = [];
  if (opts?.entityType) {
    conditions.push(eq(activityEvents.entityType, opts.entityType));
  }
  if (opts?.entityId) {
    conditions.push(eq(activityEvents.entityId, opts.entityId));
  }

  return db
    .select()
    .from(activityEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);
}

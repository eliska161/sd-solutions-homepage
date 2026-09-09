import { getDb } from "@/lib/db";
import { activityEvents } from "@/db/schema";

type ActivityInput = {
  entityType: string;
  entityId: string;
  type: string;
  message: string;
  actorId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function addActivity(input: ActivityInput) {
  const db = getDb();
  const [row] = await db
    .insert(activityEvents)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      type: input.type,
      message: input.message,
      actorId: input.actorId ?? null,
      meta: input.meta ?? null,
    })
    .returning();
  return row;
}

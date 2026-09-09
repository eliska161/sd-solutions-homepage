import { getDb } from "@/lib/db";
import { auditLogs } from "@/db/schema";

type AuditInput = {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
};

export async function writeAuditLog(input: AuditInput) {
  const db = getDb();
  const [row] = await db
    .insert(auditLogs)
    .values({
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      before: input.before ?? null,
      after: input.after ?? null,
    })
    .returning();
  return row;
}

import { and, desc, eq, inArray } from "drizzle-orm";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { attachments } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { MailFile } from "@/lib/mail";
import { getUploadsRoot, resolveUploadAbsolutePath } from "@/lib/uploads";

export async function storeCustomerPdf(input: {
  ticketId: string;
  category: "TERMS" | "RECEIPT";
  fileName: string;
  description: string;
  buffer: Buffer;
}) {
  const dir = path.join(getUploadsRoot(), "repair_ticket", input.ticketId);
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${input.category.toLowerCase()}.pdf`;
  const abs = path.join(dir, safeName);
  await writeFile(abs, input.buffer);
  const storagePath = `/uploads/repair_ticket/${input.ticketId}/${safeName}`;

  const db = getDb();
  const [row] = await db
    .insert(attachments)
    .values({
      entityType: "repair_ticket",
      entityId: input.ticketId,
      category: input.category,
      description: input.description,
      visibility: "CUSTOMER",
      fileName: input.fileName,
      mimeType: "application/pdf",
      size: input.buffer.length,
      storagePath,
      createdById: null,
    })
    .returning();

  return row;
}

export async function loadCustomerPdfFiles(
  ticketId: string,
  categories: Array<"TERMS" | "RECEIPT">,
): Promise<MailFile[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.entityType, "repair_ticket"),
        eq(attachments.entityId, ticketId),
        eq(attachments.visibility, "CUSTOMER"),
        inArray(attachments.category, categories),
      ),
    )
    .orderBy(desc(attachments.createdAt));

  const seen = new Set<string>();
  const files: MailFile[] = [];
  for (const row of rows) {
    const cat = row.category || "";
    if (seen.has(cat)) continue;
    seen.add(cat);
    const abs = resolveUploadAbsolutePath(row.storagePath);
    if (!abs) continue;
    try {
      files.push({
        filename: row.fileName,
        content: await readFile(abs),
        contentType: "application/pdf",
      });
    } catch {
      continue;
    }
  }
  return files;
}

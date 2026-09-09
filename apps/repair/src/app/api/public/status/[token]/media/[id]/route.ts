import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getPublicAttachmentForToken } from "@/server/public-status";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await context.params;
  const attachment = await getPublicAttachmentForToken(token, id);
  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  const relative = attachment.storagePath.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", relative);
  // Prevent path traversal outside public/uploads
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  if (!abs.startsWith(uploadsRoot)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(abs);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getUploadsRoot } from "@/lib/uploads";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Authenticated file serving from UPLOAD_DIR (not Next public/). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  await requireSession();
  const { path: parts } = await context.params;
  if (!parts?.length || parts.some((p) => p.includes("..") || p.includes("/"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = getUploadsRoot();
  const abs = path.join(root, ...parts);
  if (!abs.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".pdf"
              ? "application/pdf"
              : "image/jpeg";
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: Request) {
  const secret = process.env.ELKS_WEBHOOK_SECRET?.trim();
  if (secret) {
    const key = new URL(req.url).searchParams.get("key");
    if (key !== secret) {
      return new NextResponse("unauthorized", { status: 401 });
    }
  }

  const contentType = req.headers.get("content-type") ?? "";
  let id = "";
  let status = "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    id = String(form.get("id") || "");
    status = String(form.get("status") || "");
  } else {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    id = params.get("id") ?? "";
    status = params.get("status") ?? "";
  }

  console.log("==> 46elks DLR", { id, status });
  return new NextResponse("ok", { status: 200 });
}

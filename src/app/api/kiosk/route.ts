import { NextResponse } from "next/server";
import { repairPortalUrl } from "@/lib/repair-portal";

export const dynamic = "force-dynamic";

async function forward(request: Request) {
  const secret = process.env.KIOSK_API_SECRET?.trim();
  const url = new URL(request.url);
  const target = new URL(repairPortalUrl("/api/kiosk"));
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = await request.text();
    init.headers = headers;
  }

  try {
    const res = await fetch(target, init);
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Kiosken når ikke reparasjonsdatabasen." },
        { status: 502 },
      );
    }
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Kiosken når ikke reparasjonsdatabasen." },
      { status: 502 },
    );
  }
}

export function GET(request: Request) {
  return forward(request);
}

export function POST(request: Request) {
  return forward(request);
}

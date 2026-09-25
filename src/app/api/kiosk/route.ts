import { NextResponse } from "next/server";
import { repairPortalUrl } from "@/lib/repair-portal";
import { lookupPostalPlace } from "@/lib/postal";

export const dynamic = "force-dynamic";

async function jsonPlace(postal: string) {
  const result = await lookupPostalPlace(postal);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    postalCode: result.postalCode,
    city: result.city,
  });
}

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

export async function GET(request: Request) {
  const postal = new URL(request.url).searchParams.get("postal") || "";
  if (postal) return jsonPlace(postal);
  return forward(request);
}

export async function POST(request: Request) {
  const text = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "Ugyldig data" }, { status: 400 });
  }
  if (body.action === "place") {
    return jsonPlace(String(body.postal || body.q || ""));
  }
  const secret = process.env.KIOSK_API_SECRET?.trim();
  const target = new URL(repairPortalUrl("/api/kiosk"));
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (secret) headers.Authorization = `Bearer ${secret}`;
  try {
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: text,
      cache: "no-store",
    });
    const out = await res.text();
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Kiosken når ikke reparasjonsdatabasen." },
        { status: 502 },
      );
    }
    return new NextResponse(out, {
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

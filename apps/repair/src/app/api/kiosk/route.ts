import { NextResponse } from "next/server";
import {
  createKioskLockerOrder,
  kioskBoard,
  lookupKioskDropoffs,
  readKioskAuth,
  receiveKioskTicket,
} from "@/server/kiosk";

export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request) {
  try {
    const auth = readKioskAuth(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone") || "";
    if (phone) {
      const repairs = await lookupKioskDropoffs(phone);
      return NextResponse.json({ ok: true, repairs });
    }
    const board = await kioskBoard();
    return NextResponse.json({ ok: true, ...board });
  } catch (err) {
    console.error("kiosk GET", err);
    return jsonError("Kunne ikke hente saker", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = readKioskAuth(request);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    let body: Record<string, string> = {};
    try {
      body = (await request.json()) as Record<string, string>;
    } catch {
      return jsonError("Ugyldig data");
    }
    const action = body.action || "lookup";
    if (action === "lookup") {
      const repairs = await lookupKioskDropoffs(String(body.phone || ""));
      return NextResponse.json({ ok: true, repairs });
    }
    if (action === "create") {
      const result = await createKioskLockerOrder({
        phone: String(body.phone || ""),
        device: String(body.device || ""),
        issue: String(body.issue || ""),
      });
      if (!result.ok) return jsonError(result.error);
      return NextResponse.json(result);
    }
    if (action === "receive") {
      const result = await receiveKioskTicket(String(body.ticketNumber || ""));
      if (!result.ok) return jsonError(result.error);
      return NextResponse.json(result);
    }
    return jsonError("Ukjent handling");
  } catch (err) {
    console.error("kiosk POST", err);
    return jsonError("Kunne ikke fullføre handlingen", 500);
  }
}

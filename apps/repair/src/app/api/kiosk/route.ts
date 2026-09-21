import { NextResponse } from "next/server";
import {
  createKioskLockerOrder,
  kioskBoard,
  lookupKioskDevice,
  lookupKioskDropoffs,
  lookupKioskPickup,
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
    const query =
      url.searchParams.get("q") ||
      url.searchParams.get("serial") ||
      url.searchParams.get("imei") ||
      url.searchParams.get("phone") ||
      "";
    if (query) {
      const repairs = await lookupKioskDropoffs(query);
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
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError("Ugyldig data");
    }
    const action = body.action || "lookup";
    if (action === "lookup") {
      const query = String(body.q || body.serial || body.imei || body.phone || "");
      const repairs = await lookupKioskDropoffs(query);
      return NextResponse.json({ ok: true, repairs });
    }
    if (action === "device") {
      const result = await lookupKioskDevice(String(body.q || body.query || ""));
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "create") {
      const result = await createKioskLockerOrder({
        phone: String(body.phone || ""),
        device: String(body.device || ""),
        issue: String(body.issue || ""),
        comment: String(body.comment || ""),
        imei: String(body.imei || ""),
        serialNumber: String(body.serialNumber || ""),
        termsAccepted: body.termsAccepted === "true" || (body as { termsAccepted?: boolean }).termsAccepted === true,
        termsVersion: String(body.termsVersion || ""),
        signaturePng: String(body.signaturePng || ""),
        termsSignerName: String(body.termsSignerName || "Kunde"),
      });
      if (!result.ok) return jsonError(result.error);
      return NextResponse.json(result);
    }
    if (action === "pickup") {
      const repair = await lookupKioskPickup(String(body.pin || ""));
      if (!repair) return jsonError("Ugyldig PIN", 404);
      return NextResponse.json({ ok: true, repair });
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

import { NextResponse } from "next/server";
import { handleTelnyxMessagingEvent } from "@/server/telnyx-webhook";
import { verifyTelnyxSignature } from "@/lib/telnyx";

export const runtime = "nodejs";

function ok() {
  return new NextResponse("ok", { status: 200 });
}

export async function GET() {
  return ok();
}

export async function POST(
  req: Request,
  source: "primary" | "failover",
) {
  const rawBody = await req.text();
  const publicKey = process.env.TELNYX_PUBLIC_KEY?.trim();
  if (publicKey) {
    const valid = verifyTelnyxSignature({
      rawBody,
      signature: req.headers.get("telnyx-signature-ed25519"),
      timestamp: req.headers.get("telnyx-timestamp"),
      publicKey,
    });
    if (!valid) {
      return new NextResponse("invalid signature", { status: 403 });
    }
  } else {
    console.warn("==> Telnyx webhook uten TELNYX_PUBLIC_KEY — signatur sjekkes ikke");
  }

  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }

  try {
    await handleTelnyxMessagingEvent(
      parsed as Parameters<typeof handleTelnyxMessagingEvent>[0],
      source,
    );
  } catch (err) {
    console.error("==> Telnyx webhook feilet", err);
  }

  return ok();
}

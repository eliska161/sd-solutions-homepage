import { createPublicKey, verify, type KeyObject } from "node:crypto";
import { publicAppOrigin } from "@/lib/mail";

export const DEFAULT_ALPHA_SENDER = "SDSolutions";

export function telnyxWebhookUrl() {
  return `${publicAppOrigin()}/api/webhooks/telnyx`;
}

export function telnyxWebhookFailoverUrl() {
  return `${publicAppOrigin()}/api/webhooks/telnyx/failover`;
}

export function telnyxAlphaSender() {
  const raw = process.env.TELNYX_FROM?.trim() || DEFAULT_ALPHA_SENDER;
  return raw.slice(0, 11);
}

export function telnyxIsConfigured() {
  return Boolean(
    process.env.TELNYX_API_KEY?.trim() &&
      process.env.TELNYX_MESSAGING_PROFILE_ID?.trim(),
  );
}

export function telnyxPublicKeyConfigured() {
  return Boolean(process.env.TELNYX_PUBLIC_KEY?.trim());
}

function parseEd25519PublicKey(raw: string): KeyObject | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.includes("BEGIN PUBLIC KEY")) {
      return createPublicKey(trimmed);
    }
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32) {
      const spki = Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        buf,
      ]);
      return createPublicKey({ key: spki, format: "der", type: "spki" });
    }
    if (buf.length > 32) {
      return createPublicKey({ key: buf, format: "der", type: "spki" });
    }
  } catch {
    return null;
  }
  return null;
}

const MAX_SKEW_SEC = 300;

export function verifyTelnyxSignature(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  publicKey: string;
}): boolean {
  if (!input.signature || !input.timestamp) return false;
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SEC) return false;
  const key = parseEd25519PublicKey(input.publicKey);
  if (!key) return false;
  try {
    return verify(
      null,
      Buffer.from(`${input.timestamp}|${input.rawBody}`),
      key,
      Buffer.from(input.signature, "base64"),
    );
  } catch {
    return false;
  }
}

export async function sendTelnyxSms(to: string, text: string): Promise<boolean> {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID?.trim();
  if (!apiKey || !profileId) {
    console.warn("==> Skip SMS: Telnyx er ikke satt opp");
    return false;
  }

  const res = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: telnyxAlphaSender(),
      to,
      text,
      type: "SMS",
      messaging_profile_id: profileId,
      webhook_url: telnyxWebhookUrl(),
      webhook_failover_url: telnyxWebhookFailoverUrl(),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("==> Telnyx SMS feilet", res.status, detail.slice(0, 500));
    return false;
  }
  return true;
}

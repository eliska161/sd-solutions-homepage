import { publicAppOrigin } from "@/lib/mail";

export const DEFAULT_ALPHA_SENDER = "SDSolutions";

export function elksAlphaSender() {
  const raw = process.env.ELKS_FROM?.trim() || DEFAULT_ALPHA_SENDER;
  return raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 11) || DEFAULT_ALPHA_SENDER;
}

export function elksIsConfigured() {
  return Boolean(
    process.env.ELKS_API_USERNAME?.trim() &&
      process.env.ELKS_API_PASSWORD?.trim(),
  );
}

export function elksDeliveryWebhookUrl() {
  const origin = publicAppOrigin();
  const secret = process.env.ELKS_WEBHOOK_SECRET?.trim();
  const url = `${origin}/api/webhooks/elks`;
  if (!secret) return url;
  return `${url}?key=${encodeURIComponent(secret)}`;
}

export async function sendElksSms(to: string, text: string): Promise<boolean> {
  const username = process.env.ELKS_API_USERNAME?.trim();
  const password = process.env.ELKS_API_PASSWORD?.trim();
  if (!username || !password) {
    console.warn("==> Skip SMS: 46elks er ikke satt opp");
    return false;
  }

  const body = new URLSearchParams({
    from: elksAlphaSender(),
    to,
    message: text,
    whendelivered: elksDeliveryWebhookUrl(),
  });

  const res = await fetch("https://api.46elks.com/a1/sms", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("==> 46elks SMS feilet", res.status, detail.slice(0, 500));
    return false;
  }
  return true;
}

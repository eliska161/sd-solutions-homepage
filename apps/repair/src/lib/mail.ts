import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Resend } from "resend";

const DEFAULT_FROM = "SD Solutions <service@sd-solutions.org>";
/** Same mark as the landing header (`/sd-solutions-mark.png`). */
const DEFAULT_LOGO = "https://sd-solutions.org/sd-solutions-mark.png";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function mailFrom() {
  return process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
}

function mailReplyTo() {
  return process.env.MAIL_REPLY_TO?.trim() || "service@sd-solutions.org";
}

export function publicAppOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "https://repair.sd-solutions.org"
  ).replace(/\/$/, "");
}

export function mailLogoUrl() {
  return process.env.MAIL_LOGO_URL?.trim() || DEFAULT_LOGO;
}

export function mailLogoSrc() {
  const file = path.join(process.cwd(), "assets/brand/sd-solutions-mark.png");
  return existsSync(file) ? "cid:sd-logo" : mailLogoUrl();
}

function logoAttachment() {
  const file = path.join(process.cwd(), "assets/brand/sd-solutions-mark.png");
  if (!existsSync(file)) return null;
  return {
    filename: "sd-solutions-mark.png",
    content: readFileSync(file),
    contentId: "sd-logo",
    contentType: "image/png",
  };
}

export function isSendableCustomerEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase() ?? "";
  if (!value || !value.includes("@")) return false;
  if (value.endsWith(".invalid")) return false;
  if (value.includes("ukjent@")) return false;
  return true;
}

export function publicStatusUrl(token: string) {
  return `${publicAppOrigin()}/s/${token}`;
}

let client: Resend | null = null;

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Best-effort send. Never throws to the caller. */
export async function sendCustomerEmail(mail: OutboundMail): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("==> Skip e-post: RESEND_API_KEY er ikke satt");
    return false;
  }
  if (!isSendableCustomerEmail(mail.to)) return false;

  const logo = logoAttachment();

  try {
    const { error } = await resend.emails.send({
      from: mailFrom(),
      to: mail.to,
      replyTo: mailReplyTo(),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: logo ? [logo] : undefined,
    });
    if (error) {
      console.error("==> Resend feilet", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("==> Resend kastet", err);
    return false;
  }
}

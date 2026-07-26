import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  CONTACT_FROM,
  CONTACT_TO,
  INQUIRY_TYPES,
  inquiryLabel,
  type ContactPayload,
  type InquiryTypeId,
} from "@/lib/contact";

const inquiryIds = INQUIRY_TYPES.map((t) => t.id);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(label: string, value?: string) {
  if (!value?.trim()) return "";
  return `<tr>
    <td style="padding:8px 12px 8px 0;color:#8e8e93;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#111;">${escapeHtml(value).replaceAll("\n", "<br/>")}</td>
  </tr>`;
}

function buildEmail(data: ContactPayload) {
  const typeLabel = inquiryLabel(data.inquiryType);

  const extraRows =
    data.inquiryType === "custom"
      ? [row("Tidslinje", data.timeline), row("Budsjett", data.budget)].join("")
      : "";

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <h1 style="font-size:18px;font-weight:600;margin:0 0 4px;">Ny henvendelse fra SD Solutions</h1>
      <p style="margin:0 0 24px;color:#8e8e93;font-size:14px;">Type: ${escapeHtml(typeLabel)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
        ${row("Navn", data.name)}
        ${row("E-post", data.email)}
        ${row("Organisasjon", data.organization)}
        ${extraRows}
        ${row("Melding", data.message)}
      </table>
    </div>
  `;

  const textLines = [
    `Ny henvendelse fra SD Solutions`,
    `Type: ${typeLabel}`,
    "",
    `Navn: ${data.name}`,
    `E-post: ${data.email}`,
    data.organization ? `Organisasjon: ${data.organization}` : "",
    data.timeline ? `Tidslinje: ${data.timeline}` : "",
    data.budget ? `Budsjett: ${data.budget}` : "",
    "",
    "Melding:",
    data.message,
  ].filter(Boolean);

  return {
    subject: `[${typeLabel}] ${data.name}${data.organization ? ` — ${data.organization}` : ""}`,
    html,
    text: textLines.join("\n"),
  };
}

function parseBody(body: unknown): ContactPayload | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;

  const inquiryType = data.inquiryType;
  if (
    typeof inquiryType !== "string" ||
    !inquiryIds.includes(inquiryType as InquiryTypeId)
  ) {
    return null;
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  if (!name || !email || !message || !isValidEmail(email)) return null;

  const optional = (key: string) =>
    typeof data[key] === "string" ? (data[key] as string).trim() : undefined;

  return {
    inquiryType: inquiryType as InquiryTypeId,
    name,
    email,
    message,
    organization: optional("organization"),
    timeline: optional("timeline"),
    budget: optional("budget"),
  };
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = parseBody(json);

    if (!data) {
      return NextResponse.json(
        { error: "Ugyldig forespørsel. Sjekk at alle påkrevde felt er fylt ut." },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json(
        { error: "E-posttjenesten er ikke konfigurert." },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const email = buildEmail(data);

    const { error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: data.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Kunne ikke sende henvendelsen. Prøv igjen senere." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen senere." },
      { status: 500 },
    );
  }
}

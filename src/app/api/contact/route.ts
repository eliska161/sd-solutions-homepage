import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  CONTACT_FROM,
  CONTACT_TO,
  INQUIRY_TYPES,
  inquiryLabel,
  type ContactPayload,
  type InquiryTypeId,
  type RepairRequestDetails,
} from "@/lib/contact";
import {
  REPAIR_SERVICE_LABELS,
  estimateRepairTotal,
  formatNok,
  getRepairModel,
  isRepairServiceId,
  type RepairServiceId,
} from "@/lib/repair-prices";

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

  const repairRows = data.repair
    ? [
        row("Modell", data.repair.modelLabel),
        row("Reparasjoner", data.repair.serviceLabels.join(", ")),
        row(
          "Estimert pris",
          `${formatNok(data.repair.estimatedTotal)} (estimat — endelig pris etter inspeksjon)`,
        ),
        row("Telefon", data.phone),
        row("Kommentar", data.repair.comment),
      ].join("")
    : row("Telefon", data.phone);

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
      <h1 style="font-size:18px;font-weight:600;margin:0 0 4px;">Ny henvendelse fra SD Solutions</h1>
      <p style="margin:0 0 24px;color:#8e8e93;font-size:14px;">Type: ${escapeHtml(typeLabel)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
        ${row("Navn", data.name)}
        ${row("E-post", data.email)}
        ${row("Organisasjon", data.organization)}
        ${extraRows}
        ${repairRows}
        ${data.repair ? "" : row("Melding", data.message)}
      </table>
    </div>
  `;

  const textLines = [
    `Ny henvendelse fra SD Solutions`,
    `Type: ${typeLabel}`,
    "",
    `Navn: ${data.name}`,
    `E-post: ${data.email}`,
    data.phone ? `Telefon: ${data.phone}` : "",
    data.organization ? `Organisasjon: ${data.organization}` : "",
    data.timeline ? `Tidslinje: ${data.timeline}` : "",
    data.budget ? `Budsjett: ${data.budget}` : "",
    data.repair ? `Modell: ${data.repair.modelLabel}` : "",
    data.repair
      ? `Reparasjoner: ${data.repair.serviceLabels.join(", ")}`
      : "",
    data.repair
      ? `Estimert pris: ${formatNok(data.repair.estimatedTotal)} (estimat)`
      : "",
    data.repair?.comment ? `Kommentar: ${data.repair.comment}` : "",
    data.repair ? "" : "",
    data.repair ? "" : "Melding:",
    data.repair ? "" : data.message,
  ].filter(Boolean);

  return {
    subject: data.repair
      ? `[Reparasjon] ${data.repair.modelLabel} — ${data.name}`
      : `[${typeLabel}] ${data.name}${data.organization ? ` — ${data.organization}` : ""}`,
    html,
    text: textLines.join("\n"),
  };
}

function parseRepair(value: unknown): RepairRequestDetails | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;

  const modelId = typeof data.modelId === "string" ? data.modelId.trim() : "";
  const model = getRepairModel(modelId);
  if (!model) return undefined;

  if (!Array.isArray(data.serviceIds) || data.serviceIds.length === 0) {
    return undefined;
  }

  const serviceIds: RepairServiceId[] = [];
  for (const item of data.serviceIds) {
    if (typeof item !== "string" || !isRepairServiceId(item)) return undefined;
    if (!serviceIds.includes(item)) serviceIds.push(item);
  }
  if (serviceIds.length === 0) return undefined;

  const estimatedTotal = estimateRepairTotal(model.id, serviceIds);
  const comment =
    typeof data.comment === "string" ? data.comment.trim() : undefined;

  return {
    modelId: model.id,
    modelLabel: model.label,
    serviceIds,
    serviceLabels: serviceIds.map((id) => REPAIR_SERVICE_LABELS[id]),
    estimatedTotal,
    comment: comment || undefined,
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
  let message = typeof data.message === "string" ? data.message.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : undefined;

  if (!name || !email || !isValidEmail(email)) return null;

  const optional = (key: string) =>
    typeof data[key] === "string" ? (data[key] as string).trim() : undefined;

  let repair: RepairRequestDetails | undefined;
  if (inquiryType === "repair") {
    repair = parseRepair(data.repair);
    if (repair && !message) {
      message = [
        `Modell: ${repair.modelLabel}`,
        `Reparasjoner: ${repair.serviceLabels.join(", ")}`,
        `Estimert pris: ${formatNok(repair.estimatedTotal)}`,
        repair.comment ? `Kommentar: ${repair.comment}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  if (!message) return null;

  return {
    inquiryType: inquiryType as InquiryTypeId,
    name,
    email,
    message,
    organization: optional("organization"),
    timeline: optional("timeline"),
    budget: optional("budget"),
    phone: phone || undefined,
    repair,
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

import { after } from "next/server";
import { eq } from "drizzle-orm";
import { customers, devices, repairTickets } from "@/db/schema";
import { getDb } from "@/lib/db";
import { escapeHtml } from "@/lib/mail-html";
import { customerMailLayout } from "@/lib/mail-layout";
import { workshopAddressOneLine, WORKSHOP } from "@/lib/workshop";
import {
  isSendableCustomerEmail,
  publicStatusUrl,
  sendCustomerEmail,
  type OutboundMail,
} from "@/lib/mail";
import { isSendablePhone } from "@/lib/phone";
import { sendCustomerSms } from "@/lib/sms";

type MailContext = {
  ticketNumber: string;
  token: string;
  inboundMethod: "IN_PERSON" | "POST";
  outboundMethod: "IN_PERSON" | "POST";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deviceLabel: string;
  returnTrackingNumber: string | null;
};

function enqueue(task: () => Promise<void>) {
  const run = () =>
    task().catch((err) => {
      console.error("==> Kundemelding feilet", err);
    });
  try {
    after(run);
  } catch {
    void run();
  }
}

async function loadContext(ticketId: string): Promise<MailContext | null> {
  const db = getDb();
  const [row] = await db
    .select({
      ticketNumber: repairTickets.ticketNumber,
      token: repairTickets.publicAccessToken,
      inboundMethod: repairTickets.inboundMethod,
      outboundMethod: repairTickets.outboundMethod,
      returnTrackingNumber: repairTickets.returnTrackingNumber,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      brand: devices.brand,
      model: devices.model,
      variant: devices.variant,
    })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(eq(repairTickets.id, ticketId))
    .limit(1);

  if (!row?.token) return null;
  const emailOk = isSendableCustomerEmail(row.customerEmail);
  const phoneOk = isSendablePhone(row.customerPhone);
  if (!emailOk && !phoneOk) return null;

  const deviceLabel = [row.brand, row.model, row.variant]
    .filter(Boolean)
    .join(" ");

  return {
    ticketNumber: row.ticketNumber,
    token: row.token,
    inboundMethod: row.inboundMethod,
    outboundMethod: row.outboundMethod,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    deviceLabel,
    returnTrackingNumber: row.returnTrackingNumber?.trim() || null,
  };
}

function greeting(name: string) {
  const first = name.trim().split(/\s+/)[0] || "hei";
  return `Hei ${first}`;
}

function buildMail(
  ctx: MailContext,
  opts: {
    subject: string;
    heading: string;
    preheader: string;
    paragraphs: string[];
    quote?: string;
  },
): OutboundMail {
  const statusUrl = publicStatusUrl(ctx.token);
  const bodyHtml = [
    `<p style="margin:0 0 12px;">${escapeHtml(greeting(ctx.customerName))},</p>`,
    ...opts.paragraphs.map(
      (p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`,
    ),
    opts.quote
      ? `<p style="margin:16px 0;padding:12px 14px;background:#f4f5f7;border:1px solid #d5d8de;white-space:pre-wrap;">${escapeHtml(opts.quote)}</p>`
      : "",
  ].join("");

  const text = [
    `${greeting(ctx.customerName)},`,
    "",
    ...opts.paragraphs,
    opts.quote ? `\n${opts.quote}\n` : "",
    `Status: ${statusUrl}`,
    "",
    "SD Solutions",
    "Slåttmyrvegen 49, 2406 Elverum",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    to: ctx.customerEmail,
    subject: opts.subject,
    text,
    html: customerMailLayout({
      preheader: opts.preheader,
      heading: opts.heading,
      ticketNumber: ctx.ticketNumber,
      deviceLabel: ctx.deviceLabel,
      bodyHtml,
      statusUrl,
    }),
  };
}

function smsLine(ctx: MailContext, line: string) {
  return `${greeting(ctx.customerName)}. ${line} Status: ${publicStatusUrl(ctx.token)}`;
}

function deviceBit(ctx: MailContext) {
  return ctx.deviceLabel.trim() ? ` (${ctx.deviceLabel})` : "";
}

async function sendForTicket(
  ticketId: string,
  compose: (ctx: MailContext) => { mail: OutboundMail; sms: string },
) {
  const ctx = await loadContext(ticketId);
  if (!ctx) return;
  const { mail, sms } = compose(ctx);
  if (isSendableCustomerEmail(ctx.customerEmail)) {
    await sendCustomerEmail(mail);
  }
  if (isSendablePhone(ctx.customerPhone)) {
    await sendCustomerSms(ctx.customerPhone, sms);
  }
}

export function notifyServiceOrderCreated(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => {
      const byPost = ctx.inboundMethod === "POST";
      const address = workshopAddressOneLine();
      return {
        mail: buildMail(ctx, {
          subject: `Serviceordre ${ctx.ticketNumber} er opprettet`,
          heading: "Serviceordre opprettet",
          preheader: byPost
            ? `Send enheten til ${address}. Merk pakken med ${ctx.ticketNumber}.`
            : "Book innlevering og kom med telefonen i åpningstiden.",
          paragraphs: byPost
            ? [
                `Vi har registrert serviceordre ${ctx.ticketNumber}${deviceBit(ctx)}.`,
                `Send enheten til ${address}.`,
                `Merk pakken med referansenummer ${ctx.ticketNumber}.`,
                "Jobben starter når pakken er framme hos oss. Status: lenken under.",
              ]
            : [
                `Vi har registrert serviceordre ${ctx.ticketNumber}${deviceBit(ctx)}.`,
                "Du valgte å levere telefonen hos oss. Vi tar den ikke inn i verkstedet før den er fysisk levert.",
                `Adresse: ${address}. Åpent ${WORKSHOP.hoursLabel}.`,
                "Velg dato og timeslot på innleveringssiden (samme lenke som status). Ta med telefonen til avtalt tid.",
              ],
        }),
        sms: byPost
          ? smsLine(
              ctx,
              `Serviceordre ${ctx.ticketNumber} er opprettet. Send enheten til ${address}. Merk pakken med ${ctx.ticketNumber}.`,
            )
          : smsLine(
              ctx,
              `Serviceordre ${ctx.ticketNumber} er opprettet. Lever telefonen hos oss, ${address}, ${WORKSHOP.hoursLabel}. Book tid på statuslenken.`,
            ),
      };
    }),
  );
}

export function notifyDeviceReceived(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Vi har mottatt enheten — ${ctx.ticketNumber}`,
        heading: "Enheten er mottatt",
        preheader: `Vi har mottatt ${ctx.ticketNumber}.`,
        paragraphs: [
          `Vi har mottatt enheten på ${ctx.ticketNumber}${deviceBit(ctx)}.`,
          "Vi kontakter deg hvis vi trenger ytterligere informasjon.",
        ],
      }),
      sms: smsLine(
        ctx,
        `Vi har mottatt enheten på ${ctx.ticketNumber}. Vi kontakter deg hvis vi trenger ytterligere informasjon.`,
      ),
    })),
  );
}

export function notifyWaitingForCustomer(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Vi venter på deg — ${ctx.ticketNumber}`,
        heading: "Vi venter på deg",
        preheader: "Vi kan ikke fortsette før du svarer.",
        paragraphs: [
          `På ${ctx.ticketNumber} har vi noe som krever svar fra deg — som oftest diagnose, pris eller om vi skal gå videre med jobben.`,
          "Vi gjør ikke mer på telefonen før du har svart. Åpne statussiden, les det som står der, og skriv tilbake eller godkjenn der.",
        ],
      }),
      sms: smsLine(
        ctx,
        `Vi venter på deg på ${ctx.ticketNumber} (ofte pris eller diagnose). Jobben står til du svarer på statuslenken.`,
      ),
    })),
  );
}

export function notifyReadyForPickup(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => {
      const byPost = ctx.outboundMethod === "POST";
      const tracking = ctx.returnTrackingNumber;
      const trackingMail = tracking
        ? [`Sporingsnummer: ${tracking}.`]
        : [];
      const trackingSms = tracking ? ` Sporing: ${tracking}.` : "";
      return {
        mail: buildMail(ctx, {
          subject: byPost
            ? `Vi sender telefonen i retur — ${ctx.ticketNumber}`
            : `Klar for henting — ${ctx.ticketNumber}`,
          heading: byPost ? "Sendes i retur med post" : "Klar for henting",
          preheader: byPost
            ? "Jobben er ferdig. Vi sender telefonen tilbake til deg."
            : "Jobben er ferdig. Du kan hente telefonen hos oss.",
          paragraphs: byPost
            ? [
                `Jobben på ${ctx.ticketNumber}${deviceBit(ctx)} er ferdig.`,
                "Vi sender telefonen tilbake til adressen du oppga.",
                ...trackingMail,
              ]
            : [
                `Jobben på ${ctx.ticketNumber}${deviceBit(ctx)} er ferdig.`,
                `Du valgte henting i butikk. Hent telefonen hos oss: ${workshopAddressOneLine()}. Åpent ${WORKSHOP.hoursLabel}.`,
                "Ta med legitimasjon. Si fra om saksnummeret i skranken.",
              ],
        }),
        sms: smsLine(
          ctx,
          byPost
            ? `Jobben på ${ctx.ticketNumber} er ferdig. Vi sender telefonen tilbake.${trackingSms}`
            : `Jobben på ${ctx.ticketNumber} er ferdig. Hent hos oss, ${workshopAddressOneLine()}, ${WORKSHOP.hoursLabel}. Ta med legitimasjon.`,
        ),
      };
    }),
  );
}

export function notifyRepairCompleted(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => {
      const byPost = ctx.outboundMethod === "POST";
      return {
        mail: buildMail(ctx, {
          subject: `Saken er avsluttet — ${ctx.ticketNumber}`,
          heading: "Saken er avsluttet",
          preheader: `${ctx.ticketNumber} er lukket hos oss.`,
          paragraphs: [
            `Vi har satt ${ctx.ticketNumber}${deviceBit(ctx)} til ferdig hos oss.`,
            byPost
              ? "Hvis telefonen skulle i retur med post, er den sendt eller levert. Mangler du pakken, svar på denne e-posten."
              : "Hvis du skulle hente i butikk, er saken ferdigbehandlet hos oss. Ta kontakt hvis noe mangler.",
            "Statuslenken virker fortsatt hvis du trenger saksnummer eller historikk.",
          ],
        }),
        sms: smsLine(
          ctx,
          byPost
            ? `${ctx.ticketNumber} er avsluttet hos oss. Ved post-retur er telefonen sendt eller levert. Si ifra hvis pakken mangler.`
            : `${ctx.ticketNumber} er avsluttet hos oss. Ta kontakt hvis noe mangler etter henting.`,
        ),
      };
    }),
  );
}

export function notifyStaffUpdate(ticketId: string, message: string) {
  const trimmed = message.trim();
  if (trimmed.length < 2) return;
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Melding fra verkstedet — ${ctx.ticketNumber}`,
        heading: "Melding fra verkstedet",
        preheader: "Du har fått en oppdatering du bør lese.",
        paragraphs: [
          `Verkstedet har skrevet til deg på ${ctx.ticketNumber}. Les teksten under. Du kan svare på statussiden.`,
        ],
        quote: trimmed,
      }),
      sms: smsLine(
        ctx,
        `Melding på ${ctx.ticketNumber}: ${trimmed.slice(0, 140)}${trimmed.length > 140 ? "…" : ""} Les og svar på statuslenken.`,
      ),
    })),
  );
}

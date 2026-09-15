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
  return `${greeting(ctx.customerName)}. ${line} ${publicStatusUrl(ctx.token)}`;
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
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Serviceordre ${ctx.ticketNumber} er opprettet`,
        heading: "Serviceordre opprettet",
        preheader: `Vi har registrert ${ctx.ticketNumber}.`,
        paragraphs:
          ctx.inboundMethod === "POST"
            ? [
                "Vi har registrert saken.",
                "Vent på oppdatering via e-post innen én virkedag før du sender enheten.",
                "Du følger status via lenken under.",
              ]
            : [
                "Vi har registrert saken.",
                `Lever enheten hos oss på ${workshopAddressOneLine()}. ${WORKSHOP.hoursLabel}.`,
                "Velg dato og timeslot på innleveringssiden, og følg status via lenken under.",
              ],
      }),
      sms:
        ctx.inboundMethod === "POST"
          ? smsLine(
              ctx,
              `Serviceordre ${ctx.ticketNumber} er opprettet. Vent på e-post innen én virkedag før du sender.`,
            )
          : smsLine(
              ctx,
              `Serviceordre ${ctx.ticketNumber} er opprettet. Lever inn hos oss ${WORKSHOP.hoursLabel}.`,
            ),
    })),
  );
}

export function notifyDeviceReceived(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Vi har mottatt enheten — ${ctx.ticketNumber}`,
        heading: "Enheten er mottatt",
        preheader: "Telefonen er tatt inn i verkstedet.",
        paragraphs: [
          "Vi har tatt imot enheten og jobber videre med saken.",
          "Status oppdateres fortløpende på kundelinken.",
        ],
      }),
      sms: smsLine(
        ctx,
        `Vi har mottatt enheten. ${ctx.ticketNumber} er under arbeid.`,
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
        preheader: "Saken venter på tilbakemelding.",
        paragraphs: [
          "Diagnose eller pris er klar, og vi trenger en tilbakemelding før vi fortsetter.",
          "Åpne statussiden for detaljer og for å svare.",
        ],
      }),
      sms: smsLine(
        ctx,
        `Vi venter på deg for ${ctx.ticketNumber}. Åpne statussiden for å svare.`,
      ),
    })),
  );
}

export function notifyReadyForPickup(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => {
      const byPost = ctx.outboundMethod === "POST";
      return {
        mail: buildMail(ctx, {
          subject: byPost
            ? `Enheten sendes med post — ${ctx.ticketNumber}`
            : `Klar for henting — ${ctx.ticketNumber}`,
          heading: byPost ? "Sendes med post" : "Klar for henting",
          preheader: byPost
            ? "Vi sender enheten i retur."
            : "Telefonen kan hentes.",
          paragraphs: byPost
            ? [
                "Jobben er ferdig, og enheten sendes i retur med post.",
                "Du ser status på kundelinken.",
              ]
            : [
                "Jobben er ferdig. Enheten kan hentes i butikk.",
                "Du ser status på kundelinken.",
              ],
        }),
        sms: smsLine(
          ctx,
          byPost
            ? `Jobben er ferdig. ${ctx.ticketNumber} sendes med post.`
            : `Jobben er ferdig. ${ctx.ticketNumber} kan hentes i butikk.`,
        ),
      };
    }),
  );
}

export function notifyRepairCompleted(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Reparasjonen er ferdig — ${ctx.ticketNumber}`,
        heading: "Ferdig",
        preheader: `${ctx.ticketNumber} er fullført.`,
        paragraphs: [
          "Saken er merket som fullført.",
          "Statussiden ligger fortsatt åpen hvis du trenger den.",
        ],
      }),
      sms: smsLine(ctx, `${ctx.ticketNumber} er merket som ferdig.`),
    })),
  );
}

export function notifyStaffUpdate(ticketId: string, message: string) {
  const trimmed = message.trim();
  if (trimmed.length < 2) return;
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => ({
      mail: buildMail(ctx, {
        subject: `Ny melding fra verkstedet — ${ctx.ticketNumber}`,
        heading: "Ny melding",
        preheader: "Verkstedet har sendt en oppdatering.",
        paragraphs: ["Verkstedet har skrevet dette:"],
        quote: trimmed,
      }),
      sms: smsLine(
        ctx,
        `Ny melding på ${ctx.ticketNumber}: ${trimmed.slice(0, 120)}`,
      ),
    })),
  );
}

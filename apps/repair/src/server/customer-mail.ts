import { after } from "next/server";
import { eq } from "drizzle-orm";
import { customers, devices, repairTickets } from "@/db/schema";
import { getDb } from "@/lib/db";
import { escapeHtml } from "@/lib/mail-html";
import { customerMailLayout } from "@/lib/mail-layout";
import {
  isSendableCustomerEmail,
  publicStatusUrl,
  sendCustomerEmail,
  type OutboundMail,
} from "@/lib/mail";

type MailContext = {
  ticketNumber: string;
  token: string;
  outboundMethod: "IN_PERSON" | "POST";
  customerName: string;
  customerEmail: string;
  deviceLabel: string;
};

function enqueue(task: () => Promise<void>) {
  const run = () =>
    task().catch((err) => {
      console.error("==> Kundemail feilet", err);
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
      outboundMethod: repairTickets.outboundMethod,
      customerName: customers.name,
      customerEmail: customers.email,
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
  if (!isSendableCustomerEmail(row.customerEmail)) return null;

  const deviceLabel = [row.brand, row.model, row.variant]
    .filter(Boolean)
    .join(" ");

  return {
    ticketNumber: row.ticketNumber,
    token: row.token,
    outboundMethod: row.outboundMethod,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
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

async function sendForTicket(
  ticketId: string,
  compose: (ctx: MailContext) => OutboundMail,
) {
  const ctx = await loadContext(ticketId);
  if (!ctx) return;
  await sendCustomerEmail(compose(ctx));
}

export function notifyServiceOrderCreated(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) =>
      buildMail(ctx, {
        subject: `Serviceordre ${ctx.ticketNumber} er opprettet`,
        heading: "Serviceordre opprettet",
        preheader: `Vi har registrert ${ctx.ticketNumber}.`,
        paragraphs: [
          "Vi har registrert saken. Vi tar den inn i verkstedet når enheten er levert.",
          "Du følger status og kan sende melding via lenken under.",
        ],
      }),
    ),
  );
}

export function notifyDeviceReceived(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) =>
      buildMail(ctx, {
        subject: `Vi har mottatt enheten — ${ctx.ticketNumber}`,
        heading: "Enheten er mottatt",
        preheader: "Telefonen er tatt inn i verkstedet.",
        paragraphs: [
          "Vi har tatt imot enheten og jobber videre med saken.",
          "Status oppdateres fortløpende på kundelinken.",
        ],
      }),
    ),
  );
}

export function notifyWaitingForCustomer(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) =>
      buildMail(ctx, {
        subject: `Vi venter på deg — ${ctx.ticketNumber}`,
        heading: "Vi venter på deg",
        preheader: "Saken venter på tilbakemelding.",
        paragraphs: [
          "Diagnose eller pris er klar, og vi trenger en tilbakemelding før vi fortsetter.",
          "Åpne statussiden for detaljer og for å svare.",
        ],
      }),
    ),
  );
}

export function notifyReadyForPickup(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) => {
      const byPost = ctx.outboundMethod === "POST";
      return buildMail(ctx, {
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
      });
    }),
  );
}

export function notifyRepairCompleted(ticketId: string) {
  enqueue(() =>
    sendForTicket(ticketId, (ctx) =>
      buildMail(ctx, {
        subject: `Reparasjonen er ferdig — ${ctx.ticketNumber}`,
        heading: "Ferdig",
        preheader: `${ctx.ticketNumber} er fullført.`,
        paragraphs: [
          "Saken er merket som fullført.",
          "Statussiden ligger fortsatt åpen hvis du trenger den.",
        ],
      }),
    ),
  );
}

export function notifyStaffUpdate(ticketId: string, message: string) {
  const trimmed = message.trim();
  if (trimmed.length < 2) return;
  enqueue(() =>
    sendForTicket(ticketId, (ctx) =>
      buildMail(ctx, {
        subject: `Ny melding fra verkstedet — ${ctx.ticketNumber}`,
        heading: "Ny melding",
        preheader: "Verkstedet har sendt en oppdatering.",
        paragraphs: ["Verkstedet har skrevet dette:"],
        quote: trimmed,
      }),
    ),
  );
}

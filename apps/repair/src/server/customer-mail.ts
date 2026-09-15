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
      return {
        mail: buildMail(ctx, {
          subject: `Serviceordre ${ctx.ticketNumber} er opprettet`,
          heading: "Serviceordre opprettet",
          preheader: byPost
            ? "Ikke send telefonen ennå. Vent på e-post med sending."
            : "Book innlevering og kom med telefonen i åpningstiden.",
          paragraphs: byPost
            ? [
                `Vi har registrert serviceordre ${ctx.ticketNumber}${deviceBit(ctx)}.`,
                "Du valgte å sende telefonen med post. Ikke send den ennå — vi har ikke gitt deg adresse eller hvordan pakken skal merkes.",
                "Innen én virkedag (mandag–fredag, ikke helligdag) sender vi e-post med hvor du skal sende, og hva du gjør videre. Når den e-posten er kommet, kan du sende enheten.",
                "Jobben starter når pakken er framme hos oss. Status og melding til verkstedet: lenken under.",
              ]
            : [
                `Vi har registrert serviceordre ${ctx.ticketNumber}${deviceBit(ctx)}.`,
                "Du valgte å levere telefonen hos oss. Vi tar den ikke inn i verkstedet før den er fysisk levert.",
                `Adresse: ${workshopAddressOneLine()}. Åpent ${WORKSHOP.hoursLabel}.`,
                "Velg dato og timeslot på innleveringssiden (samme lenke som status). Ta med telefonen til avtalt tid.",
              ],
        }),
        sms: byPost
          ? smsLine(
              ctx,
              `Serviceordre ${ctx.ticketNumber} er opprettet. Du valgte post: ikke send telefonen ennå. Vi e-poster innen 1 virkedag (man–fre) med hvor du skal sende.`,
            )
          : smsLine(
              ctx,
              `Serviceordre ${ctx.ticketNumber} er opprettet. Lever telefonen hos oss, ${workshopAddressOneLine()}, ${WORKSHOP.hoursLabel}. Book tid på statuslenken.`,
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
        preheader: "Telefonen er inne hos oss. Jobben kan starte.",
        paragraphs: [
          `Telefonen${deviceBit(ctx)} er nå fysisk inne hos oss på saken ${ctx.ticketNumber}. Det gjelder enten innlevering i butikk eller at postpakken er kommet fram.`,
          "Vi tar den inn i verkstedet og går videre med undersøkelse eller reparasjon. Du trenger ikke gjøre noe nå.",
          "Nye oppdateringer kommer på e-post, SMS og statuslenken under.",
        ],
      }),
      sms: smsLine(
        ctx,
        `Vi har fått inn telefonen på ${ctx.ticketNumber}. Den er hos oss og jobben kan starte. Du trenger ikke gjøre noe nå.`,
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
                "Du valgte retur med post. Vi sender telefonen til adressen du oppga da du opprettet saken. Du skal ikke møte opp hos oss for å hente den.",
                "Når sendingen er registrert, oppdaterer vi status. Sporing kommer der eller på e-post når vi har den.",
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
            ? `Jobben på ${ctx.ticketNumber} er ferdig. Du valgte post-retur: vi sender telefonen til adressen din. Ikke møt opp for henting.`
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

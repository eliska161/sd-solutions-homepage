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
  type MailFile,
  type OutboundMail,
} from "@/lib/mail";
import { isSendablePhone } from "@/lib/phone";
import { allocatePublicShortCode } from "@/lib/public-link";
import { sendCustomerSms } from "@/lib/sms";
import { customerSmsPing, customerSmsPickupPin, customerSmsRepairDone } from "@/lib/sms-text";
import { GOOGLE_REVIEW_URL } from "@/lib/google-review";
import { loadCustomerPdfFiles } from "@/lib/store-customer-pdf";
import { createAndStoreReceiptPdf } from "@/server/customer-receipt";
import { ensurePickupCheckout } from "@/server/payments";
import { ensurePickupPin } from "@/lib/sequences";

type MailContext = {
  ticketNumber: string;
  token: string;
  shortCode: string;
  inboundMethod: "IN_PERSON" | "POST";
  outboundMethod: "IN_PERSON" | "POST";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deviceLabel: string;
  returnTrackingNumber: string | null;
  pickupPin: string | null;
};

async function enqueue(task: () => Promise<void>) {
  try {
    await task();
  } catch (err) {
    console.error("==> Kundemelding feilet", err);
  }
}

async function loadContext(ticketId: string): Promise<MailContext | null> {
  const db = getDb();
  const [row] = await db
    .select({
      ticketNumber: repairTickets.ticketNumber,
      token: repairTickets.publicAccessToken,
      shortCode: repairTickets.publicShortCode,
      inboundMethod: repairTickets.inboundMethod,
      outboundMethod: repairTickets.outboundMethod,
      returnTrackingNumber: repairTickets.returnTrackingNumber,
      pickupPin: repairTickets.pickupPin,
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

  let shortCode = row.shortCode;
  if (!shortCode) {
    shortCode = await allocatePublicShortCode();
    await db
      .update(repairTickets)
      .set({ publicShortCode: shortCode, updatedAt: new Date() })
      .where(eq(repairTickets.id, ticketId));
  }

  const deviceLabel = [row.brand, row.model, row.variant]
    .filter(Boolean)
    .join(" ");

  return {
    ticketNumber: row.ticketNumber,
    token: row.token,
    shortCode,
    inboundMethod: row.inboundMethod,
    outboundMethod: row.outboundMethod,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    deviceLabel,
    returnTrackingNumber: row.returnTrackingNumber?.trim() || null,
    pickupPin: row.pickupPin && /^\d{6}$/.test(row.pickupPin) ? row.pickupPin : null,
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
    files?: MailFile[];
    extraCtas?: { label: string; url: string }[];
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

  const extraText = (opts.extraCtas ?? []).flatMap((cta) => [
    "",
    `${cta.label}: ${cta.url}`,
  ]);

  const text = [
    `${greeting(ctx.customerName)},`,
    "",
    ...opts.paragraphs,
    opts.quote ? `\n${opts.quote}\n` : "",
    `Status: ${statusUrl}`,
    ...extraText,
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
      extraCtas: opts.extraCtas,
    }),
    files: opts.files,
  };
}

function smsLine(ctx: MailContext, verb: string) {
  return customerSmsPing({
    name: ctx.customerName,
    ticketNumber: ctx.ticketNumber,
    verb,
    url: publicStatusUrl(ctx.shortCode),
  });
}

function smsDone(ctx: MailContext, verb: string) {
  return customerSmsRepairDone({
    name: ctx.customerName,
    ticketNumber: ctx.ticketNumber,
    verb,
    url: publicStatusUrl(ctx.shortCode),
  });
}

const googleReviewCta = {
  label: "Legg igjen anmeldelse",
  url: GOOGLE_REVIEW_URL,
};

const googleReviewParagraph =
  "Vi setter pris på om du legger igjen en anmeldelse på Google.";

function deviceBit(ctx: MailContext) {
  return ctx.deviceLabel.trim() ? ` (${ctx.deviceLabel})` : "";
}

async function sendForTicket(
  ticketId: string,
  compose: (
    ctx: MailContext,
  ) =>
    | { mail: OutboundMail; sms: string }
    | Promise<{ mail: OutboundMail; sms: string }>,
) {
  const ctx = await loadContext(ticketId);
  if (!ctx) return;
  const { mail, sms } = await compose(ctx);
  if (isSendableCustomerEmail(ctx.customerEmail)) {
    await sendCustomerEmail(mail);
  }
  if (isSendablePhone(ctx.customerPhone)) {
    await sendCustomerSms(ctx.customerPhone, sms);
  }
}

export async function notifyServiceOrderCreated(ticketId: string) {
  await enqueue(async () =>
    sendForTicket(ticketId, async (ctx) => {
      const byPost = ctx.inboundMethod === "POST";
      const address = workshopAddressOneLine();
      const files = await loadCustomerPdfFiles(ticketId, ["TERMS"]);
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
                "Signert ordrebekreftelse med vilkår ligger vedlagt som PDF.",
                "Jobben starter når pakken er framme hos oss. Status: lenken under.",
              ]
            : [
                `Vi har registrert serviceordre ${ctx.ticketNumber}${deviceBit(ctx)}.`,
                "Du valgte å levere telefonen hos oss. Vi tar den ikke inn i verkstedet før den er fysisk levert.",
                `Adresse: ${address}. Åpent ${WORKSHOP.hoursLabel}.`,
                "Signert ordrebekreftelse med vilkår ligger vedlagt som PDF.",
                "Velg dato og timeslot på innleveringssiden (samme lenke som status). Ta med telefonen til avtalt tid.",
              ],
          files,
        }),
        sms: smsLine(
          ctx,
          byPost
            ? "er opprettet. Send telefonen. Adresse og merking står i lenken."
            : "er opprettet",
        ),
      };
    }),
  );
}

export async function notifyDeviceReceived(ticketId: string) {
  await enqueue(() =>
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
      sms: smsLine(ctx, "er mottatt"),
    })),
  );
}

export async function notifyWaitingForCustomer(ticketId: string) {
  await enqueue(() =>
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
      sms: smsLine(ctx, "venter på svar. Åpne lenken og svar der."),
    })),
  );
}

export async function notifyReadyForPickup(ticketId: string) {
  await enqueue(async () =>
    sendForTicket(ticketId, async (ctx) => {
      const byPost = ctx.outboundMethod === "POST";
      const tracking = ctx.returnTrackingNumber;
      const trackingMail = tracking
        ? [`Sporingsnummer: ${tracking}.`]
        : [];
      const pin = byPost ? null : await ensurePickupPin(ticketId);
      const pinLine = pin
        ? `Hentepin til locker: ${pin}. Skriv den på kiosken når du henter — etter at du har betalt.`
        : null;
      const checkout = await ensurePickupCheckout(ticketId);
      const payUrl = checkout.ok && checkout.url ? checkout.url : publicStatusUrl(ctx.shortCode);
      const payCta =
        checkout.ok && !checkout.paid
          ? [{ label: "Betal nå", url: payUrl }]
          : [];
      return {
        mail: buildMail(ctx, {
          subject: byPost
            ? `Vi sender telefonen i retur — ${ctx.ticketNumber}`
            : `Klar for henting — ${ctx.ticketNumber}`,
          heading: byPost ? "Sendes i retur med post" : "Klar for henting",
          preheader: byPost
            ? "Jobben er ferdig. Betal, så sender vi telefonen tilbake."
            : pin
              ? `Jobben er ferdig. Betal først. Hentepin ${pin}.`
              : "Jobben er ferdig. Betal, så kan du hente.",
          paragraphs: byPost
            ? [
                `Jobben på ${ctx.ticketNumber}${deviceBit(ctx)} er ferdig.`,
                checkout.ok && checkout.paid
                  ? "Betalingen er registrert. Vi sender telefonen tilbake til adressen du oppga."
                  : "Betal via lenken før vi sender. Kvittering kommer på e-post når betalingen er gjennomført.",
                ...trackingMail,
                googleReviewParagraph,
              ]
            : [
                `Jobben på ${ctx.ticketNumber}${deviceBit(ctx)} er ferdig.`,
                checkout.ok && checkout.paid
                  ? "Betalingen er registrert."
                  : "Betal via lenken før du henter. Lockeren åpner ikke før det er betalt.",
                pinLine ?? "Ta med legitimasjon. Si fra om saksnummeret i skranken.",
                `Hent hos oss: ${workshopAddressOneLine()}. Åpent ${WORKSHOP.hoursLabel}.`,
                googleReviewParagraph,
              ],
          extraCtas: [...payCta, googleReviewCta],
        }),
        sms: pin
          ? customerSmsPickupPin({
              name: ctx.customerName,
              ticketNumber: ctx.ticketNumber,
              pin,
              url: publicStatusUrl(ctx.shortCode),
            })
          : smsDone(
              ctx,
              byPost ? "er ferdig. Vi sender den tilbake." : "er klar for henting.",
            ),
      };
    }),
  );
}

export async function notifyPaymentReceived(
  ticketId: string,
  paymentLabel = "Betalt med kort (Stripe)",
) {
  await enqueue(async () =>
    sendForTicket(ticketId, async (ctx) => {
      const invoice = await createAndStoreReceiptPdf(ticketId, paymentLabel);
      return {
        mail: buildMail(ctx, {
          subject: `Kvittering — ${ctx.ticketNumber}`,
          heading: "Takk for betalingen",
          preheader: `Kvittering for ${ctx.ticketNumber}.`,
          paragraphs: [
            `Vi har registrert betaling for ${ctx.ticketNumber}${deviceBit(ctx)}.`,
            "Kvitteringen ligger vedlagt som PDF.",
            ctx.outboundMethod === "POST"
              ? "Vi sender telefonen når returen er klar."
              : "Du kan hente i locker med PIN-koden du har fått, eller i skranken.",
          ],
          files: invoice ? [invoice] : [],
        }),
        sms: smsLine(ctx, "er betalt. Kvittering er sendt på e-post."),
      };
    }),
  );
}

export async function notifyRepairCompleted(ticketId: string) {
  await enqueue(async () =>
    sendForTicket(ticketId, async (ctx) => {
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
            "Kvitteringen fant du på e-post da betalingen ble registrert. Statuslenken virker fortsatt.",
            googleReviewParagraph,
          ],
          extraCtas: [googleReviewCta],
        }),
        sms: smsDone(ctx, "er ferdig"),
      };
    }),
  );
}

export async function notifyStaffUpdate(ticketId: string, message: string) {
  const trimmed = message.trim();
  if (trimmed.length < 2) return;
  await enqueue(() =>
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
      sms: smsLine(ctx, "ny oppdatering. Les i lenken."),
    })),
  );
}

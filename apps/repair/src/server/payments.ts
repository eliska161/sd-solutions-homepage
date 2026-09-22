import { eq } from "drizzle-orm";
import bwipjs from "bwip-js/node";
import { customers, devices, repairTickets } from "@/db/schema";
import { addActivity } from "@/lib/activity";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { LEGAL_PARTY } from "@/lib/legal-catalog";
import { publicAppOrigin, publicStatusUrl } from "@/lib/mail";
import { formatNokFromOre, vatFromGrossOre } from "@/lib/money";
import { allocatePublicShortCode, publicTicketLinkFilter } from "@/lib/public-link";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { loadTicketCharge } from "@/lib/ticket-totals";

export type KioskPayment = {
  paid: boolean;
  paymentLabel: string;
  totalOre: number;
  totalLabel: string;
  netLabel?: string;
  vatLabel?: string;
  payUrl: string | null;
  payQr: string | null;
  statusUrl?: string | null;
  statusQr?: string | null;
  customerName?: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
  authCode?: string | null;
  transactionId?: string | null;
  paymentDetail?: string | null;
  chargeLines: { name: string; amountLabel: string }[];
};

async function shortLink(ticketId: string, token: string, existing: string | null) {
  if (existing) return existing;
  const db = getDb();
  const code = await allocatePublicShortCode();
  await db
    .update(repairTickets)
    .set({ publicShortCode: code, updatedAt: new Date() })
    .where(eq(repairTickets.id, ticketId));
  return code;
}

export async function markTicketPaid(input: {
  ticketId: string;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  source: "stripe" | "staff";
  skipNotify?: boolean;
}) {
  const db = getDb();
  const [before] = await db
    .select({
      id: repairTickets.id,
      paymentStatus: repairTickets.paymentStatus,
      ticketNumber: repairTickets.ticketNumber,
    })
    .from(repairTickets)
    .where(eq(repairTickets.id, input.ticketId))
    .limit(1);
  if (!before) return { ok: false as const, error: "Saken ble ikke funnet" };
  if (before.paymentStatus === "PAID") return { ok: true as const, already: true };

  const paidAt = new Date();
  await db
    .update(repairTickets)
    .set({
      paymentStatus: "PAID",
      paidAt,
      updatedAt: paidAt,
      ...(input.sessionId ? { stripeCheckoutSessionId: input.sessionId } : {}),
      ...(input.paymentIntentId ? { stripePaymentIntentId: input.paymentIntentId } : {}),
    })
    .where(eq(repairTickets.id, input.ticketId));

  await writeAuditLog({
    actorId: null,
    entityType: "repair_ticket",
    entityId: input.ticketId,
    action: input.source === "stripe" ? "payment_stripe" : "payment_staff",
    after: { paymentStatus: "PAID" },
  });
  await addActivity({
    entityType: "repair_ticket",
    entityId: input.ticketId,
    type: "repair.payment",
    message: input.source === "stripe" ? "Betalt med Stripe" : "Merket som betalt",
    actorId: null,
    meta: { source: input.source },
  });
  if (!input.skipNotify) {
    const { notifyPaymentReceived } = await import("@/server/customer-mail");
    await notifyPaymentReceived(
      input.ticketId,
      input.source === "stripe" ? "Betalt med kort (Stripe)" : "Betalt i butikk",
    );
  }
  return { ok: true as const, already: false };
}

export async function ensurePickupCheckout(ticketId: string) {
  const charge = await loadTicketCharge(ticketId);
  const db = getDb();
  const [ticket] = await db
    .select({
      id: repairTickets.id,
      ticketNumber: repairTickets.ticketNumber,
      paymentStatus: repairTickets.paymentStatus,
      publicAccessToken: repairTickets.publicAccessToken,
      publicShortCode: repairTickets.publicShortCode,
      stripeCheckoutSessionId: repairTickets.stripeCheckoutSessionId,
      stripeCheckoutUrl: repairTickets.stripeCheckoutUrl,
      customerEmail: customers.email,
      customerName: customers.name,
      brand: devices.brand,
      model: devices.model,
    })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .innerJoin(devices, eq(devices.id, repairTickets.deviceId))
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (!ticket) return { ok: false as const, error: "Saken ble ikke funnet" };
  if (ticket.paymentStatus === "PAID") {
    return { ok: true as const, paid: true as const, url: null as string | null };
  }
  if (charge.totalOre <= 0) {
    await markTicketPaid({ ticketId, source: "staff", skipNotify: true });
    return { ok: true as const, paid: true as const, url: null as string | null };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe er ikke satt opp", url: null as string | null };
  }

  if (ticket.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(ticket.stripeCheckoutSessionId);
      if (existing.payment_status === "paid" || existing.status === "complete") {
        await markTicketPaid({
          ticketId,
          sessionId: existing.id,
          paymentIntentId:
            typeof existing.payment_intent === "string" ? existing.payment_intent : existing.payment_intent?.id,
          source: "stripe",
        });
        return { ok: true as const, paid: true as const, url: null as string | null };
      }
      if (existing.status === "open" && existing.url) {
        if (existing.url !== ticket.stripeCheckoutUrl) {
          await db
            .update(repairTickets)
            .set({ stripeCheckoutUrl: existing.url, updatedAt: new Date() })
            .where(eq(repairTickets.id, ticketId));
        }
        return { ok: true as const, paid: false as const, url: existing.url };
      }
    } catch (err) {
      console.error("==> Stripe session retrieve", err);
    }
  }

  const code = await shortLink(ticketId, ticket.publicAccessToken, ticket.publicShortCode);
  const origin = publicAppOrigin();
  const statusPath = `/s/${code}`;
  const device = [ticket.brand, ticket.model].filter(Boolean).join(" ");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "nb",
    customer_email: ticket.customerEmail?.includes("@") ? ticket.customerEmail : undefined,
    client_reference_id: ticketId,
    metadata: {
      ticketId,
      ticketNumber: ticket.ticketNumber,
    },
    success_url: `${origin}${statusPath}?betalt=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${statusPath}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "nok",
          unit_amount: charge.totalOre,
          product_data: {
            name: `Reparasjon ${ticket.ticketNumber}`,
            description: device || undefined,
          },
        },
      },
    ],
    payment_intent_data: {
      description: `SD Solutions ${ticket.ticketNumber}`,
      metadata: { ticketId, ticketNumber: ticket.ticketNumber },
    },
  });

  await db
    .update(repairTickets)
    .set({
      stripeCheckoutSessionId: session.id,
      stripeCheckoutUrl: session.url,
      updatedAt: new Date(),
    })
    .where(eq(repairTickets.id, ticketId));

  return { ok: true as const, paid: false as const, url: session.url };
}

export async function confirmStripeCheckout(sessionId: string) {
  const stripe = getStripe();
  if (!stripe || !sessionId) return { ok: false as const };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const ticketId =
    session.metadata?.ticketId ||
    session.client_reference_id ||
    (await findTicketIdBySession(session.id));
  if (!ticketId) return { ok: false as const };
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { ok: false as const };
  }
  return markTicketPaid({
    ticketId,
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    source: "stripe",
  });
}

export async function confirmStripeCheckoutForToken(token: string, sessionId: string) {
  const filter = publicTicketLinkFilter(token);
  if (!filter || !sessionId) return;
  const db = getDb();
  const [row] = await db
    .select({ id: repairTickets.id })
    .from(repairTickets)
    .where(filter)
    .limit(1);
  if (!row) return;
  await confirmStripeCheckout(sessionId);
}

async function findTicketIdBySession(sessionId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: repairTickets.id })
    .from(repairTickets)
    .where(eq(repairTickets.stripeCheckoutSessionId, sessionId))
    .limit(1);
  return row?.id ?? null;
}

export async function syncTicketPayment(ticketId: string) {
  const db = getDb();
  const [ticket] = await db
    .select({
      paymentStatus: repairTickets.paymentStatus,
      stripeCheckoutSessionId: repairTickets.stripeCheckoutSessionId,
    })
    .from(repairTickets)
    .where(eq(repairTickets.id, ticketId))
    .limit(1);
  if (!ticket || ticket.paymentStatus === "PAID") return;
  if (!ticket.stripeCheckoutSessionId || !stripeConfigured()) return;
  try {
    await confirmStripeCheckout(ticket.stripeCheckoutSessionId);
  } catch (err) {
    console.error("==> Stripe sync", err);
  }
}

async function qrDataUrl(text: string) {
  try {
    const png = await bwipjs.toBuffer({
      bcid: "qrcode",
      text,
      scale: 8,
      includetext: false,
      backgroundcolor: "FFFFFF",
    });
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function kioskPayUrl(code: string) {
  return `${LEGAL_PARTY.web}/p/${code}`;
}

function cardBrandLabel(brand: string | undefined | null) {
  const key = (brand || "").toLowerCase();
  if (key === "visa") return "Visa";
  if (key === "mastercard") return "Mastercard";
  if (key === "amex" || key === "american express") return "American Express";
  if (key === "diners") return "Diners";
  if (key === "discover") return "Discover";
  if (key === "unionpay") return "UnionPay";
  return brand ? brand[0].toUpperCase() + brand.slice(1) : null;
}

export async function stripePaymentSlip(input: {
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
}): Promise<{
  cardBrand: string | null;
  cardLast4: string | null;
  authCode: string | null;
  transactionId: string | null;
  paymentDetail: string | null;
}> {
  const empty = {
    cardBrand: null as string | null,
    cardLast4: null as string | null,
    authCode: null as string | null,
    transactionId: null as string | null,
    paymentDetail: null as string | null,
  };
  const stripe = getStripe();
  if (!stripe) return empty;
  try {
    let intentId = input.paymentIntentId;
    if (!intentId && input.checkoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(input.checkoutSessionId, {
        expand: ["payment_intent"],
      });
      const pi = session.payment_intent;
      intentId = typeof pi === "string" ? pi : pi?.id ?? null;
    }
    if (!intentId) return empty;
    const intent = await stripe.paymentIntents.retrieve(intentId, {
      expand: ["latest_charge"],
    });
    const charge =
      typeof intent.latest_charge === "object" && intent.latest_charge
        ? intent.latest_charge
        : null;
    const card = charge?.payment_method_details?.card;
    const present = charge?.payment_method_details?.card_present;
    const last4 = card?.last4 || present?.last4 || null;
    const brand = cardBrandLabel(card?.brand || present?.brand);
    const auth =
      (present && "authorization_code" in present
        ? String(present.authorization_code || "")
        : "") || null;
    const transactionId = charge?.id || intent.id;
    const paymentDetail = last4
      ? `${brand || "Kort"} **** ${last4}`
      : brand || "Kort";
    return {
      cardBrand: brand,
      cardLast4: last4,
      authCode: auth || null,
      transactionId,
      paymentDetail,
    };
  } catch (err) {
    console.error("==> Stripe receipt slip", err);
    return empty;
  }
}

export async function kioskPaymentForTicket(ticketId: string): Promise<KioskPayment> {
  await syncTicketPayment(ticketId);
  const charge = await loadTicketCharge(ticketId);
  const db = getDb();
  const [ticket] = await db
    .select({
      paymentStatus: repairTickets.paymentStatus,
      stripeCheckoutUrl: repairTickets.stripeCheckoutUrl,
      stripeCheckoutSessionId: repairTickets.stripeCheckoutSessionId,
      stripePaymentIntentId: repairTickets.stripePaymentIntentId,
      publicAccessToken: repairTickets.publicAccessToken,
      publicShortCode: repairTickets.publicShortCode,
      customerName: customers.name,
    })
    .from(repairTickets)
    .innerJoin(customers, eq(customers.id, repairTickets.customerId))
    .where(eq(repairTickets.id, ticketId))
    .limit(1);

  let paid = ticket?.paymentStatus === "PAID" || charge.totalOre <= 0;
  let payUrl: string | null = null;
  const code = ticket
    ? await shortLink(ticketId, ticket.publicAccessToken, ticket.publicShortCode)
    : null;
  if (!paid) {
    const checkout = await ensurePickupCheckout(ticketId);
    if (checkout.ok && checkout.paid) {
      paid = true;
    } else {
      payUrl = code ? kioskPayUrl(code) : null;
    }
  }

  const lines = [
    ...charge.lines.map((line) => ({
      name: line.name,
      amountLabel: formatNokFromOre(line.amountOre),
    })),
  ];
  if (charge.discountOre > 0) {
    lines.push({
      name: charge.discountLabel || "Rabatt",
      amountLabel: `−${formatNokFromOre(charge.discountOre)}`,
    });
  }
  if (charge.postageOre > 0) {
    lines.push({
      name: "Returporto",
      amountLabel: formatNokFromOre(charge.postageOre),
    });
  }

  const vat = vatFromGrossOre(charge.totalOre);
  const statusUrl = code ? publicStatusUrl(code) : null;
  const slip = paid
    ? await stripePaymentSlip({
        paymentIntentId: ticket?.stripePaymentIntentId ?? null,
        checkoutSessionId: ticket?.stripeCheckoutSessionId ?? null,
      })
    : {
        cardBrand: null,
        cardLast4: null,
        authCode: null,
        transactionId: null,
        paymentDetail: null,
      };

  return {
    paid,
    paymentLabel: paid
      ? PAYMENT_STATUS_LABELS.PAID
      : PAYMENT_STATUS_LABELS[ticket?.paymentStatus || "UNPAID"],
    totalOre: charge.totalOre,
    totalLabel: formatNokFromOre(charge.totalOre),
    netLabel: vat.netLabel,
    vatLabel: vat.vatLabel,
    payUrl,
    payQr: payUrl ? await qrDataUrl(payUrl) : null,
    statusUrl,
    statusQr: statusUrl ? await qrDataUrl(statusUrl) : null,
    customerName: ticket?.customerName || "",
    cardBrand: slip.cardBrand,
    cardLast4: slip.cardLast4,
    authCode: slip.authCode,
    transactionId: slip.transactionId,
    paymentDetail: paid
      ? slip.paymentDetail || (ticket?.stripePaymentIntentId ? "Kort" : "Betalt i butikk")
      : null,
    chargeLines: lines,
  };
}

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  confirmInPersonStripePayment,
  confirmStripeCheckout,
} from "@/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return new NextResponse("stripe not configured", { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("missing signature", { status: 400 });
  const raw = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("==> Stripe webhook signature", err);
    return new NextResponse("invalid signature", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (typeof session.id === "string") {
      await confirmStripeCheckout(session.id);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const present = intent.payment_method_types?.includes("card_present");
    const channel = intent.metadata?.channel;
    if (present || channel === "tap_to_pay") {
      await confirmInPersonStripePayment({
        paymentIntentId: intent.id,
        amountOre: intent.amount,
        description: intent.description,
        metadata: intent.metadata,
      });
    }
  }

  if (event.type === "charge.succeeded") {
    const charge = event.data.object;
    const type = charge.payment_method_details?.type;
    if (type === "card_present") {
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      await confirmInPersonStripePayment({
        paymentIntentId: pi,
        amountOre: charge.amount,
        description: charge.description,
        metadata: charge.metadata,
      });
    }
  }

  return NextResponse.json({ received: true });
}

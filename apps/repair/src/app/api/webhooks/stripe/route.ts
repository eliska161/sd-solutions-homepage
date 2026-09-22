import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { confirmStripeCheckout } from "@/server/payments";

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

  return NextResponse.json({ received: true });
}

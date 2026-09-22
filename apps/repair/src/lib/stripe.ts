import Stripe from "stripe";

let client: Stripe | null | undefined;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function stripeTestMode() {
  return (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (client === undefined) {
    client = new Stripe(key);
  }
  return client;
}

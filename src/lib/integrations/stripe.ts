import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

export async function createCheckoutSession(
  customerId: string | undefined,
  priceId: string,
  orgId: string,
  successUrl: string,
  cancelUrl: string,
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { orgId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

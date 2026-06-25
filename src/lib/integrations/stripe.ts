/**
 * Stripe client for LeadScout billing.
 * Handles checkout sessions, subscriptions, and webhooks.
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY not configured");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

export const STRIPE_PRICES = {
  monthly: process.env.PRICE_MONTHLY || "",
  yearly: process.env.PRICE_YEARLY || "",
};

/**
 * Create a Stripe Customer for an organization.
 */
export async function createStripeCustomer(email: string, name?: string): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name: name || email,
  });
  return customer.id;
}

/**
 * Create a Stripe Checkout Session for subscription.
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>,
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Get subscription details from Stripe.
 */
export async function getStripeSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a Stripe subscription at period end.
 */
export async function cancelStripeSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Immediately cancel a Stripe subscription.
 */
export async function cancelStripeSubscriptionImmediately(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Verify Stripe webhook signature.
 */
export function verifyStripeWebhook(payload: string | Buffer, signature: string) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Handle Stripe webhook events.
 */
export function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return { action: "ACTIVATE", data: event.data.object as Stripe.Checkout.Session };
    case "customer.subscription.deleted":
      return { action: "CANCEL", data: event.data.object as Stripe.Subscription };
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.status === "past_due" || sub.status === "unpaid") {
        return { action: "PAYMENT_FAILED", data: sub };
      }
      if (sub.cancel_at_period_end) {
        return { action: "CANCEL", data: sub };
      }
      return { action: "UPDATE", data: sub };
    }
    case "invoice.payment_failed":
      return { action: "PAYMENT_FAILED", data: event.data.object as Stripe.Invoice };
    default:
      return { action: "UNKNOWN", data: event.data.object };
  }
}

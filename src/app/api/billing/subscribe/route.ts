import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, organizations, planConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, createStripeCustomer, STRIPE_PRICES } from "@/lib/integrations/stripe";

export const dynamic = "force-dynamic";

/* POST /api/billing/subscribe */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { planId } = await request.json();

  if (!planId || (planId !== "pro-monthly" && planId !== "pro-yearly")) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const dbPlanId = planId.replace(/-/g, "_");

  let priceId: string | null = null;
  try {
    const [config] = await db
      .select({ stripePriceId: planConfigs.stripePriceId })
      .from(planConfigs)
      .where(eq(planConfigs.id, dbPlanId))
      .limit(1);
    priceId = config?.stripePriceId ?? null;
  } catch {
    /* plan_configs table may not exist yet — fall back to env vars */
  }

  if (!priceId) {
    priceId = planId === "pro-yearly" ? STRIPE_PRICES.yearly : STRIPE_PRICES.monthly;
  }

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 },
    );
  }

  /* Get org details and existing subscription */
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);

  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, ctx.orgId))
    .limit(1);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leadscout.lat";

  try {
    /* Create or reuse Stripe customer */
    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer(
        ctx.user.email || "",
        org?.name,
      );
      /* Save customer ID */
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId })
        .where(eq(subscriptions.orgId, ctx.orgId));
    }

    const session = await createCheckoutSession(
      customerId,
      priceId,
      `${appUrl}/dashboard/settings/plans?success=true`,
      `${appUrl}/dashboard/settings/plans?cancelled=true`,
      { orgId: ctx.orgId },
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.sessionId,
    });
  } catch (e: any) {
    console.error("Stripe subscribe error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}

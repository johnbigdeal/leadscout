import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cancelStripeSubscription, getStripeSubscription } from "@/lib/integrations/stripe";
import { downgradeToFree } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, id))
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Cancel in Stripe if there's an active subscription
  if (sub.stripeSubId) {
    try {
      const stripeSub = await getStripeSubscription(sub.stripeSubId);
      if (stripeSub?.status === "active" || stripeSub?.status === "trialing") {
        await cancelStripeSubscription(sub.stripeSubId);
      }
    } catch (e: any) {
      console.error("Failed to cancel Stripe subscription:", e.message);
      // Continue with downgrade even if Stripe cancellation fails
    }
  }

  // Downgrade in DB
  await downgradeToFree(sub.orgId);

  return NextResponse.json({ ok: true, message: "Subscription cancelled and downgraded to Free" });
}

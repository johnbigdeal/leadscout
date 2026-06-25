import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPayPalSubscription } from "@/lib/integrations/paypal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const subs = await db
    .select({
      orgId: subscriptions.orgId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      paypalSubscriptionId: subscriptions.paypalSubscriptionId,
      paypalPlanId: subscriptions.paypalPlanId,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .leftJoin(organizations, eq(organizations.id, subscriptions.orgId));

  // Enrich with PayPal data for active Pro subscriptions
  const enriched = await Promise.all(
    subs.map(async (sub) => {
      if (sub.paypalSubscriptionId && sub.plan === "pro") {
        try {
          const paypalData = await getPayPalSubscription(sub.paypalSubscriptionId);
          return {
            ...sub,
            paypalStatus: paypalData?.status,
            paypalBillingInfo: paypalData?.billing_info,
          };
        } catch (e) {
          return { ...sub, paypalStatus: "error", paypalError: (e as Error).message };
        }
      }
      return sub;
    })
  );

  return NextResponse.json({ subscriptions: enriched });
}

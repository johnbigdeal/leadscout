import { NextResponse } from "next/server";
import { handlePayPalWebhook, verifyPayPalWebhook } from "@/lib/integrations/paypal";
import { upgradeToPro, downgradeToFree } from "@/lib/plans";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* POST /api/webhooks/paypal */
export async function POST(request: Request) {
  const body = await request.text();
  const headers = request.headers;

  /* Verify webhook (simplified - implement full verification in production) */
  if (!verifyPayPalWebhook(headers, body)) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event_type;
  const resource = event.resource;

  console.log("PayPal webhook:", eventType, resource.id);

  try {
    const { action, orgId } = await handlePayPalWebhook(eventType, resource);

    if (!orgId) {
      return NextResponse.json({ received: true });
    }

    switch (action) {
      case "ACTIVATE": {
        /* Subscription activated - upgrade to Pro */
        const billingInfo = resource.billing_info;
        const nextBillingTime = billingInfo?.next_billing_time
          ? new Date(billingInfo.next_billing_time)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); /* Default: 30 days */

        const payerId = resource.subscriber?.payer_id || resource.subscriber?.email_address || "";
        await upgradeToPro(
          orgId,
          resource.id,
          payerId,
          resource.plan_id,
          nextBillingTime,
        );
        break;
      }

      case "CANCEL": {
        /* Subscription cancelled - downgrade at period end */
        /* For now, downgrade immediately. In production, check currentPeriodEnd */
        await downgradeToFree(orgId);
        break;
      }

      case "SUSPEND": {
        /* Payment failed - mark as past_due but keep Pro temporarily */
        await db
          .update(subscriptions)
          .set({ status: "past_due" })
          .where(eq(subscriptions.orgId, orgId));
        break;
      }

      case "PAYMENT_FAILED": {
        /* Payment failed */
        await db
          .update(subscriptions)
          .set({ status: "past_due" })
          .where(eq(subscriptions.orgId, orgId));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("PayPal webhook error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

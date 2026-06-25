import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, verifyStripeWebhook, handleStripeWebhook } from "@/lib/integrations/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { upgradeToPro, downgradeToFree } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = verifyStripeWebhook(payload, signature);
  } catch (err: any) {
    console.error("Stripe webhook verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const result = handleStripeWebhook(event);

  try {
    switch (result.action) {
      case "ACTIVATE": {
        const session = result.data as any;
        const orgId = session.metadata?.orgId;
        const subscriptionId = session.subscription;

        if (!orgId || !subscriptionId) {
          console.error("Missing orgId or subscriptionId in checkout session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
        const subData = subscription as any;
        const currentPeriodEnd = subData.current_period_end 
          ? new Date(subData.current_period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await upgradeToPro(
          orgId,
          subscriptionId as string,
          session.customer as string,
          subscription.items.data[0]?.price.id || "",
          currentPeriodEnd,
        );

        console.log(`Activated Pro for org ${orgId}`);
        break;
      }

      case "CANCEL": {
        const subscription = result.data as any;
        const orgId = subscription.metadata?.orgId;

        if (!orgId) {
          /* Try to find by stripe subscription ID */
          const [sub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubId, subscription.id))
            .limit(1);
          if (sub) {
            await downgradeToFree(sub.orgId);
            console.log(`Downgraded org ${sub.orgId} after cancellation`);
          }
        } else {
          await downgradeToFree(orgId);
          console.log(`Downgraded org ${orgId} after cancellation`);
        }
        break;
      }

      case "PAYMENT_FAILED": {
        const obj = result.data as any;
        const subscriptionId = obj.subscription || obj.id;

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubId, subscriptionId))
          .limit(1);

        if (sub) {
          await db
            .update(subscriptions)
            .set({ status: "past_due" })
            .where(eq(subscriptions.orgId, sub.orgId));
          console.log(`Marked org ${sub.orgId} as past_due`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err: any) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

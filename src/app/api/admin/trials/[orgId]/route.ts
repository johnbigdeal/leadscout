import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { days } = await request.json();
  if (!days || typeof days !== "number" || days < 1) {
    return NextResponse.json({ error: "days must be a positive number" }, { status: 400 });
  }

  const [sub] = await db
    .select({ trialEndsAt: subscriptions.trialEndsAt })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const baseDate = sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()
    ? new Date(sub.trialEndsAt)
    : new Date();

  const newTrialEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({
      trialEndsAt: newTrialEndsAt,
      dataDeletedAt: null,
    })
    .where(eq(subscriptions.orgId, orgId));

  return NextResponse.json({ extended: true, newTrialEndsAt: newTrialEndsAt.toISOString() });
}

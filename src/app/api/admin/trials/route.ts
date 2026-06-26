import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions, organizations } from "@/lib/db/schema";
import { eq, and, isNotNull, sql, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const now = new Date();

  let conditions = and(eq(subscriptions.plan, "free"), isNotNull(subscriptions.trialEndsAt));

  if (status === "expired") {
    conditions = and(conditions, sql`${subscriptions.trialEndsAt} < ${now}`);
  } else if (status === "active") {
    conditions = and(conditions, sql`${subscriptions.trialEndsAt} > ${now}`);
  }

  const trials = await db
    .select({
      orgId: subscriptions.orgId,
      plan: subscriptions.plan,
      trialEndsAt: subscriptions.trialEndsAt,
      dataDeletedAt: subscriptions.dataDeletedAt,
    })
    .from(subscriptions)
    .where(conditions);

  const orgIds = trials.map((t) => t.orgId);
  const orgs = orgIds.length > 0
    ? await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(inArray(organizations.id, orgIds))
    : [];

  const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

  const enriched = trials.map((t) => ({
    ...t,
    trialEndsAt: t.trialEndsAt?.toISOString() || null,
    dataDeletedAt: t.dataDeletedAt?.toISOString() || null,
    orgName: orgMap.get(t.orgId) || "Unknown",
    expired: t.trialEndsAt ? new Date(t.trialEndsAt) < now : false,
  }));

  return NextResponse.json({ trials: enriched });
}

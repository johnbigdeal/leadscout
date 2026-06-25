import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, memberships, subscriptions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const allOrgs = await db.select().from(organizations);
  const allMemberships = await db.select().from(memberships);
  const allSubs = await db.select().from(subscriptions);

  const orgsWithData = allOrgs.map((org) => {
    const members = allMemberships.filter((m) => m.orgId === org.id);
    const sub = allSubs.find((s) => s.orgId === org.id);

    return {
      ...org,
      memberCount: members.length,
      plan: sub?.plan || "free",
      status: sub?.status || "active",
    };
  });

  return NextResponse.json({ orgs: orgsWithData });
}

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

/* GET /api/admin/referrals — every referral relationship across the app. */
export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const referred = alias(profiles, "referred");
  const referrer = alias(profiles, "referrer");

  const rows = await db
    .select({
      referredEmail: referred.email,
      referredAt: referred.createdAt,
      referrerEmail: referrer.email,
      referrerId: referrer.id,
    })
    .from(referred)
    .innerJoin(referrer, eq(referred.referredBy, referrer.id))
    .where(isNotNull(referred.referredBy))
    .orderBy(desc(referred.createdAt));

  /* Per-referrer totals (credits earned = number of people referred). */
  const byReferrer: Record<string, number> = {};
  for (const r of rows) byReferrer[r.referrerEmail] = (byReferrer[r.referrerEmail] || 0) + 1;

  return NextResponse.json({
    referrals: rows.map((r) => ({
      referrerEmail: r.referrerEmail,
      referredEmail: r.referredEmail,
      referredAt: r.referredAt,
    })),
    totalReferrals: rows.length,
    totalReferrers: Object.keys(byReferrer).length,
    topReferrers: Object.entries(byReferrer)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  });
}

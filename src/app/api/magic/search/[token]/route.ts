import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchShares, searches, searchBusinesses, businesses, businessSeo, opportunityScores, socialProfiles } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const [share] = await db
    .select()
    .from(searchShares)
    .where(eq(searchShares.token, token))
    .limit(1);

  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  const [search] = await db
    .select()
    .from(searches)
    .where(eq(searches.id, share.searchId))
    .limit(1);

  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      business: businesses,
      score: opportunityScores,
    })
    .from(searchBusinesses)
    .innerJoin(businesses, eq(searchBusinesses.businessId, businesses.id))
    .leftJoin(opportunityScores, eq(opportunityScores.businessId, businesses.id))
    .where(eq(searchBusinesses.searchId, search.id));

  const businessIds = rows.map((r) => r.business.id);

  const seoRows = businessIds.length > 0
    ? await db.select().from(businessSeo).where(eq(businessSeo.businessId, businessIds[0]))
    : [];

  const socialRows = businessIds.length > 0
    ? await db.select().from(socialProfiles).where(eq(socialProfiles.businessId, businessIds[0]))
    : [];

  const seoMap = new Map(seoRows.map((s) => [s.businessId, s]));
  const socialMap = new Map();
  for (const s of socialRows) {
    if (!socialMap.has(s.businessId)) socialMap.set(s.businessId, []);
    socialMap.get(s.businessId).push(s);
  }

  const results = rows.map((r) => ({
    ...r.business,
    seo: seoMap.get(r.business.id) ?? null,
    socialProfiles: socialMap.get(r.business.id) ?? [],
    opportunityScore: r.score,
    isLead: false,
  }));

  return NextResponse.json({ search, results });
}

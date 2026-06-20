import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { businesses, searchBusinesses, opportunityScores, socialProfiles, businessSeo } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await db
    .select({ businessId: searchBusinesses.businessId })
    .from(searchBusinesses)
    .where(eq(searchBusinesses.searchId, id));

  if (links.length === 0) {
    return NextResponse.json([]);
  }

  const businessIds = links.map((l) => l.businessId);

  const bizList = await db
    .select()
    .from(businesses)
    .where(inArray(businesses.id, businessIds));

  const scores = await db
    .select()
    .from(opportunityScores)
    .where(inArray(opportunityScores.businessId, businessIds));

  const seos = await db
    .select()
    .from(businessSeo)
    .where(inArray(businessSeo.businessId, businessIds));

  const socials = await db
    .select()
    .from(socialProfiles)
    .where(inArray(socialProfiles.businessId, businessIds));

  const scoreMap = new Map(scores.map((s) => [s.businessId, s]));
  const seoMap = new Map(seos.map((s) => [s.businessId, s]));
  const socialMap = new Map<string, typeof socials>();
  for (const s of socials) {
    const existing = socialMap.get(s.businessId) ?? [];
    existing.push(s);
    socialMap.set(s.businessId, existing);
  }

  const enriched = bizList.map((biz) => ({
    ...biz,
    seo: seoMap.get(biz.id) ?? null,
    opportunityScore: scoreMap.get(biz.id) ?? null,
    socialProfiles: socialMap.get(biz.id) ?? [],
  }));

  return NextResponse.json(enriched);
}

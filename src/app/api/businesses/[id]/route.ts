import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { businesses, businessSeo, opportunityScores, socialProfiles, leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [biz] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [seo] = await db.select().from(businessSeo).where(eq(businessSeo.businessId, id)).limit(1);
  const [score] = await db.select().from(opportunityScores).where(eq(opportunityScores.businessId, id)).limit(1);
  const socials = await db.select().from(socialProfiles).where(eq(socialProfiles.businessId, id));

  const [membership] = await db
    .select()
    .from(leads)
    .where(eq(leads.businessId, id))
    .limit(1);

  return NextResponse.json({
    ...biz,
    seo: seo ?? null,
    opportunityScore: score ?? null,
    socialProfiles: socials,
    isLead: !!membership,
  });
}
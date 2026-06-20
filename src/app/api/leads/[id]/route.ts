import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { leads, memberships, businesses, opportunityScores, businessSeo, socialProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function auth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return null;

  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return null;

  return { user, orgId: membership.orgId };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [lead] = await db
    .select({
      id: leads.id,
      businessId: leads.businessId,
      stage: leads.stage,
      tags: leads.tags,
      createdAt: leads.createdAt,
      business: businesses,
      score: opportunityScores,
    })
    .from(leads)
    .innerJoin(businesses, eq(leads.businessId, businesses.id))
    .leftJoin(opportunityScores, eq(opportunityScores.businessId, businesses.id))
    .where(and(eq(leads.id, id), eq(leads.orgId, ctx.orgId)))
    .limit(1);

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [seo] = await db
    .select()
    .from(businessSeo)
    .where(eq(businessSeo.businessId, lead.businessId))
    .limit(1);

  const socials = await db
    .select()
    .from(socialProfiles)
    .where(eq(socialProfiles.businessId, lead.businessId));

  return NextResponse.json({
    ...lead,
    business: {
      ...lead.business,
      seo: seo ?? null,
      socialProfiles: socials,
      isLead: true,
      opportunityScore: lead.score,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const [updated] = await db
    .update(leads)
    .set(body)
    .where(and(eq(leads.id, id), eq(leads.orgId, ctx.orgId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .delete(leads)
    .where(and(eq(leads.id, id), eq(leads.orgId, ctx.orgId)));

  return NextResponse.json({ ok: true });
}
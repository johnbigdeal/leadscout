import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, memberships, businesses, opportunityScores, businessSeo, socialProfiles } from "@/lib/db/schema";
import { canAddTags } from "@/lib/plans";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

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
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const body = await request.json();

  if (body.tags && !(await canAddTags(ctx.orgId, body.tags))) {
    return NextResponse.json(
      { error: "Límite de etiquetas por lead alcanzado (3). Upgrade a Pro para ilimitadas." },
      { status: 403 },
    );
  }

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
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  await db
    .delete(leads)
    .where(and(eq(leads.id, id), eq(leads.orgId, ctx.orgId)));

  return NextResponse.json({ ok: true });
}
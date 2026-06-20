import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { leads, memberships, businesses, opportunityScores, pipelines, leadCategories } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

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

export async function POST(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId, pipelineId } = await request.json();

  let targetPipelineId = pipelineId;
  if (!targetPipelineId) {
    const [defaultPipeline] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.orgId, ctx.orgId))
      .limit(1);
    targetPipelineId = defaultPipeline?.id ?? null;
  }

  const [lead] = await db
    .insert(leads)
    .values({ orgId: ctx.orgId, businessId, ownerId: ctx.user.id, pipelineId: targetPipelineId })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json(lead);
}

export async function GET(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get("pipelineId");

  const conditions = [eq(leads.orgId, ctx.orgId)];
  if (pipelineId) {
    conditions.push(eq(leads.pipelineId, pipelineId));
  }
  const whereClause = and(...conditions);

  const rows = await db
    .select({
      id: leads.id,
      businessId: leads.businessId,
      pipelineId: leads.pipelineId,
      categoryId: leads.categoryId,
      stage: leads.stage,
      tags: leads.tags,
      createdAt: leads.createdAt,
      business: businesses,
      score: opportunityScores,
      category: leadCategories,
    })
    .from(leads)
    .innerJoin(businesses, eq(leads.businessId, businesses.id))
    .leftJoin(opportunityScores, eq(opportunityScores.businessId, businesses.id))
    .leftJoin(leadCategories, eq(leads.categoryId, leadCategories.id))
    .where(whereClause);

  return NextResponse.json(rows);
}
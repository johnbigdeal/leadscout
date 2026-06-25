import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, memberships, businesses, opportunityScores, pipelines, leadCategories } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { businessId, businessIds, pipelineId, categoryId } = await request.json();

  let targetPipelineId = pipelineId;
  if (!targetPipelineId) {
    const [defaultPipeline] = await db
      .select({ id: pipelines.id })
      .from(pipelines)
      .where(eq(pipelines.orgId, ctx.orgId))
      .limit(1);
    targetPipelineId = defaultPipeline?.id ?? null;
  }

  const idsToInsert = businessIds && Array.isArray(businessIds) ? businessIds : [businessId];

  const inserted = await db
    .insert(leads)
    .values(idsToInsert.map((id: string) => ({
      orgId: ctx!.orgId,
      businessId: id,
      ownerId: ctx!.user.id,
      pipelineId: targetPipelineId,
      categoryId: categoryId || null,
    })))
    .onConflictDoNothing()
    .returning();

  return NextResponse.json(inserted);
}

export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

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
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, memberships, businesses, opportunityScores, pipelines, leadCategories } from "@/lib/db/schema";
import { eq, isNull, and, or, inArray } from "drizzle-orm";
import { matchPipeline } from "@/lib/pipeline-match";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { businessId, businessIds, pipelineId, categoryId, autoMatch } = await request.json();

  const idsToInsert = businessIds && Array.isArray(businessIds) ? businessIds : [businessId];

  /* Pipelines de la org (orden estable). El default es el marcado isDefault;
     si no hay ninguno marcado, se mantiene el fallback histórico: el más antiguo. */
  const orgPipelines = await db
    .select({ id: pipelines.id, name: pipelines.name, category: pipelines.category, isDefault: pipelines.isDefault })
    .from(pipelines)
    .where(eq(pipelines.orgId, ctx.orgId))
    .orderBy(pipelines.createdAt);
  const defaultPipelineId = (orgPipelines.find((p) => p.isDefault) ?? orgPipelines[0])?.id ?? null;

  /* Mapa businessId -> pipelineId resuelto. */
  let pipelineForBusiness: (id: string) => string | null;
  if (autoMatch) {
    const bizRows = idsToInsert.length
      ? await db
          .select({ id: businesses.id, category: businesses.category })
          .from(businesses)
          .where(inArray(businesses.id, idsToInsert))
      : [];
    const catById = new Map(bizRows.map((b) => [b.id, b.category]));
    pipelineForBusiness = (id) =>
      matchPipeline(catById.get(id), orgPipelines)?.id ?? defaultPipelineId;
  } else {
    const targetPipelineId = pipelineId ?? defaultPipelineId;
    pipelineForBusiness = () => targetPipelineId;
  }

  const inserted = await db
    .insert(leads)
    .values(idsToInsert.map((id: string) => ({
      orgId: ctx!.orgId,
      businessId: id,
      ownerId: ctx!.user.id,
      pipelineId: pipelineForBusiness(id),
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
    /* Incluir leads sin pipeline (pipelineId NULL) para que nunca desaparezcan
       del tablero al filtrar por un pipeline. */
    conditions.push(or(eq(leads.pipelineId, pipelineId), isNull(leads.pipelineId))!);
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
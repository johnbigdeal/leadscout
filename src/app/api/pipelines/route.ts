import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pipelines, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreatePipeline } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  /* Orden estable (más antiguo primero) para que el pipeline activo por defecto
     del CRM (data[0]) no cambie entre refrescos. */
  const rows = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.orgId, ctx.orgId))
    .orderBy(pipelines.createdAt);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  /* Check plan limits - Free: 1 pipeline total. Super admin bypass. */
  if (!ctx.isSuperAdmin) {
    const allowed = await canCreatePipeline(ctx.orgId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Límite de pipelines alcanzado (1). Upgrade a Pro para pipelines ilimitados." },
        { status: 403 }
      );
    }
  }

  const { name, category, stages } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const [p] = await db.insert(pipelines).values({
    orgId: ctx.orgId, name: name.trim(), category: category || null,
    stages: stages || ["new", "contacted", "qualified", "won", "lost"],
  }).returning();
  return NextResponse.json(p);
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pipelines, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const body = await request.json();
  const allowedFields: Record<string, true> = { name: true, category: true, stages: true };

  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (allowedFields[key]) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(pipelines)
    .set(updates)
    .where(and(eq(pipelines.id, id), eq(pipelines.orgId, ctx.orgId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

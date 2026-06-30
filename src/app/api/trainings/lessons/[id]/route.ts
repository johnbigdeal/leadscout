import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingLessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* PATCH /api/trainings/lessons/[id] — actualizar (solo super_admin) */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const { id } = await params;

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") updates.title = body.title.trim();
  if ("content" in body) updates.content = body.content || null;
  if ("embedUrl" in body) updates.embedUrl = body.embedUrl || null;
  if ("aspectRatio" in body) updates.aspectRatio = body.aspectRatio || "16 / 9";
  if ("fileUrl" in body) updates.fileUrl = body.fileUrl || null;
  if (typeof body.order === "number") updates.order = body.order;

  const [row] = await db
    .update(trainingLessons)
    .set(updates)
    .where(eq(trainingLessons.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

/* DELETE /api/trainings/lessons/[id] */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const { id } = await params;

  await db.delete(trainingLessons).where(eq(trainingLessons.id, id));
  return NextResponse.json({ success: true });
}

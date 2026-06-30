import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { roadmapIdeas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isRoadmapStatus } from "@/lib/roadmap/constants";

export const dynamic = "force-dynamic";

/* PATCH /api/roadmap/ideas/[id] — mover idea de columna (solo super_admin). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!isRoadmapStatus(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const [idea] = await db
    .update(roadmapIdeas)
    .set({ status, updatedAt: new Date() })
    .where(eq(roadmapIdeas.id, id))
    .returning();

  if (!idea) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 });
  return NextResponse.json(idea);
}

/* DELETE /api/roadmap/ideas/[id] — eliminar idea (solo super_admin).
   El cascade de la FK borra los votos asociados. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const { id } = await params;

  const deleted = await db
    .delete(roadmapIdeas)
    .where(eq(roadmapIdeas.id, id))
    .returning({ id: roadmapIdeas.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roadmapIdeas, roadmapVotes } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { VOTE_PROMOTE_THRESHOLD } from "@/lib/roadmap/constants";

export const dynamic = "force-dynamic";

/* POST /api/roadmap/ideas/[id]/vote — emitir voto (requiere login).
   Inserta el voto (idempotente por el unique idea_id+user_id), incrementa el
   contador de forma atómica y, si la idea está en "proposed" y cruza el umbral,
   la promueve a "considering". Todo en una transacción. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { id } = await params;

  try {
    const out = await db.transaction(async (tx) => {
      const [idea] = await tx
        .select({ id: roadmapIdeas.id })
        .from(roadmapIdeas)
        .where(eq(roadmapIdeas.id, id))
        .limit(1);
      if (!idea) return null; // 404

      const inserted = await tx
        .insert(roadmapVotes)
        .values({ ideaId: id, userId: ctx.user.id })
        .onConflictDoNothing({ target: [roadmapVotes.ideaId, roadmapVotes.userId] })
        .returning({ id: roadmapVotes.id });

      /* Ya había votado: devolvemos el estado actual sin tocar el contador. */
      if (inserted.length === 0) {
        const [current] = await tx
          .select({ voteCount: roadmapIdeas.voteCount, status: roadmapIdeas.status })
          .from(roadmapIdeas)
          .where(eq(roadmapIdeas.id, id))
          .limit(1);
        return { voteCount: current.voteCount, status: current.status, hasVoted: true };
      }

      /* Incremento atómico del contador. */
      const [updated] = await tx
        .update(roadmapIdeas)
        .set({ voteCount: sql`${roadmapIdeas.voteCount} + 1`, updatedAt: new Date() })
        .where(eq(roadmapIdeas.id, id))
        .returning({ voteCount: roadmapIdeas.voteCount, status: roadmapIdeas.status });

      /* Auto-promoción: "proposed" → "considering" al cruzar el umbral. */
      if (updated.status === "proposed" && updated.voteCount >= VOTE_PROMOTE_THRESHOLD) {
        const [promoted] = await tx
          .update(roadmapIdeas)
          .set({ status: "considering", updatedAt: new Date() })
          .where(eq(roadmapIdeas.id, id))
          .returning({ voteCount: roadmapIdeas.voteCount, status: roadmapIdeas.status });
        return { voteCount: promoted.voteCount, status: promoted.status, hasVoted: true };
      }

      return { voteCount: updated.voteCount, status: updated.status, hasVoted: true };
    });

    if (!out) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 });
    return NextResponse.json(out);
  } catch (e) {
    console.error("vote POST error:", e);
    return NextResponse.json({ error: "No se pudo registrar el voto" }, { status: 500 });
  }
}

/* DELETE /api/roadmap/ideas/[id]/vote — retirar voto (requiere login).
   Borra el voto y decrementa el contador (nunca por debajo de 0). NO degrada el
   estado: una idea promovida permanece promovida aunque baje de votos. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { id } = await params;

  try {
    const out = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(roadmapVotes)
        .where(and(eq(roadmapVotes.ideaId, id), eq(roadmapVotes.userId, ctx.user.id)))
        .returning({ id: roadmapVotes.id });

      const [idea] = await tx
        .select({ voteCount: roadmapIdeas.voteCount, status: roadmapIdeas.status })
        .from(roadmapIdeas)
        .where(eq(roadmapIdeas.id, id))
        .limit(1);
      if (!idea) return null; // 404

      /* No tenía voto: idempotente. */
      if (deleted.length === 0) {
        return { voteCount: idea.voteCount, status: idea.status, hasVoted: false };
      }

      const [updated] = await tx
        .update(roadmapIdeas)
        .set({ voteCount: sql`GREATEST(${roadmapIdeas.voteCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(roadmapIdeas.id, id))
        .returning({ voteCount: roadmapIdeas.voteCount, status: roadmapIdeas.status });

      return { voteCount: updated.voteCount, status: updated.status, hasVoted: false };
    });

    if (!out) return NextResponse.json({ error: "Idea no encontrada" }, { status: 404 });
    return NextResponse.json(out);
  } catch (e) {
    console.error("vote DELETE error:", e);
    return NextResponse.json({ error: "No se pudo retirar el voto" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { authenticateRequest, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roadmapIdeas, roadmapVotes, profiles } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { IDEA_TITLE_MAX, IDEA_DESCRIPTION_MAX } from "@/lib/roadmap/constants";

export const dynamic = "force-dynamic";

/** Nombre visible a partir del email (parte local), con fallback. */
function displayName(email?: string | null): string {
  if (!email) return "Anónimo";
  return email.split("@")[0] || "Anónimo";
}

/* GET /api/roadmap/ideas — PÚBLICO.
   Devuelve todas las ideas con su autor y, si la petición viene autenticada,
   marca `hasVoted` por idea. */
export async function GET(request: Request) {
  /* Auth opcional: si hay token válido sabemos quién es para marcar sus votos;
     si no, sigue siendo lectura pública. */
  const ctx = await authenticateRequest(request);

  const rows = await db
    .select({
      id: roadmapIdeas.id,
      title: roadmapIdeas.title,
      description: roadmapIdeas.description,
      status: roadmapIdeas.status,
      voteCount: roadmapIdeas.voteCount,
      createdAt: roadmapIdeas.createdAt,
      authorId: roadmapIdeas.authorId,
      authorEmail: profiles.email,
    })
    .from(roadmapIdeas)
    .leftJoin(profiles, eq(profiles.id, roadmapIdeas.authorId))
    .orderBy(desc(roadmapIdeas.voteCount), desc(roadmapIdeas.createdAt));

  /* Conjunto de ideas votadas por el usuario actual (si está logueado). */
  let votedSet = new Set<string>();
  if (ctx && rows.length) {
    const votes = await db
      .select({ ideaId: roadmapVotes.ideaId })
      .from(roadmapVotes)
      .where(eq(roadmapVotes.userId, ctx.user.id));
    votedSet = new Set(votes.map((v) => v.ideaId));
  }

  const ideas = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    voteCount: r.voteCount,
    createdAt: r.createdAt,
    authorName: displayName(r.authorEmail),
    hasVoted: votedSet.has(r.id),
  }));

  return NextResponse.json(ideas);
}

/* POST /api/roadmap/ideas — crear idea (requiere login). */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }
  if (title.length > IDEA_TITLE_MAX) {
    return NextResponse.json(
      { error: `El título no puede superar ${IDEA_TITLE_MAX} caracteres` },
      { status: 400 },
    );
  }
  if (description.length > IDEA_DESCRIPTION_MAX) {
    return NextResponse.json(
      { error: `La descripción no puede superar ${IDEA_DESCRIPTION_MAX} caracteres` },
      { status: 400 },
    );
  }

  const [idea] = await db
    .insert(roadmapIdeas)
    .values({
      title,
      description: description || null,
      authorId: ctx.user.id,
      status: "proposed",
      voteCount: 0,
    })
    .returning();

  return NextResponse.json({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    voteCount: idea.voteCount,
    createdAt: idea.createdAt,
    authorName: displayName(ctx.user.email),
    hasVoted: false,
  });
}

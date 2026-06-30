import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plans";
import { db } from "@/lib/db";
import { trainingSections, trainingLessons } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* GET /api/trainings
   Contenido global. Devuelve secciones con sus lecciones, gateado por plan:
   - super_admin / pro: todo desbloqueado (canEdit solo super_admin).
   - free: secciones "free" completas; secciones "pro" bloqueadas (sin lecciones). */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const canEdit = ctx.isSuperAdmin;
  const plan = ctx.isSuperAdmin ? "pro" : (await getPlanLimits(ctx.orgId)).plan;
  const fullAccess = canEdit || plan === "pro";

  const [sections, lessons] = await Promise.all([
    db.select().from(trainingSections).orderBy(asc(trainingSections.order), asc(trainingSections.createdAt)),
    db.select().from(trainingLessons).orderBy(asc(trainingLessons.order), asc(trainingLessons.createdAt)),
  ]);

  const lessonsBySection = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const arr = lessonsBySection.get(l.sectionId) ?? [];
    arr.push(l);
    lessonsBySection.set(l.sectionId, arr);
  }

  const out = sections.map((s) => {
    const secLessons = lessonsBySection.get(s.id) ?? [];
    const locked = !fullAccess && s.accessLevel === "pro";
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      accessLevel: s.accessLevel,
      order: s.order,
      locked,
      lessonCount: secLessons.length,
      lessons: locked ? [] : secLessons,
    };
  });

  return NextResponse.json({ canEdit, plan, sections: out });
}

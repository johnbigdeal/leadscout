import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingLessons } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TYPES = ["video", "text", "pdf"];

/* POST /api/trainings/lessons — crear lección dentro de una sección (super_admin) */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { sectionId, title, type, content, embedUrl, aspectRatio, fileUrl } = await request.json();
  if (!sectionId) return NextResponse.json({ error: "sectionId required" }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${trainingLessons.order}), -1)` })
    .from(trainingLessons)
    .where(eq(trainingLessons.sectionId, sectionId));

  const [row] = await db
    .insert(trainingLessons)
    .values({
      sectionId,
      title: title.trim(),
      type,
      content: content || null,
      embedUrl: type === "video" ? (embedUrl || null) : null,
      aspectRatio: aspectRatio || "16 / 9",
      fileUrl: type === "pdf" ? (fileUrl || null) : null,
      order: (max ?? -1) + 1,
    })
    .returning();

  return NextResponse.json(row);
}

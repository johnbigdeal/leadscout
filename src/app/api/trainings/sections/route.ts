import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingSections } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* POST /api/trainings/sections — crear sección (solo super_admin) */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { title, description, accessLevel } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${trainingSections.order}), -1)` })
    .from(trainingSections);

  const [row] = await db
    .insert(trainingSections)
    .values({
      title: title.trim(),
      description: description || null,
      accessLevel: accessLevel === "pro" ? "pro" : "free",
      order: (max ?? -1) + 1,
    })
    .returning();

  return NextResponse.json(row);
}

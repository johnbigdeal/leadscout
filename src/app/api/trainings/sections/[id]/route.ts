import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingSections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* PATCH /api/trainings/sections/[id] — actualizar (solo super_admin) */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const { id } = await params;

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") updates.title = body.title.trim();
  if ("description" in body) updates.description = body.description || null;
  if (body.accessLevel === "free" || body.accessLevel === "pro") updates.accessLevel = body.accessLevel;
  if (typeof body.order === "number") updates.order = body.order;

  const [row] = await db
    .update(trainingSections)
    .set(updates)
    .where(eq(trainingSections.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

/* DELETE /api/trainings/sections/[id] — borra la sección (cascade lecciones) */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const { id } = await params;

  await db.delete(trainingSections).where(eq(trainingSections.id, id));
  return NextResponse.json({ success: true });
}

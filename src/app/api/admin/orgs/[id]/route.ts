import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* PATCH /api/admin/orgs/[id] — Update org name/currency */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;
  const { name, currency } = await request.json();

  const updateData: Partial<typeof organizations.$inferInsert> = {};
  if (name !== undefined) updateData.name = name;
  if (currency !== undefined) updateData.currency = currency;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(organizations).set(updateData).where(eq(organizations.id, id));

  return NextResponse.json({ ok: true });
}

/* DELETE /api/admin/orgs/[id] — Hard delete org (cascades via FK) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;

  /* Check if trying to delete own org */
  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, result.ctx.user.id))
    .limit(1);

  if (membership?.orgId === id) {
    return NextResponse.json({ error: "Cannot delete your own organization" }, { status: 403 });
  }

  await db.delete(organizations).where(eq(organizations.id, id));

  return NextResponse.json({ ok: true, message: "Organization deleted" });
}

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* PATCH /api/admin/users/[id] — Change user role */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;
  const { role } = await request.json();

  if (!role || !["member", "owner", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  /* Prevent self-demotion from superadmin */
  const currentUser = result.ctx.user;
  const [targetProfile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);

  if (id === currentUser.id && targetProfile?.role === "super_admin" && role !== "superadmin") {
    return NextResponse.json({ error: "Cannot demote yourself from super admin" }, { status: 403 });
  }

  await db.update(memberships).set({ role }).where(eq(memberships.userId, id));

  return NextResponse.json({ ok: true });
}

/* DELETE /api/admin/users/[id] — Soft delete user */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;

  /* Prevent self-deletion */
  if (id === result.ctx.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 403 });
  }

  /* Soft delete: mark profile as deleted */
  await db.update(profiles).set({ deletedAt: new Date() }).where(eq(profiles.id, id));

  /* Also mark membership as not approved */
  await db.update(memberships).set({ approved: false }).where(eq(memberships.userId, id));

  return NextResponse.json({ ok: true, message: "User soft deleted" });
}

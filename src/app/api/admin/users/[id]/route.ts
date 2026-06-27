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

/* DELETE /api/admin/users/[id] — Delete user (Supabase Auth + app rows) */
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

  /* Remove the Supabase Auth user. The admin user list is built from Supabase
     Auth, so this is what actually removes them from the list and frees the
     email — the previous soft-delete left the auth user in place and was a no-op
     for accounts without a profile row. */
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error && !/not.?found/i.test(error.message)) {
    return NextResponse.json(
      { error: `No se pudo eliminar el usuario: ${error.message}` },
      { status: 500 },
    );
  }

  /* Clean up the user's own rows. Las organizaciones y sus datos (websites,
     leads) se dejan intactos a propósito: borrar un usuario no destruye datos. */
  await db.delete(memberships).where(eq(memberships.userId, id));
  await db.delete(profiles).where(eq(profiles.id, id));

  return NextResponse.json({ ok: true, message: "User deleted" });
}

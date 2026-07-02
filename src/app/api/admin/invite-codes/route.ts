import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteCodes, inviteCodeRequests, profiles } from "@/lib/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { normalizeCode, generateUniqueInviteCode } from "@/lib/invite-codes";

export const dynamic = "force-dynamic";

/* GET /api/admin/invite-codes — todos los códigos + solicitudes pendientes. */
export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const codes = await db
    .select({
      id: inviteCodes.id,
      code: inviteCodes.code,
      ownerId: inviteCodes.ownerId,
      ownerEmail: profiles.email,
      label: inviteCodes.label,
      maxUses: inviteCodes.maxUses,
      usesCount: inviteCodes.usesCount,
      enabled: inviteCodes.enabled,
      createdAt: inviteCodes.createdAt,
    })
    .from(inviteCodes)
    .leftJoin(profiles, eq(profiles.id, inviteCodes.ownerId))
    .orderBy(desc(inviteCodes.createdAt));

  const requests = await db
    .select({
      id: inviteCodeRequests.id,
      userId: inviteCodeRequests.userId,
      email: profiles.email,
      status: inviteCodeRequests.status,
      createdAt: inviteCodeRequests.createdAt,
    })
    .from(inviteCodeRequests)
    .leftJoin(profiles, eq(profiles.id, inviteCodeRequests.userId))
    .where(eq(inviteCodeRequests.status, "pending"))
    .orderBy(desc(inviteCodeRequests.createdAt));

  return NextResponse.json({ codes, requests });
}

/* POST /api/admin/invite-codes — crear código. Body: { name?, infinite? } */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { name, infinite } = await request.json().catch(() => ({}));

  let code = name && typeof name === "string" ? normalizeCode(name) : await generateUniqueInviteCode();
  /* Asegurar unicidad si el nombre custom choca. */
  const [clash] = await db.select({ id: inviteCodes.id }).from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  if (clash) code = await generateUniqueInviteCode();

  const [created] = await db
    .insert(inviteCodes)
    .values({
      code,
      ownerId: ctx.user.id,
      label: typeof name === "string" ? name : null,
      maxUses: infinite ? null : 10,
    })
    .returning();

  return NextResponse.json({ code: created });
}

/* PATCH /api/admin/invite-codes?id= — renombrar / habilitar / recargar. */
export async function PATCH(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.code === "string" && body.code.trim()) {
    const normalized = normalizeCode(body.code);
    const [clash] = await db
      .select({ id: inviteCodes.id })
      .from(inviteCodes)
      .where(and(eq(inviteCodes.code, normalized), ne(inviteCodes.id, id)))
      .limit(1);
    if (clash) return NextResponse.json({ error: "Ya existe un código con ese nombre." }, { status: 409 });
    patch.code = normalized;
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.addUses === "number" && existing.maxUses !== null) {
    patch.maxUses = existing.maxUses + body.addUses;
  }
  if (body.infinite === true) patch.maxUses = null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const [updated] = await db.update(inviteCodes).set(patch).where(eq(inviteCodes.id, id)).returning();
  return NextResponse.json({ code: updated });
}

/* DELETE /api/admin/invite-codes?id= */
export async function DELETE(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
  return NextResponse.json({ success: true });
}

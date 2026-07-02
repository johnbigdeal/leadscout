import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteCodeRequests, inviteCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateUniqueInviteCode } from "@/lib/invite-codes";

export const dynamic = "force-dynamic";

/* POST /api/admin/invite-codes/requests — aprobar/rechazar una solicitud.
   Body: { id, action: "approve" | "reject", note? }
   Aprobar recarga +10 usos al código del solicitante (o lo crea con 10). */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id, action, note } = await request.json().catch(() => ({}));
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const [req] = await db.select().from(inviteCodeRequests).where(eq(inviteCodeRequests.id, id)).limit(1);
  if (!req) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });

  if (action === "approve") {
    const [code] = await db.select().from(inviteCodes).where(eq(inviteCodes.ownerId, req.userId)).limit(1);
    if (code) {
      await db
        .update(inviteCodes)
        .set({ maxUses: (code.maxUses ?? code.usesCount) + 10, enabled: true })
        .where(eq(inviteCodes.id, code.id));
    } else {
      const newCode = await generateUniqueInviteCode();
      await db.insert(inviteCodes).values({ code: newCode, ownerId: req.userId, maxUses: 10 });
    }
    await db
      .update(inviteCodeRequests)
      .set({ status: "approved", adminNote: note ?? null, reviewedAt: new Date() })
      .where(eq(inviteCodeRequests.id, id));
    return NextResponse.json({ ok: true, message: "Solicitud aprobada, +10 usos." });
  }

  await db
    .update(inviteCodeRequests)
    .set({ status: "rejected", adminNote: note ?? null, reviewedAt: new Date() })
    .where(eq(inviteCodeRequests.id, id));
  return NextResponse.json({ ok: true, message: "Solicitud rechazada." });
}

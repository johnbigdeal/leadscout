import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteCodeRequests, organizations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getOrCreateUserCode } from "@/lib/invite-codes";
import { sendEmail, inviteCodeRequestHtml } from "@/lib/integrations/resend";

export const dynamic = "force-dynamic";

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "johnbigdeal@gmail.com";

/* GET /api/invitations — código personal del usuario (lo crea si no existe). */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const code = await getOrCreateUserCode(ctx.user.id, ctx.isSuperAdmin);

  const [pending] = await db
    .select({ id: inviteCodeRequests.id })
    .from(inviteCodeRequests)
    .where(and(eq(inviteCodeRequests.userId, ctx.user.id), eq(inviteCodeRequests.status, "pending")))
    .limit(1);

  return NextResponse.json({
    code: code.code,
    usesCount: code.usesCount,
    maxUses: code.maxUses, // null = ilimitado
    enabled: code.enabled,
    pendingRequest: !!pending,
  });
}

/* POST /api/invitations — solicitar más códigos/usos al admin. */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const [existingPending] = await db
    .select({ id: inviteCodeRequests.id })
    .from(inviteCodeRequests)
    .where(and(eq(inviteCodeRequests.userId, ctx.user.id), eq(inviteCodeRequests.status, "pending")))
    .limit(1);
  if (existingPending) {
    return NextResponse.json({ error: "Ya tenés una solicitud pendiente." }, { status: 409 });
  }

  const [created] = await db
    .insert(inviteCodeRequests)
    .values({ userId: ctx.user.id, orgId: ctx.orgId })
    .returning();

  try {
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId))
      .limit(1);
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: "Solicitud de códigos de invitación",
      html: inviteCodeRequestHtml({ email: ctx.user.email || "—", orgName: org?.name || ctx.orgId }),
    });
  } catch (e) {
    console.error("invite request notify email error:", e);
  }

  return NextResponse.json({ request: created });
}

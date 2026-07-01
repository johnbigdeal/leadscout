import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sinpePayments, organizations } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sendEmail, sinpeProofSubmittedHtml } from "@/lib/integrations/resend";

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "johnbigdeal@gmail.com";

export const dynamic = "force-dynamic";

/* GET /api/billing/sinpe
   Devuelve el último comprobante SINPE de la organización (para mostrar estado). */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const [latest] = await db
    .select()
    .from(sinpePayments)
    .where(eq(sinpePayments.orgId, ctx.orgId))
    .orderBy(desc(sinpePayments.createdAt))
    .limit(1);

  return NextResponse.json({ payment: latest ?? null });
}

/* POST /api/billing/sinpe
   El usuario envía un comprobante (URL en Vercel Blob subida vía /api/upload). */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { proofUrl, reference } = await request.json().catch(() => ({}));

  if (!proofUrl || typeof proofUrl !== "string") {
    return NextResponse.json({ error: "Falta el comprobante." }, { status: 400 });
  }

  /* Evitar comprobantes pendientes duplicados. */
  const [existingPending] = await db
    .select({ id: sinpePayments.id })
    .from(sinpePayments)
    .where(and(eq(sinpePayments.orgId, ctx.orgId), eq(sinpePayments.status, "pending")))
    .limit(1);

  if (existingPending) {
    return NextResponse.json(
      { error: "Ya tenés un comprobante pendiente de verificación." },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(sinpePayments)
    .values({
      orgId: ctx.orgId,
      userId: ctx.user.id,
      proofUrl,
      reference: typeof reference === "string" && reference.trim() ? reference.trim() : null,
    })
    .returning();

  /* Notificar al admin (no bloqueante). */
  try {
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, ctx.orgId))
      .limit(1);
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `Nuevo comprobante SINPE — ${org?.name || ctx.orgId}`,
      html: sinpeProofSubmittedHtml({
        orgName: org?.name || ctx.orgId,
        email: ctx.user.email || "—",
        amount: created.amount,
        reference: created.reference,
        proofUrl: created.proofUrl,
      }),
    });
  } catch (e) {
    console.error("SINPE notify email error:", e);
  }

  return NextResponse.json({ payment: created });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sinpePayments, organizations } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { upgradeToPro } from "@/lib/plans";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/* GET /api/admin/sinpe — lista los comprobantes SINPE (pendientes primero). */
export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const rows = await db
    .select()
    .from(sinpePayments)
    .orderBy(desc(sinpePayments.createdAt))
    .limit(200);

  const payments = await Promise.all(
    rows.map(async (p) => {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, p.orgId))
        .limit(1);
      let email: string | undefined;
      if (p.userId) {
        const { data } = await admin.auth.admin.getUserById(p.userId).catch(() => ({ data: null }));
        email = data?.user?.email ?? undefined;
      }
      return { ...p, orgName: org?.name, email };
    }),
  );

  return NextResponse.json({ payments });
}

/* POST /api/admin/sinpe — aprobar o rechazar un comprobante.
   Body: { id: string, action: "approve" | "reject", note?: string } */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id, action, note } = await request.json().catch(() => ({}));
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const [payment] = await db
    .select()
    .from(sinpePayments)
    .where(eq(sinpePayments.id, id))
    .limit(1);

  if (!payment) {
    return NextResponse.json({ error: "Comprobante no encontrado." }, { status: 404 });
  }

  if (action === "approve") {
    /* SINPE es mensual: el período cubre ~31 días desde la aprobación. */
    const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    await upgradeToPro(payment.orgId, "sinpe", "sinpe", "sinpe", periodEnd);
    await db
      .update(sinpePayments)
      .set({ status: "approved", adminNote: note ?? null, reviewedAt: new Date() })
      .where(eq(sinpePayments.id, id));
    return NextResponse.json({ ok: true, message: "Comprobante aprobado, organización en Pro." });
  }

  await db
    .update(sinpePayments)
    .set({ status: "rejected", adminNote: note ?? null, reviewedAt: new Date() })
    .where(eq(sinpePayments.id, id));
  return NextResponse.json({ ok: true, message: "Comprobante rechazado." });
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { services, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { name, defaultCost, currency, recurrence } = await request.json();
  const [updated] = await db
    .update(services)
    .set({ name, defaultCost: String(defaultCost ?? 0), currency: currency || "USD", recurrence: recurrence || "one_time" })
    .where(and(eq(services.id, id), eq(services.orgId, ctx.orgId)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  await db.delete(services).where(and(eq(services.id, id), eq(services.orgId, ctx.orgId)));
  return NextResponse.json({ ok: true });
}

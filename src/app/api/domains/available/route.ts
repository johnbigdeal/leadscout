import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { availableDomains, memberships } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* GET /api/domains/available — list active domains for publishing */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const rows = await db
    .select()
    .from(availableDomains)
    .where(
      or(
        eq(availableDomains.isGlobal, true),
        eq(availableDomains.orgId, ctx.orgId)
      )
    );

  return NextResponse.json(rows);
}

/* POST /api/domains/available — add a new domain */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { domain, zoneId, isDefault } = await request.json();
  if (!domain || !zoneId) {
    return NextResponse.json({ error: "domain and zoneId required" }, { status: 400 });
  }

  /* If marking as default, clear other defaults */
  if (isDefault) {
    await db
      .update(availableDomains)
      .set({ isDefault: false })
      .where(eq(availableDomains.orgId, ctx.orgId));
  }

  const [row] = await db
    .insert(availableDomains)
    .values({
      orgId: ctx.orgId,
      domain: domain.trim(),
      zoneId: zoneId.trim(),
      isDefault: isDefault || false,
    })
    .returning();

  return NextResponse.json(row);
}

/* PATCH /api/domains/available/[id] — update domain (activate/deactivate/default) */
export async function PATCH(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json();

  /* If marking as default, clear other defaults */
  if (body.isDefault) {
    await db
      .update(availableDomains)
      .set({ isDefault: false })
      .where(eq(availableDomains.orgId, ctx.orgId));
  }

  const [updated] = await db
    .update(availableDomains)
    .set(body)
    .where(eq(availableDomains.id, id))
    .returning();

  return NextResponse.json(updated);
}

/* DELETE /api/domains/available — remove domain */
export async function DELETE(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db
    .delete(availableDomains)
    .where(eq(availableDomains.id, id));

  return NextResponse.json({ success: true });
}

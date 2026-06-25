import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, memberships, activities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET list activities for a lead
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const [lead] = await db
    .select({ leadId: leads.id })
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.orgId, ctx.orgId)))
    .limit(1);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.leadId, id));

  return NextResponse.json(rows);
}

// POST add activity/note
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const [lead] = await db
    .select({ leadId: leads.id })
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.orgId, ctx.orgId)))
    .limit(1);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, body } = await request.json();

  const [activity] = await db
    .insert(activities)
    .values({
      leadId: id,
      orgId: ctx.orgId,
      userId: ctx.user.id,
      type: type || "note",
      body: body || null,
    })
    .returning();

  return NextResponse.json(activity);
}
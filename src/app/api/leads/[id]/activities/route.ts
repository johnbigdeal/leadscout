import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { leads, memberships, activities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function auth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return null;

  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return null;

  return { user, orgId: membership.orgId };
}

// GET list activities for a lead
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
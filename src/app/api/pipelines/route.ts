import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { pipelines, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

export async function GET(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(pipelines).where(eq(pipelines.orgId, ctx.orgId));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, category, stages } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const [p] = await db.insert(pipelines).values({
    orgId: ctx.orgId, name: name.trim(), category: category || null,
    stages: stages || ["new", "contacted", "qualified", "won", "lost"],
  }).returning();
  return NextResponse.json(p);
}

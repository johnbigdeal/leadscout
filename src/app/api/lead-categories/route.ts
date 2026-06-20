import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { leadCategories, memberships } from "@/lib/db/schema";
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

export async function GET(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(leadCategories).where(eq(leadCategories.orgId, ctx.orgId)).orderBy(leadCategories.name);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, color } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const [cat] = await db.insert(leadCategories).values({
    orgId: ctx.orgId, name: name.trim(), color: color || "#0369A1",
  }).onConflictDoNothing().returning();
  if (!cat) return NextResponse.json({ error: "Already exists" }, { status: 409 });
  return NextResponse.json(cat);
}

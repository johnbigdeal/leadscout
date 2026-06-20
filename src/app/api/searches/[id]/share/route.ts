import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { searches, searchShares, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: searchId } = await params;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const [search] = await db
    .select()
    .from(searches)
    .where(and(eq(searches.id, searchId), eq(searches.orgId, membership.orgId)))
    .limit(1);
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = randomBytes(32).toString("hex");
  await db.insert(searchShares).values({
    searchId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return NextResponse.json({ token, url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/magic/search/${token}` });
}

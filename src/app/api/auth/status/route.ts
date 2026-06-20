import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [membership] = await db
    .select({ orgId: memberships.orgId, role: memberships.role, approved: memberships.approved })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) return NextResponse.json({ error: "No membership" }, { status: 403 });

  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);

  return NextResponse.json({
    role: membership.role,
    approved: membership.approved,
    currency: org?.currency || "USD",
  });
}

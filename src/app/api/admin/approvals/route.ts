import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function isSuperAdmin(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data: { user } } = await anonSupabase.auth.getUser(authHeader.slice(7));
  if (!user) return null;
  const [m] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!m || m.role !== "superadmin") return null;
  return user;
}

export async function GET(request: Request) {
  const user = await isSuperAdmin(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pending = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      orgId: memberships.orgId,
      role: memberships.role,
      createdAt: memberships.createdAt,
    })
    .from(memberships)
    .where(eq(memberships.approved, false));

  const results = await Promise.all(
    pending.map(async (m) => {
      const { data: { user: u } } = await supabase.auth.admin.getUserById(m.userId);
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, m.orgId))
        .limit(1);
      return { ...m, email: u?.email, orgName: org?.name };
    }),
  );

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const user = await isSuperAdmin(request);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { membershipId, action } = await request.json();
  if (action === "approve") {
    await db.update(memberships).set({ approved: true }).where(eq(memberships.id, membershipId));
  } else if (action === "reject") {
    await db.delete(memberships).where(eq(memberships.id, membershipId));
  }
  return NextResponse.json({ ok: true });
}

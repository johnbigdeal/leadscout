import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { cloudflareAccounts, memberships } from "@/lib/db/schema";
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
    .select({ orgId: memberships.orgId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return null;
  return { user, orgId: membership.orgId, role: membership.role };
}

/* ---------- Cloudflare API helpers ---------- */
async function cfRequest(token: string, path: string, opts?: RequestInit) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Cloudflare API error");
  return data.result;
}

/* POST /api/cloudflare/connect */
export async function POST(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { apiToken, accountId, email } = await request.json();
  if (!apiToken || !accountId) {
    return NextResponse.json({ error: "apiToken and accountId required" }, { status: 400 });
  }

  try {
    /* Validate token by listing zones */
    await cfRequest(apiToken, "/zones?per_page=1");
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid Cloudflare token", detail: e.message }, { status: 400 });
  }

  /* Upsert */
  const existing = await db
    .select()
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(cloudflareAccounts)
      .set({ accountId, apiToken, email: email || null })
      .where(eq(cloudflareAccounts.id, existing[0].id));
    return NextResponse.json({ id: existing[0].id, accountId, email });
  }

  const [row] = await db
    .insert(cloudflareAccounts)
    .values({ orgId: ctx.orgId, accountId, apiToken, email: email || null })
    .returning();

  return NextResponse.json({ id: row.id, accountId, email });
}

/* GET /api/cloudflare/connect */
export async function GET(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ id: cloudflareAccounts.id, accountId: cloudflareAccounts.accountId, email: cloudflareAccounts.email })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, ...rows[0] });
}

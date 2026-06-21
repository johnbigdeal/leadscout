import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { websites, memberships, customDomains, cloudflareAccounts } from "@/lib/db/schema";
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
    .select({ orgId: memberships.orgId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return null;
  return { user, orgId: membership.orgId, role: membership.role };
}

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

/* GET /api/websites/[id] */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

/* PUT /api/websites/[id] */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, html, name, status } = await request.json();

  const updateData: Partial<typeof websites.$inferInsert> = {};
  if (data !== undefined) updateData.data = data;
  if (html !== undefined) updateData.html = html;
  if (name !== undefined) updateData.name = name;
  if (status !== undefined) updateData.status = status;
  updateData.updatedAt = new Date();

  const [row] = await db
    .update(websites)
    .set(updateData)
    .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

/* DELETE /api/websites/[id] */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  /* Delete associated custom domains */
  await db.delete(customDomains).where(eq(customDomains.websiteId, id));

  await db.delete(websites).where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)));
  return NextResponse.json({ success: true });
}

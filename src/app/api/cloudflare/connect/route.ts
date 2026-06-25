import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudflareAccounts, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canConnectCloudflare } from "@/lib/plans";

export const dynamic = "force-dynamic";

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
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Check plan - Cloudflare connection is Pro only. Super admin bypass. */
  if (!ctx.isSuperAdmin) {
    const allowed = await canConnectCloudflare(ctx.orgId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Conexión de Cloudflare disponible solo en plan Pro. Upgrade para conectar tu propio dominio." },
        { status: 403 }
      );
    }
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
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const rows = await db
    .select({ id: cloudflareAccounts.id, accountId: cloudflareAccounts.accountId, email: cloudflareAccounts.email, authType: cloudflareAccounts.authType })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, ...rows[0] });
}

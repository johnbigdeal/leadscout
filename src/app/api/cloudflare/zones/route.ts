import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudflareAccounts, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

/* GET /api/cloudflare/zones */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const rows = await db
    .select({ apiToken: cloudflareAccounts.apiToken, accountId: cloudflareAccounts.accountId })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Cloudflare not connected" }, { status: 400 });

  try {
    const zones = await cfRequest(rows[0].apiToken, "/zones?per_page=50");
    return NextResponse.json(
      zones.map((z: any) => ({
        id: z.id,
        name: z.name,
        status: z.status,
        nameservers: z.name_servers,
      }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudflareAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cfFetch } from "@/lib/integrations/cloudflare";

export const dynamic = "force-dynamic";

/* GET /api/cloudflare/zones */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const rows = await db
    .select({ id: cloudflareAccounts.id })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Cloudflare not connected" }, { status: 400 });

  try {
    const zones = await cfFetch(ctx.orgId, "/zones?per_page=50");
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

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

/* POST /api/websites/[id]/unpublish */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  /* Find custom domain */
  const domainRows = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.websiteId, id), eq(customDomains.orgId, ctx.orgId)))
    .limit(1);

  if (domainRows.length > 0) {
    const domain = domainRows[0];

    /* Delete from Cloudflare */
    if (domain.dnsRecordId) {
      const cfRows = await db
        .select({ apiToken: cloudflareAccounts.apiToken })
        .from(cloudflareAccounts)
        .where(eq(cloudflareAccounts.orgId, ctx.orgId))
        .limit(1);

      if (cfRows.length > 0) {
        try {
          await cfRequest(cfRows[0].apiToken, `/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, {
            method: "DELETE",
          });
        } catch (e: any) {
          console.error("Failed to delete Cloudflare DNS:", e.message);
        }
      }
    }

    /* Delete from database */
    await db.delete(customDomains).where(eq(customDomains.id, domain.id));
  }

  /* Update website */
  const [updated] = await db
    .update(websites)
    .set({
      status: "draft",
      subdomain: null,
      domain: null,
      publishedUrl: null,
    })
    .where(eq(websites.id, id))
    .returning();

  return NextResponse.json({
    success: true,
    website: updated,
  });
}

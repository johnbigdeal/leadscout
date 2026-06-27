import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { websites, memberships, customDomains, cloudflareAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { removeDomainFromVercel } from "@/lib/vercel";

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

async function deleteDnsRecordByName(token: string, zoneId: string, name: string, type: string) {
  try {
    const records = await cfRequest(token, `/zones/${zoneId}/dns_records?name=${name}&type=${type}`);
    if (records && records.length > 0) {
      await cfRequest(token, `/zones/${zoneId}/dns_records/${records[0].id}`, { method: "DELETE" });
    }
  } catch (e: any) {
    console.error("Failed to delete DNS record by name:", e.message);
  }
}

/* POST /api/websites/[id]/unpublish */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

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

  for (const domain of domainRows) {
    /* Delete from Cloudflare */
    const cfRows = await db
      .select({ apiToken: cloudflareAccounts.apiToken })
      .from(cloudflareAccounts)
      .where(eq(cloudflareAccounts.orgId, ctx.orgId))
      .limit(1);

    const cfToken = cfRows[0]?.apiToken;
    if (cfToken && domain.zoneId) {
      if (domain.dnsRecordId) {
        /* Legacy individual record */
        try {
          await cfRequest(cfToken, `/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, { method: "DELETE" });
        } catch (e: any) {
          console.error("Failed to delete Cloudflare DNS:", e.message);
        }
      } else if (domain.subdomain && domain.rootDomain) {
        /* Wildcard-based record: delete any individual record by name */
        await deleteDnsRecordByName(cfToken, domain.zoneId, `${domain.subdomain}.${domain.rootDomain}`, "CNAME");
      }
    }

    /* Delete from Vercel */
    try {
      await removeDomainFromVercel(domain.domain);
    } catch (e: any) {
      console.error("Failed to remove domain from Vercel:", e.message);
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

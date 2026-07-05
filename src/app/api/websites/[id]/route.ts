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

/* GET /api/websites/[id] */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  return NextResponse.json(rows[0]);
}

async function cfPurgeCache(token: string, zoneId: string, urls: string[]) {
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files: urls }),
    });
  } catch (e: any) {
    console.error("Cloudflare purge cache error:", e.message);
  }
}

/* PUT /api/websites/[id] */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { id } = await params;
  const { data, html, name, status } = await request.json();

  const updateData: Partial<typeof websites.$inferInsert> = {};
  if (data !== undefined) {
    /* Preservar el contador de clics del biolink (data.clickCounts): lo escribe el
       endpoint público /api/biolink/click; el guardado del builder no debe pisarlo. */
    const [ex] = await db
      .select({ data: websites.data })
      .from(websites)
      .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
      .limit(1);
    const cc = (ex?.data as any)?.clickCounts;
    updateData.data = cc ? { ...data, clickCounts: cc } : data;
  }
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

  /* Purge Cloudflare cache for published URL so updates appear instantly */
  if (row.publishedUrl) {
    const domainRows = await db
      .select()
      .from(customDomains)
      .where(and(eq(customDomains.websiteId, id), eq(customDomains.orgId, ctx.orgId)));

    for (const domain of domainRows) {
      if (!domain.zoneId) continue;
      const cfToken =
        process.env.CLOUDFLARE_API_TOKEN ||
        (await db
          .select({ apiToken: cloudflareAccounts.apiToken })
          .from(cloudflareAccounts)
          .where(eq(cloudflareAccounts.orgId, ctx.orgId))
          .limit(1))[0]?.apiToken;
      if (cfToken) {
        await cfPurgeCache(cfToken, domain.zoneId, [`${row.publishedUrl}/`]);
      }
    }
  }

  return NextResponse.json(row);
}

/* DELETE /api/websites/[id] */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { id } = await params;

  /* Find and delete Cloudflare DNS records and Vercel domains */
  const domainRows = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.websiteId, id), eq(customDomains.orgId, ctx.orgId)));

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
        try {
          await cfRequest(cfToken, `/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, { method: "DELETE" });
        } catch (e: any) {
          console.error("Failed to delete Cloudflare DNS:", e.message);
        }
      } else if (domain.subdomain && domain.rootDomain) {
        /* Wildcard-based record: delete any individual record by name */
        try {
          const records = await cfRequest(cfToken, `/zones/${domain.zoneId}/dns_records?name=${domain.subdomain}.${domain.rootDomain}&type=CNAME`);
          if (records && records.length > 0) {
            await cfRequest(cfToken, `/zones/${domain.zoneId}/dns_records/${records[0].id}`, { method: "DELETE" });
          }
        } catch (e: any) {
          console.error("Failed to delete Cloudflare DNS by name:", e.message);
        }
      }
    }

    /* Delete from Vercel */
    try {
      await removeDomainFromVercel(domain.domain);
    } catch (e: any) {
      console.error("Failed to remove domain from Vercel:", e.message);
    }
  }

  /* Delete associated custom domains */
  await db.delete(customDomains).where(eq(customDomains.websiteId, id));

  await db.delete(websites).where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)));
  return NextResponse.json({ success: true });
}

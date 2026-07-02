import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudflareAccounts, customDomains, websites } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { removeDomainFromVercel } from "@/lib/vercel";
import { cfFetch } from "@/lib/integrations/cloudflare";

export const dynamic = "force-dynamic";

async function orgHasCloudflare(orgId: string): Promise<boolean> {
  const rows = await db
    .select({ id: cloudflareAccounts.id })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, orgId))
    .limit(1);
  return rows.length > 0;
}

/* Delete a DNS record looked up by its name (used for wildcard-based subdomains
   that don't have a stored dnsRecordId). */
async function deleteDnsRecordByName(orgId: string, zoneId: string, name: string, type: string) {
  try {
    const records = await cfFetch(orgId, `/zones/${zoneId}/dns_records?name=${name}&type=${type}`);
    if (records && records.length > 0) {
      await cfFetch(orgId, `/zones/${zoneId}/dns_records/${records[0].id}`, { method: "DELETE" });
    }
  } catch (e: any) {
    console.error("Failed to delete DNS record by name:", e.message);
  }
}

/* Remove a single custom-domain row everywhere: Cloudflare DNS, Vercel, and DB. */
async function removeCustomDomain(domain: typeof customDomains.$inferSelect, orgId: string, hasCf: boolean) {
  if (hasCf && domain.zoneId) {
    if (domain.dnsRecordId) {
      try {
        await cfFetch(orgId, `/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, { method: "DELETE" });
      } catch (e: any) {
        console.error("Failed to delete Cloudflare DNS record:", e.message);
      }
    } else if (domain.subdomain && domain.rootDomain) {
      await deleteDnsRecordByName(orgId, domain.zoneId, `${domain.subdomain}.${domain.rootDomain}`, "CNAME");
    }
  }
  try {
    await removeDomainFromVercel(domain.domain);
  } catch (e: any) {
    console.error("Failed to remove domain from Vercel:", e.message);
  }
  await db.delete(customDomains).where(eq(customDomains.id, domain.id));
  if (domain.websiteId) {
    await db
      .update(websites)
      .set({ subdomain: null, domain: null })
      .where(eq(websites.id, domain.websiteId));
  }
}

/* GET /api/cloudflare/domains */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const rows = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.orgId, ctx.orgId));

  return NextResponse.json(rows);
}

/* POST /api/cloudflare/domains */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { websiteId, subdomain, rootDomain, zoneId } = await request.json();
  if (!subdomain || !rootDomain || !zoneId) {
    return NextResponse.json({ error: "subdomain, rootDomain, and zoneId required" }, { status: 400 });
  }

  const domain = `${subdomain}.${rootDomain}`;

  if (!(await orgHasCloudflare(ctx.orgId))) {
    return NextResponse.json({ error: "Cloudflare not connected" }, { status: 400 });
  }

  try {
    /* Check if domain already exists */
    const existing = await db
      .select()
      .from(customDomains)
      .where(and(eq(customDomains.orgId, ctx.orgId), eq(customDomains.domain, domain)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Domain already exists" }, { status: 409 });
    }

    /* Create DNS record in Cloudflare */
    const appHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "");
    const isApexDomain = !rootDomain.includes(".");
    const target = isApexDomain ? "cname.vercel-dns.com" : (appHost || "cname.vercel-dns.com");

    const record = await cfFetch(ctx.orgId, `/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: subdomain,
        content: target,
        ttl: 1, /* Auto */
        proxied: false, /* DNS-only (gris): Vercel necesita ver el CNAME para validar/SSL */
      }),
    });

    /* Save to DB */
    const [row] = await db
      .insert(customDomains)
      .values({
        orgId: ctx.orgId,
        websiteId: websiteId || null,
        domain,
        rootDomain,
        subdomain,
        zoneId,
        dnsRecordId: record.id,
        recordType: "CNAME",
        target,
        status: "pending",
      })
      .returning();

    /* If websiteId provided, update website domain */
    if (websiteId) {
      await db
        .update(websites)
        .set({ subdomain, domain })
        .where(eq(websites.id, websiteId));
    }

    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* DELETE /api/cloudflare/domains?id=xxx */
export async function DELETE(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  /* Bulk cleanup: remove subdomains that aren't in use. */
  if (searchParams.get("cleanup") === "unused") {
    const [allDomains, orgWebsites] = await Promise.all([
      db.select().from(customDomains).where(eq(customDomains.orgId, ctx.orgId)),
      db.select({ id: websites.id, status: websites.status }).from(websites).where(eq(websites.orgId, ctx.orgId)),
    ]);
    const hasCf = await orgHasCloudflare(ctx.orgId);

    const publishedWebsiteIds = new Set(
      orgWebsites.filter((w) => w.status === "published").map((w) => w.id),
    );
    const unused = allDomains.filter(
      (d) => !d.websiteId || !publishedWebsiteIds.has(d.websiteId),
    );

    for (const domain of unused) {
      await removeCustomDomain(domain, ctx.orgId, hasCf);
    }

    return NextResponse.json({ success: true, removed: unused.length });
  }

  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const rows = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, id), eq(customDomains.orgId, ctx.orgId)))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const domain = rows[0];

  /* Delete from Cloudflare */
  if (domain.dnsRecordId && (await orgHasCloudflare(ctx.orgId))) {
    try {
      await cfFetch(ctx.orgId, `/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, { method: "DELETE" });
    } catch (e: any) {
      console.error("Failed to delete Cloudflare DNS record:", e.message);
    }
  }

  /* Delete from DB */
  await db.delete(customDomains).where(eq(customDomains.id, id));

  /* Clear website domain if linked */
  if (domain.websiteId) {
    await db
      .update(websites)
      .set({ subdomain: null, domain: null })
      .where(eq(websites.id, domain.websiteId));
  }

  return NextResponse.json({ success: true });
}

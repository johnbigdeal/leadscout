import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudflareAccounts, customDomains, memberships, websites } from "@/lib/db/schema";
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

/* Delete a DNS record looked up by its name (used for wildcard-based subdomains
   that don't have a stored dnsRecordId). */
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

/* Remove a single custom-domain row everywhere: Cloudflare DNS, Vercel, and DB. */
async function removeCustomDomain(domain: typeof customDomains.$inferSelect, token: string | undefined) {
  if (token && domain.zoneId) {
    if (domain.dnsRecordId) {
      try {
        await cfRequest(token, `/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, { method: "DELETE" });
      } catch (e: any) {
        console.error("Failed to delete Cloudflare DNS record:", e.message);
      }
    } else if (domain.subdomain && domain.rootDomain) {
      await deleteDnsRecordByName(token, domain.zoneId, `${domain.subdomain}.${domain.rootDomain}`, "CNAME");
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

  /* Get Cloudflare token */
  const cfRows = await db
    .select({ apiToken: cloudflareAccounts.apiToken })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (cfRows.length === 0) return NextResponse.json({ error: "Cloudflare not connected" }, { status: 400 });

  const token = cfRows[0].apiToken;

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
    /* For proxied CNAME, target should be the Vercel CNAME */
    const appHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "");
    /* If the main domain is apex (leadscout.lat), we should use cname.vercel-dns.com as target */
    /* If it's a subdomain, point to the main domain */
    const isApexDomain = !rootDomain.includes(".");
    const target = isApexDomain ? "cname.vercel-dns.com" : (appHost || "cname.vercel-dns.com");
    
    const record = await cfRequest(token, `/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: subdomain,
        content: target,
        ttl: 1, /* Auto */
        proxied: true,
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

  /* Bulk cleanup: remove subdomains that aren't in use (no website linked, or
     the linked website was deleted / is no longer published). */
  if (searchParams.get("cleanup") === "unused") {
    const [allDomains, orgWebsites, cfRows] = await Promise.all([
      db.select().from(customDomains).where(eq(customDomains.orgId, ctx.orgId)),
      db.select({ id: websites.id, status: websites.status }).from(websites).where(eq(websites.orgId, ctx.orgId)),
      db
        .select({ apiToken: cloudflareAccounts.apiToken })
        .from(cloudflareAccounts)
        .where(eq(cloudflareAccounts.orgId, ctx.orgId))
        .limit(1),
    ]);

    const publishedWebsiteIds = new Set(
      orgWebsites.filter((w) => w.status === "published").map((w) => w.id),
    );
    const unused = allDomains.filter(
      (d) => !d.websiteId || !publishedWebsiteIds.has(d.websiteId),
    );

    const token = cfRows[0]?.apiToken;
    for (const domain of unused) {
      await removeCustomDomain(domain, token);
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
        console.error("Failed to delete Cloudflare DNS record:", e.message);
      }
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

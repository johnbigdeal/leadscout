import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { cloudflareAccounts, customDomains, memberships, websites } from "@/lib/db/schema";
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

/* GET /api/cloudflare/domains */
export async function GET(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.orgId, ctx.orgId));

  return NextResponse.json(rows);
}

/* POST /api/cloudflare/domains */
export async function POST(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
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

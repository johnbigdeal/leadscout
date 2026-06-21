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

/* Cloudflare API helper */
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

/* Vercel API helper */
async function vercelRequest(path: string, opts?: RequestInit) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not configured");
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Vercel API error: ${res.status}`);
  }
  return res.json();
}

/* POST /api/websites/[id]/publish */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { subdomain: requestedSubdomain } = await request.json();

  const rows = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const website = rows[0];
  const mainDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "leadscout.lat";

  /* Generate subdomain from business name if not provided */
  let subdomain = requestedSubdomain;
  if (!subdomain) {
    const data = website.data as Record<string, any>;
    const name = data?.businessName || website.name || "site";
    subdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 62);
  }

  /* Validate subdomain */
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain format" }, { status: 400 });
  }

  const fullDomain = `${subdomain}.${mainDomain}`;

  /* Check if subdomain already exists */
  const existing = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.domain, fullDomain))
    .limit(1);

  if (existing.length > 0 && existing[0].websiteId !== id) {
    return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
  }

  /* Get Cloudflare credentials */
  const cfRows = await db
    .select({ apiToken: cloudflareAccounts.apiToken, accountId: cloudflareAccounts.accountId })
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, ctx.orgId))
    .limit(1);

  if (cfRows.length === 0) {
    return NextResponse.json({ error: "Cloudflare not connected. Go to Settings → Domains first." }, { status: 400 });
  }

  const cfToken = cfRows[0].apiToken;

  try {
    /* Find zone for the main domain */
    const zones = await cfRequest(cfToken, `/zones?name=${mainDomain}`);
    if (!zones || zones.length === 0) {
      return NextResponse.json({ error: `Zone not found for ${mainDomain}` }, { status: 400 });
    }
    const zoneId = zones[0].id;

    /* Create or update DNS record in Cloudflare */
    let dnsRecordId = existing[0]?.dnsRecordId;
    if (!dnsRecordId) {
      const record = await cfRequest(cfToken, `/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: JSON.stringify({
          type: "CNAME",
          name: subdomain,
          content: "cname.vercel-dns.com",
          ttl: 1,
          proxied: true,
        }),
      });
      dnsRecordId = record.id;
    }

    /* Add domain to Vercel project */
    const projects = await vercelRequest("/v9/projects");
    const project = projects.projects.find((p: any) => 
      p.name === "leadscout" || 
      p.alias?.some((a: any) => a.domain === mainDomain)
    ) || projects.projects[0];

    if (!project) {
      return NextResponse.json({ error: "Vercel project not found" }, { status: 500 });
    }

    /* Add domain to Vercel */
    try {
      await vercelRequest(`/v10/projects/${project.id}/domains`, {
        method: "POST",
        body: JSON.stringify({ name: fullDomain }),
      });
    } catch (e: any) {
      /* Domain might already exist, that's ok */
      if (!e.message?.includes("already exists")) {
        console.error("Vercel add domain error:", e.message);
      }
    }

    /* Save to database */
    if (existing.length > 0) {
      await db
        .update(customDomains)
        .set({
          websiteId: id,
          dnsRecordId,
          zoneId,
          status: "active",
        })
        .where(eq(customDomains.id, existing[0].id));
    } else {
      await db.insert(customDomains).values({
        orgId: ctx.orgId,
        websiteId: id,
        domain: fullDomain,
        rootDomain: mainDomain,
        subdomain,
        zoneId,
        dnsRecordId,
        recordType: "CNAME",
        target: "cname.vercel-dns.com",
        status: "active",
      });
    }

    /* Update website */
    const [updated] = await db
      .update(websites)
      .set({
        status: "published",
        subdomain,
        domain: fullDomain,
        publishedUrl: `https://${fullDomain}`,
      })
      .where(eq(websites.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      website: updated,
      url: `https://${fullDomain}`,
    });

  } catch (e: any) {
    console.error("Publish error:", e);
    return NextResponse.json({ error: e.message || "Failed to publish" }, { status: 500 });
  }
}

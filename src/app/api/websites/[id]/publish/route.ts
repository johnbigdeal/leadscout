import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { websites, memberships, customDomains, cloudflareAccounts, availableDomains, subscriptions } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getPlanLimits } from "@/lib/plans";

export const dynamic = "force-dynamic";

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

/* Find Vercel project */
async function getVercelProject() {
  const projects = await vercelRequest("/v9/projects");
  const project = projects.projects.find((p: any) =>
    p.name === "leadscout" ||
    p.alias?.some((a: any) => a.domain === "leadscout.lat")
  ) || projects.projects[0];
  if (!project) throw new Error("Vercel project not found");
  return project;
}

/* Add domain to Vercel (ignore already exists) */
async function addDomainToVercel(projectId: string, domain: string) {
  try {
    await vercelRequest(`/v10/projects/${projectId}/domains`, {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    });
  } catch (e: any) {
    if (!e.message?.includes("already exists")) {
      console.error("Vercel add domain error:", e.message);
      throw e;
    }
  }
}

/* POST /api/websites/[id]/publish */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  if (ctx.role !== "superadmin" && ctx.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { subdomain: requestedSubdomain, rootDomain: requestedRootDomain, customDomain } = await request.json();

  const rows = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const website = rows[0];

  const project = await getVercelProject();

  /* ─── CUSTOM DOMAIN (Pro only + user's Cloudflare) ─── */
  if (customDomain) {
    /* Get Cloudflare credentials */
    const cfRows = await db
      .select({ apiToken: cloudflareAccounts.apiToken })
      .from(cloudflareAccounts)
      .where(eq(cloudflareAccounts.orgId, ctx.orgId))
      .limit(1);

    if (cfRows.length === 0) {
      return NextResponse.json({ error: "Cloudflare not connected. Go to Settings → Domains first." }, { status: 400 });
    }
    const cfToken = cfRows[0].apiToken;

    /* Check plan - custom domains are Pro only. Super admin bypass. */
    if (!ctx.isSuperAdmin) {
      const limits = await getPlanLimits(ctx.orgId);
      if (!limits.canPublishToCustomDomain) {
        return NextResponse.json(
          { error: "Dominios personalizados disponibles solo en plan Pro. Upgrade para publicar en tu propio dominio." },
          { status: 403 }
        );
      }
    }

    /* Validate domain format */
    const cleanDomain = customDomain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(cleanDomain)) {
      return NextResponse.json({ error: "Formato de dominio inválido" }, { status: 400 });
    }

    /* Find zone in Cloudflare */
    const zones = await cfRequest(cfToken, `/zones?name=${cleanDomain}`);
    if (!zones || zones.length === 0) {
      return NextResponse.json({ error: `No se encontró la zona para ${cleanDomain} en tu cuenta de Cloudflare. Asegurate de haber agregado el dominio a Cloudflare primero.` }, { status: 400 });
    }
    const resolvedZoneId = zones[0].id;

    /* Create A record @ → 76.76.21.21 */
    const apexRecord = await cfRequest(cfToken, `/zones/${resolvedZoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "A",
        name: "@",
        content: "76.76.21.21",
        ttl: 1,
        proxied: false,
      }),
    });

    /* Create CNAME www → cname.vercel-dns.com */
    const wwwRecord = await cfRequest(cfToken, `/zones/${resolvedZoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: "www",
        content: "cname.vercel-dns.com",
        ttl: 1,
        proxied: false,
      }),
    });

    /* Add to Vercel */
    await addDomainToVercel(project.id, cleanDomain);
    await addDomainToVercel(project.id, `www.${cleanDomain}`);

    /* Delete old custom domains for this website */
    await db.delete(customDomains).where(eq(customDomains.websiteId, id));

    /* Save new custom domains */
    await db.insert(customDomains).values({
      orgId: ctx.orgId,
      websiteId: id,
      domain: cleanDomain,
      rootDomain: cleanDomain,
      subdomain: "@",
      zoneId: resolvedZoneId,
      dnsRecordId: apexRecord.id,
      recordType: "A",
      target: "76.76.21.21",
      status: "active",
    });
    await db.insert(customDomains).values({
      orgId: ctx.orgId,
      websiteId: id,
      domain: `www.${cleanDomain}`,
      rootDomain: cleanDomain,
      subdomain: "www",
      zoneId: resolvedZoneId,
      dnsRecordId: wwwRecord.id,
      recordType: "CNAME",
      target: "cname.vercel-dns.com",
      status: "active",
    });

    /* Update website */
    const [updated] = await db
      .update(websites)
      .set({
        status: "published",
        subdomain: null,
        domain: cleanDomain,
        publishedUrl: `https://${cleanDomain}`,
      })
      .where(eq(websites.id, id))
      .returning();

    return NextResponse.json({ success: true, website: updated, url: `https://${cleanDomain}` });
  }

  /* ─── SUBDOMAIN (uses system Cloudflare token) ─── */
  /* Get Cloudflare token: prefer system env var, fallback to org's Cloudflare */
  const subdomainCfToken = process.env.CLOUDFLARE_API_TOKEN || (
    (await db
      .select({ apiToken: cloudflareAccounts.apiToken })
      .from(cloudflareAccounts)
      .where(eq(cloudflareAccounts.orgId, ctx.orgId))
      .limit(1)
    )[0]?.apiToken
  );

  if (!subdomainCfToken) {
    return NextResponse.json({ error: "No se pudo conectar con Cloudflare para publicar. Contacta al administrador." }, { status: 500 });
  }

  /* Check plan for domain access control */
  const [sub] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, ctx.orgId))
    .limit(1);
  const plan = sub?.plan || "free";

  /* Resolve root domain */
  let mainDomain: string | null = null;
  let zoneId: string | null = null;

  /* Free plan: force leadscout.lat */
  if (plan === "free") {
    mainDomain = "leadscout.lat";
    const [g] = await db
      .select()
      .from(availableDomains)
      .where(and(eq(availableDomains.domain, "leadscout.lat"), eq(availableDomains.isGlobal, true)))
      .limit(1);
    if (g) zoneId = g.zoneId;
  } else {
    /* Pro plan: use requestedRootDomain if provided */
    mainDomain = requestedRootDomain;
    if (!mainDomain) {
      /* Find default domain (org-specific first, then global) */
      const [orgDefault] = await db
        .select()
        .from(availableDomains)
        .where(and(eq(availableDomains.orgId, ctx.orgId), eq(availableDomains.isDefault, true), eq(availableDomains.isActive, true)))
        .limit(1);
      if (orgDefault) {
        mainDomain = orgDefault.domain;
        zoneId = orgDefault.zoneId;
      } else {
        const [globalDefault] = await db
          .select()
          .from(availableDomains)
          .where(and(eq(availableDomains.isGlobal, true), eq(availableDomains.isDefault, true)))
          .limit(1);
        if (globalDefault) {
          mainDomain = globalDefault.domain;
          zoneId = globalDefault.zoneId;
        } else {
          mainDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "leadscout.lat";
        }
      }
    }
  }

  /* Resolve zoneId from DB if not already set */
  if (mainDomain && !zoneId) {
    const [matched] = await db
      .select()
      .from(availableDomains)
      .where(
        and(
          eq(availableDomains.domain, mainDomain),
          eq(availableDomains.isActive, true),
          or(eq(availableDomains.orgId, ctx.orgId), eq(availableDomains.isGlobal, true))
        )
      )
      .limit(1);
    if (matched) zoneId = matched.zoneId;
  }

  /* Generate subdomain */
  let subdomain = requestedSubdomain;
  if (!subdomain) {
    const data = website.data as Record<string, any>;
    const name = data?.businessName || website.name || "site";
    subdomain = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 62);
  }

  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain format" }, { status: 400 });
  }

  const fullDomain = `${subdomain}.${mainDomain}`;

  /* Check if taken */
  const existing = await db.select().from(customDomains).where(eq(customDomains.domain, fullDomain)).limit(1);
  if (existing.length > 0 && existing[0].websiteId !== id) {
    return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
  }

  /* Resolve zone */
  let resolvedZoneId = zoneId;
  if (!resolvedZoneId) {
    const zones = await cfRequest(subdomainCfToken, `/zones?name=${mainDomain}`);
    if (!zones || zones.length === 0) {
      return NextResponse.json({ error: `Zone not found for ${mainDomain}` }, { status: 400 });
    }
    resolvedZoneId = zones[0].id;
  }

  /* Create/update DNS */
  let dnsRecordId = existing[0]?.dnsRecordId;
  if (dnsRecordId) {
    await cfRequest(subdomainCfToken, `/zones/${resolvedZoneId}/dns_records/${dnsRecordId}`, {
      method: "PATCH",
      body: JSON.stringify({ type: "CNAME", name: subdomain, content: "cname.vercel-dns.com", ttl: 1, proxied: false }),
    });
  } else {
    const record = await cfRequest(subdomainCfToken, `/zones/${resolvedZoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({ type: "CNAME", name: subdomain, content: "cname.vercel-dns.com", ttl: 1, proxied: false }),
    });
    dnsRecordId = record.id;
  }

  /* Add to Vercel */
  await addDomainToVercel(project.id, fullDomain);

  /* Save to DB */
  if (!dnsRecordId || !resolvedZoneId) {
    return NextResponse.json({ error: "Failed to create DNS record" }, { status: 500 });
  }
  const recordId: string = dnsRecordId;
  const zId: string = resolvedZoneId;
  if (existing.length > 0) {
    await db.update(customDomains).set({ websiteId: id, dnsRecordId: recordId, zoneId: zId, status: "active" }).where(eq(customDomains.id, existing[0].id));
  } else {
    await db.insert(customDomains).values({
      orgId: ctx.orgId, websiteId: id, domain: fullDomain, rootDomain: mainDomain, subdomain,
      zoneId: zId, dnsRecordId: recordId, recordType: "CNAME", target: "cname.vercel-dns.com", status: "active",
    });
  }

  /* Update website */
  const [updated] = await db
    .update(websites)
    .set({ status: "published", subdomain, domain: fullDomain, publishedUrl: `https://${fullDomain}` })
    .where(eq(websites.id, id))
    .returning();

  return NextResponse.json({ success: true, website: updated, url: `https://${fullDomain}` });
}

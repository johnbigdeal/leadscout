import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { websites, memberships, customDomains, availableDomains, subscriptions } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { getPlanLimits } from "@/lib/plans";
import { getValidCfToken } from "@/lib/integrations/cloudflare";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

/* Purge Cloudflare cache for URLs */
async function cfPurgeCache(token: string, zoneId: string, urls: string[]) {
  try {
    await cfRequest(token, `/zones/${zoneId}/purge_cache`, {
      method: "POST",
      body: JSON.stringify({ files: urls }),
    });
  } catch (e: any) {
    console.error("Cloudflare purge cache error:", e.message);
  }
}

/* Create a DNS record if it doesn't already exist (idempotent); update its
   content if it drifted. `name` must be the full hostname (apex = the root
   domain itself, e.g. "sitio.com"; or "www.sitio.com"). Returns the record id. */
async function ensureDnsRecord(token: string, zoneId: string, type: string, name: string, content: string) {
  const existing = await cfRequest(token, `/zones/${zoneId}/dns_records?type=${type}&name=${name}`);
  if (existing && existing.length > 0) {
    const rec = existing[0];
    if (rec.content !== content) {
      const updated = await cfRequest(token, `/zones/${zoneId}/dns_records/${rec.id}`, {
        method: "PATCH",
        body: JSON.stringify({ type, name, content, ttl: 1, proxied: false }),
      });
      return updated.id;
    }
    return rec.id;
  }
  const created = await cfRequest(token, `/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({ type, name, content, ttl: 1, proxied: false }),
  });
  return created.id;
}

/* Ensure wildcard CNAME exists for a root domain */
async function ensureWildcardRecord(token: string, zoneId: string, rootDomain: string) {
  try {
    const records = await cfRequest(token, `/zones/${zoneId}/dns_records?name=*.${rootDomain}&type=CNAME`);
    if (records && records.length > 0) return records[0].id;

    const record = await cfRequest(token, `/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: "*",
        content: "cname.vercel-dns.com",
        ttl: 1,
        proxied: false,
      }),
    });
    return record.id;
  } catch (e: any) {
    console.error("Ensure wildcard record error:", e.message);
    return null;
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
    /* Get Cloudflare credentials (renueva el token OAuth si expiró) */
    const cfToken = await getValidCfToken(ctx.orgId);
    if (!cfToken) {
      return NextResponse.json({ error: "Cloudflare not connected. Go to Settings → Domains first." }, { status: 400 });
    }

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

    /* Apex A record (@ → 76.76.21.21) and www CNAME → cname.vercel-dns.com.
       Idempotent: reused on re-publish instead of failing with "already exists". */
    const apexRecordId = await ensureDnsRecord(cfToken, resolvedZoneId, "A", cleanDomain, "76.76.21.21");
    const wwwRecordId = await ensureDnsRecord(cfToken, resolvedZoneId, "CNAME", `www.${cleanDomain}`, "cname.vercel-dns.com");

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
      dnsRecordId: apexRecordId,
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
      dnsRecordId: wwwRecordId,
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

    /* Purga la caché de Cloudflare para el apex y www (paridad con el flujo de subdominio) */
    await cfPurgeCache(cfToken, resolvedZoneId, [`https://${cleanDomain}/`, `https://www.${cleanDomain}/`]);

    return NextResponse.json({ success: true, website: updated, url: `https://${cleanDomain}` });
  }

  /* ─── SUBDOMAIN ─── */
  /* Check plan for domain access control */
  const [sub] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, ctx.orgId))
    .limit(1);
  /* Superadmins get Pro behaviour (choose any root domain). Otherwise free orgs
     only get domains globales con accessLevel free|both. */
  const plan = ctx.isSuperAdmin ? "pro" : (sub?.plan || "free");
  const allowedLevels = plan === "pro" ? ["pro", "both"] : ["free", "both"];

  /* Resolve root domain (+ zoneId + org dueña del dominio para el token) */
  let mainDomain: string | null = null;
  let zoneId: string | null = null;
  let domainOwnerOrgId: string | null = null;
  let domainIsGlobal = false;

  if (requestedRootDomain) {
    /* Validar acceso: dominio propio activo, o global con accessLevel del plan. */
    const [row] = await db
      .select()
      .from(availableDomains)
      .where(
        and(
          eq(availableDomains.domain, requestedRootDomain),
          eq(availableDomains.isActive, true),
          or(
            eq(availableDomains.orgId, ctx.orgId),
            and(eq(availableDomains.isGlobal, true), inArray(availableDomains.accessLevel, allowedLevels)),
          ),
        ),
      )
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: "Ese dominio no está disponible para tu plan." }, { status: 400 });
    }
    mainDomain = row.domain;
    zoneId = row.zoneId;
    domainOwnerOrgId = row.orgId;
    domainIsGlobal = row.isGlobal === true;
  } else {
    /* Sin dominio pedido: default de la org (Pro) → default global del plan → leadscout.lat */
    if (plan !== "free") {
      const [orgDefault] = await db
        .select()
        .from(availableDomains)
        .where(and(eq(availableDomains.orgId, ctx.orgId), eq(availableDomains.isDefault, true), eq(availableDomains.isActive, true)))
        .limit(1);
      if (orgDefault) {
        mainDomain = orgDefault.domain;
        zoneId = orgDefault.zoneId;
        domainOwnerOrgId = orgDefault.orgId;
        domainIsGlobal = orgDefault.isGlobal === true;
      }
    }
    if (!mainDomain) {
      const [globalDefault] = await db
        .select()
        .from(availableDomains)
        .where(and(eq(availableDomains.isGlobal, true), eq(availableDomains.isDefault, true), eq(availableDomains.isActive, true), inArray(availableDomains.accessLevel, allowedLevels)))
        .limit(1);
      if (globalDefault) {
        mainDomain = globalDefault.domain;
        zoneId = globalDefault.zoneId;
        domainOwnerOrgId = globalDefault.orgId;
        domainIsGlobal = true;
      } else {
        /* Fallback: leadscout.lat (dominio global de la plataforma) */
        mainDomain = "leadscout.lat";
        domainIsGlobal = true;
        const [g] = await db
          .select()
          .from(availableDomains)
          .where(and(eq(availableDomains.domain, "leadscout.lat"), eq(availableDomains.isGlobal, true)))
          .limit(1);
        if (g) {
          zoneId = g.zoneId;
          domainOwnerOrgId = g.orgId;
        }
      }
    }
  }

  /* Resolver el token de Cloudflare priorizando al DUEÑO REAL de la zona.
     Para dominios propios de una org (no globales) la zona vive en la cuenta
     Cloudflare de esa org, así que el token del sistema (que solo tiene acceso a
     leadscout.lat) no sirve — hay que usar el token de la org dueña. Para dominios
     globales/plataforma, el token del sistema es el correcto. */
  let subdomainCfToken: string | null = null;
  if (!domainIsGlobal && domainOwnerOrgId) {
    subdomainCfToken = await getValidCfToken(domainOwnerOrgId);
  }
  if (!subdomainCfToken) {
    subdomainCfToken = process.env.CLOUDFLARE_API_TOKEN || null;
  }
  if (!subdomainCfToken && domainOwnerOrgId) {
    subdomainCfToken = await getValidCfToken(domainOwnerOrgId);
  }
  if (!subdomainCfToken) {
    subdomainCfToken = await getValidCfToken(ctx.orgId);
  }
  if (!subdomainCfToken) {
    return NextResponse.json({ error: "No se pudo conectar con Cloudflare para publicar. Contacta al administrador." }, { status: 500 });
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

  if (!resolvedZoneId || !mainDomain) {
    return NextResponse.json({ error: "Failed to resolve zone" }, { status: 500 });
  }

  /* Ensure DNS resolves. Preferimos el comodín (*.rootDomain) para propagación
     instantánea — igual que leadscout.lat. Si no se pudo crear (p. ej. el token no
     tiene permiso sobre esa zona), NO seguimos con un "éxito" fantasma: creamos un
     CNAME individual para este subdominio exacto como fallback, o devolvemos error. */
  let dnsRecordIdToSave: string | null = null;
  const wildcardId = await ensureWildcardRecord(subdomainCfToken, resolvedZoneId, mainDomain);
  if (wildcardId) {
    /* Comodín OK: el routing lo maneja él. Borrar cualquier registro individual legacy. */
    if (existing[0]?.dnsRecordId) {
      try {
        await cfRequest(subdomainCfToken, `/zones/${resolvedZoneId}/dns_records/${existing[0].dnsRecordId}`, { method: "DELETE" });
      } catch (e: any) {
        console.error("Failed to delete legacy subdomain record:", e.message);
      }
    }
  } else {
    /* Comodín falló: crear CNAME individual para el subdominio (idempotente). */
    try {
      dnsRecordIdToSave = await ensureDnsRecord(subdomainCfToken, resolvedZoneId, "CNAME", fullDomain, "cname.vercel-dns.com");
    } catch (e: any) {
      console.error("Failed to create individual subdomain record:", e.message);
      return NextResponse.json(
        { error: `No se pudo crear el registro DNS en Cloudflare para ${fullDomain}. Verificá que la zona esté en la cuenta correcta y que el token tenga permisos de edición de DNS.` },
        { status: 502 },
      );
    }
  }

  /* Add the specific subdomain to Vercel so it gets its own SSL cert (HTTP-01).
     The wildcard CNAME above only handles DNS routing; the per-subdomain add is
     what actually provisions the certificate (wildcard certs are not auto-issued
     for Cloudflare-nameserver domains). */
  await addDomainToVercel(project.id, fullDomain);

  /* If this website was previously published on a different domain, remove the
     stale domain (Vercel + DB) so it doesn't keep resolving after a domain change. */
  const previous = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.websiteId, id), eq(customDomains.orgId, ctx.orgId)));
  for (const old of previous) {
    if (old.domain === fullDomain) continue;
    try {
      await vercelRequest(`/v9/projects/${project.id}/domains/${old.domain}`, { method: "DELETE" });
    } catch (e: any) {
      console.error("Failed to remove old Vercel domain:", e.message);
    }
    await db.delete(customDomains).where(eq(customDomains.id, old.id));
  }

  /* Save to DB. dnsRecordId = null cuando el comodín maneja el routing; el id del
     CNAME individual cuando fue el fallback. */
  const zId: string = resolvedZoneId;
  if (existing.length > 0) {
    await db.update(customDomains)
      .set({ websiteId: id, dnsRecordId: dnsRecordIdToSave, zoneId: zId, status: "active" })
      .where(eq(customDomains.id, existing[0].id));
  } else {
    await db.insert(customDomains).values({
      orgId: ctx.orgId, websiteId: id, domain: fullDomain, rootDomain: mainDomain, subdomain,
      zoneId: zId, dnsRecordId: dnsRecordIdToSave, recordType: "CNAME", target: "cname.vercel-dns.com", status: "active",
    });
  }

  /* Update website */
  const [updated] = await db
    .update(websites)
    .set({ status: "published", subdomain, domain: fullDomain, publishedUrl: `https://${fullDomain}` })
    .where(eq(websites.id, id))
    .returning();

  /* Purge Cloudflare cache for the URL */
  await cfPurgeCache(subdomainCfToken, zId, [`https://${fullDomain}/`]);

  return NextResponse.json({ success: true, website: updated, url: `https://${fullDomain}` });
}

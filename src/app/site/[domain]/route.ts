import { db } from "@/lib/db";
import { websites, customDomains, subscriptions, memberships, profiles } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { generateHTML } from "@/lib/paralux/generate-html";

export const dynamic = "force-dynamic";

/* GET /site/[domain] — serves the generated landing page as the real HTML
   document (not wrapped in an iframe) so it is crawlable and shareable. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;

  /* Look up website by custom domain first, then by website domain/subdomain */
  const domainRows = await db
    .select({ websiteId: customDomains.websiteId })
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .limit(1);

  let websiteId: string | null = null;
  if (domainRows.length > 0) {
    websiteId = domainRows[0].websiteId;
  } else {
    const siteRows = await db
      .select()
      .from(websites)
      .where(or(eq(websites.domain, domain), eq(websites.subdomain, domain)))
      .limit(1);
    if (siteRows.length > 0) websiteId = siteRows[0].id;
  }

  if (!websiteId) return notFoundResponse();

  const [site] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!site) return notFoundResponse();

  /* The "Hecho con LeadScout" badge is mandatory on Free sites. Pro sites may
     hide it via data.hideBadge. Plan is resolved from the owning org here so it
     cannot be bypassed by editing the stored site data. */
  const data = site.data as Record<string, unknown>;
  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, site.orgId))
    .limit(1);
  /* Pro si la org tiene subscripción Pro activa, o si la posee un super admin
     (mismo bypass que effectivePlan en /api/billing/plans y el publish route),
     para que ni la insignia ni el HTML custom queden inconsistentes con lo que
     el dueño ve en el builder. */
  let isPro = sub?.plan === "pro" && sub?.status === "active";
  if (!isPro) {
    const [admin] = await db
      .select({ id: profiles.id })
      .from(memberships)
      .innerJoin(profiles, eq(profiles.id, memberships.userId))
      .where(and(eq(memberships.orgId, site.orgId), eq(profiles.role, "super_admin")))
      .limit(1);
    if (admin) isPro = true;
  }
  const showBadge = isPro ? data.hideBadge !== true : true;

  const html = generateHTML(data, { showBadge, allowCustomCode: isPro });

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      /* Revalidate on every request; published changes purge the CDN cache */
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

function notFoundResponse() {
  return new Response(
    "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Sitio no encontrado</title></head><body style=\"font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#3f3f46\"><p>Este sitio no existe o aún no fue publicado.</p></body></html>",
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

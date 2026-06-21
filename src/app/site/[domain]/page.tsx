import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { websites, customDomains } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  return { title: domain };
}

export default async function SitePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;

  /* Look up website by domain or customDomains.domain */
  const domainRows = await db
    .select({ websiteId: customDomains.websiteId })
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .limit(1);

  let websiteId: string | null = null;
  if (domainRows.length > 0) {
    websiteId = domainRows[0].websiteId;
  } else {
    /* Try matching by subdomain/domain in websites table */
    const siteRows = await db
      .select()
      .from(websites)
      .where(or(eq(websites.domain, domain), eq(websites.subdomain, domain)))
      .limit(1);
    if (siteRows.length > 0) websiteId = siteRows[0].id;
  }

  if (!websiteId) return notFound();

  const [site] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!site || !site.html) return notFound();

  return (
    <div dangerouslySetInnerHTML={{ __html: site.html }} />
  );
}

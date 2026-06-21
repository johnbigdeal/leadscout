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

/* POST /api/websites/[id]/publish */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.orgId, ctx.orgId)))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const website = rows[0];

  if (!website.html) {
    return NextResponse.json({ error: "No HTML generated. Export from builder first." }, { status: 400 });
  }

  /* Check for custom domain */
  const domainRows = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.websiteId, id), eq(customDomains.orgId, ctx.orgId)))
    .limit(1);

  let publishedUrl = website.publishedUrl;

  if (domainRows.length > 0) {
    const domain = domainRows[0];
    publishedUrl = `https://${domain.domain}`;

    /* Update Cloudflare DNS if needed */
    const cfRows = await db
      .select({ apiToken: cloudflareAccounts.apiToken })
      .from(cloudflareAccounts)
      .where(eq(cloudflareAccounts.orgId, ctx.orgId))
      .limit(1);

    if (cfRows.length > 0 && domain.dnsRecordId) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${domain.zoneId}/dns_records/${domain.dnsRecordId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${cfRows[0].apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") || "cname.vercel-dns.com",
          }),
        });
      } catch (e) {
        console.error("Failed to update Cloudflare DNS:", e);
      }
    }
  }

  /* Update website status */
  const [updated] = await db
    .update(websites)
    .set({ status: "published", publishedUrl })
    .where(eq(websites.id, id))
    .returning();

  return NextResponse.json({
    success: true,
    website: updated,
    url: publishedUrl,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import {
  memberships, searches, apifyRuns, businesses, businessSeo,
  opportunityScores, searchBusinesses, socialProfiles, profiles,
} from "@/lib/db/schema";
import { eq, and, gt, or, ilike } from "drizzle-orm";
import { startGooglePlacesSearch, searchInstagram, scrapeLinkedInComments, apifyClient } from "@/lib/integrations/apify";
import { getPageSpeedInsights } from "@/lib/integrations/pagespeed";
import { scrapeWebsiteContact } from "@/lib/integrations/scraper";
import { getPlanLimits, incrementSearchCount } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const CACHE_TTL_DAYS = 7;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9áéíóúüñ\s]/g, "").replace(/\s+/g, " ").trim();
}

async function findMatchingBusiness(name: string, phone?: string | null, address?: string | null): Promise<string | null> {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const all = await db.select().from(businesses);
  for (const b of all) {
    if (phone && b.phone && phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "")) {
      return b.id;
    }
    if (normalizeName(b.name) === normalized) {
      return b.id;
    }
  }
  return null;
}

async function processGoogleResults(searchId: string, queries: string[], locationQuery: string) {
  const run = await startGooglePlacesSearch(queries, locationQuery, 100);
  const cost = String((run as any).usageUsd?.ACTOR_COMPUTE_UNITS ?? 0);

  await db.insert(apifyRuns).values({
    searchId, actorId: "compass/crawler-google-places", runId: run.id, status: "completed", costUsd: cost,
  });

  const { items } = await apifyClient.run(run.id!).dataset().listItems();
  const cacheCutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const upserted: (typeof businesses.$inferSelect)[] = [];

  for (const item of items as Record<string, unknown>[]) {
    const placeId = item.placeId as string;
    if (!placeId) continue;

    const cached = await db.select().from(businesses)
      .where(and(eq(businesses.placeId, placeId), gt(businesses.fetchedAt, cacheCutoff))).limit(1);

    if (cached.length > 0) { upserted.push(cached[0]); continue; }

    const website = (item.website as string) || null;
    const phone = (item.phone as string) || null;
    const isWhatsapp = phone ? /^(\+?5[45]|52|57|51|506|503|502|595|591|593)/.test(phone.replace(/\s/g, "")) : false;

    const [biz] = await db.insert(businesses).values({
      placeId, source: "google",
      name: (item.title as string) ?? (item.name as string) ?? "Unknown",
      address: (item.address as string) || null, phone, isWhatsapp, country: (item.country as string) || null,
      website, hasWebsite: !!website, lat: (item.latitude as number) || null, lng: (item.longitude as number) || null,
      category: (item.category as string) || null, rating: item.rating ? String(item.rating) : null,
      reviewsCount: (item.reviewsCount as number) || null, rawJson: item,
    }).onConflictDoUpdate({
      target: businesses.placeId,
      set: {
        name: (item.title as string) ?? (item.name as string) ?? "Unknown",
        address: (item.address as string) || null, phone, isWhatsapp, website, hasWebsite: !!website,
        lat: (item.latitude as number) || null, lng: (item.longitude as number) || null,
        category: (item.category as string) || null, rating: item.rating ? String(item.rating) : null,
        reviewsCount: (item.reviewsCount as number) || null, rawJson: item, fetchedAt: new Date(),
      },
    }).returning();

    upserted.push(biz);
  }

  return upserted;
}

async function processInstagramResults(searchId: string, keywords: string[]) {
  const allResults: Record<string, unknown>[] = [];

  for (const q of keywords) {
    try {
      const run = await searchInstagram(q, 10);
      const cost = String((run as any).usageUsd?.ACTOR_COMPUTE_UNITS ?? 0);

      await db.insert(apifyRuns).values({
        searchId, actorId: "apify/instagram-search-scraper", runId: run.id, status: "completed", costUsd: cost,
      });

      const dataset = await apifyClient.run(run.id!).dataset().listItems();
      allResults.push(...(dataset.items as Record<string, unknown>[]));
    } catch (e) {
      console.error("Instagram search error for", q, e);
    }
  }

  const seen = new Set<string>();
  const upserted: (typeof businesses.$inferSelect)[] = [];

  for (const item of allResults) {
    const username = (item.ownerUsername as string) || (item.username as string);
    const fullName = (item.ownerFullName as string) || (item.fullName as string) || username;
    if (!username || seen.has(username)) continue;
    seen.add(username);

    const name = fullName || username;
    const existingId = await findMatchingBusiness(name);
    const igUrl = `https://www.instagram.com/${username}/`;

    if (existingId) {
      await db.insert(socialProfiles).values({
        businessId: existingId, platform: "instagram", url: igUrl,
        followers: (item.ownerFollowerCount as number) || (item.followerCount as number) || null,
        contact: (item.caption as string) || (item.biography as string) || null,
        rawJson: item,
      }).onConflictDoNothing();

      const biz = (await db.select().from(businesses).where(eq(businesses.id, existingId)).limit(1))[0];
      if (biz) upserted.push(biz);
      continue;
    }

    const [biz] = await db.insert(businesses).values({
      source: "instagram", placeId: `ig:${username}`,
      name, category: "Instagram",
      rawJson: item,
    }).returning();

    await db.insert(socialProfiles).values({
      businessId: biz.id, platform: "instagram", url: igUrl,
      followers: (item.ownerFollowerCount as number) || (item.followerCount as number) || null,
      contact: (item.caption as string) || (item.biography as string) || null,
      rawJson: item,
    }).onConflictDoNothing();

    upserted.push(biz);
  }

  return upserted;
}

async function processLinkedInComments(searchId: string, urls: string[]) {
  const allComments: Record<string, unknown>[] = [];

  for (const url of urls) {
    try {
      const run = await scrapeLinkedInComments(url, 100);
      const cost = String((run as any).usageUsd?.ACTOR_COMPUTE_UNITS ?? 0);

      await db.insert(apifyRuns).values({
        searchId, actorId: "benjarapi/linkedin-post-comments", runId: run.id, status: "completed", costUsd: cost,
      });

      const dataset = await apifyClient.run(run.id!).dataset().listItems();
      allComments.push(...(dataset.items as Record<string, unknown>[]));
    } catch (e) {
      console.error("LinkedIn comment scrape error for", url, e);
    }
  }

  const seen = new Set<string>();
  const upserted: (typeof businesses.$inferSelect)[] = [];

  for (const item of allComments) {
    const name = (item.authorName as string) || (item.name as string);
    const profileUrl = (item.authorProfileUrl as string) || (item.authorUrl as string);
    const headline = (item.authorHeadline as string) || (item.headline as string);
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const existingId = await findMatchingBusiness(name);
    if (existingId) {
      await db.insert(socialProfiles).values({
        businessId: existingId, platform: "linkedin", url: profileUrl || null,
        contact: headline || null,
        rawJson: item,
      }).onConflictDoNothing();

      const biz = (await db.select().from(businesses).where(eq(businesses.id, existingId)).limit(1))[0];
      if (biz) upserted.push(biz);
      continue;
    }

    const [biz] = await db.insert(businesses).values({
      source: "linkedin", placeId: `li:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      category: headline || null,
      rawJson: item,
    }).returning();

    await db.insert(socialProfiles).values({
      businessId: biz.id, platform: "linkedin", url: profileUrl || null,
      contact: headline || null,
      rawJson: item,
    }).onConflictDoNothing();

    upserted.push(biz);
  }

  return upserted;
}

async function runPostProcess(upserted: (typeof businesses.$inferSelect)[]) {
  for (const biz of upserted) {
    await db.insert(searchBusinesses).values({ searchId: "placeholder", businessId: biz.id }).onConflictDoNothing();
  }

  for (const biz of upserted) {
    if (biz.source === "google" && biz.website) {
      const ps = await getPageSpeedInsights(biz.website);
      await db.insert(businessSeo).values({
        businessId: biz.id, hasWebsite: true, pagespeedPerf: ps.performance, pagespeedSeo: ps.seo,
        pagespeedA11y: ps.accessibility, analyzedAt: new Date(),
      }).onConflictDoUpdate({
        target: businessSeo.businessId,
        set: { pagespeedPerf: ps.performance, pagespeedSeo: ps.seo, pagespeedA11y: ps.accessibility, analyzedAt: new Date() },
      });

      const contact = await scrapeWebsiteContact(biz.website);
      if (contact.email) {
        await db.update(businesses).set({ email: contact.email }).where(eq(businesses.id, biz.id));
      }
      if (contact.instagram) {
        await db.insert(socialProfiles).values({
          businessId: biz.id, platform: "instagram", url: contact.instagram,
        }).onConflictDoNothing();
      }
    }

    if (biz.source === "google" && !biz.website) {
      await db.insert(businessSeo).values({ businessId: biz.id, hasWebsite: false, analyzedAt: new Date() })
        .onConflictDoUpdate({ target: businessSeo.businessId, set: { hasWebsite: false, analyzedAt: new Date() } });
    }
  }

  for (const biz of upserted) {
    let score = 0;
    const reasons: string[] = [];
    const rating = biz.rating ? Number(biz.rating) : null;

    if (!biz.hasWebsite) { score += 30; reasons.push("Sin sitio web"); }
    if (rating && rating >= 3.0 && rating <= 4.2) { score += 20; reasons.push("Calificación 3.0–4.2"); }
    if ((biz.reviewsCount ?? 0) < 15) { score += 15; reasons.push("Menos de 15 reseñas"); }
    if (biz.isWhatsapp) { score += 10; reasons.push("WhatsApp disponible"); }

    const socials = await db.select().from(socialProfiles).where(eq(socialProfiles.businessId, biz.id));
    if (socials.some(s => s.platform === "instagram")) { score += 10; reasons.push("Instagram detectado"); }
    if (socials.some(s => s.platform === "linkedin")) { score += 10; reasons.push("LinkedIn detectado"); }

    await db.insert(opportunityScores).values({ businessId: biz.id, score, reasons })
      .onConflictDoUpdate({ target: opportunityScores.businessId, set: { score, reasons } });
  }
}

async function runPipeline(searchId: string, orgId: string, keywords: string, location: string, channels: string[], linkedinUrls: string[] = []) {
  try {
    await db.update(searches).set({ status: "running" }).where(eq(searches.id, searchId));

    const localities = location.split(",").map(l => l.trim());
    const queries = localities.map(loc => `${keywords} ${loc}`);
    const keywordTerms = keywords.split(",").map(k => k.trim()).filter(Boolean);

    const allUpserted: Map<string, typeof businesses.$inferSelect> = new Map();

    if (channels.includes("google")) {
      const googleBiz = await processGoogleResults(searchId, queries, location);
      googleBiz.forEach(b => allUpserted.set(b.id, b));
    }

    if (channels.includes("instagram")) {
      const igBiz = await processInstagramResults(searchId, keywordTerms.length ? keywordTerms : [keywords]);
      igBiz.forEach(b => {
        if (!allUpserted.has(b.id)) allUpserted.set(b.id, b);
      });
    }

    if (channels.includes("linkedin")) {
      const liBiz = await processLinkedInComments(searchId, linkedinUrls);
      liBiz.forEach(b => {
        if (!allUpserted.has(b.id)) allUpserted.set(b.id, b);
      });
    }

    const finalUpserted = Array.from(allUpserted.values());

    for (const biz of finalUpserted) {
      await db.insert(searchBusinesses).values({ searchId, businessId: biz.id }).onConflictDoNothing();
    }

    await runPostProcess(finalUpserted);

    let totalCost = "0";
    const runs = await db.select().from(apifyRuns).where(eq(apifyRuns.searchId, searchId));
    if (runs.length > 0) {
      totalCost = String(runs.reduce((sum, r) => sum + Number(r.costUsd), 0));
    }

    await db.update(searches).set({ status: "done", totalCost }).where(eq(searches.id, searchId));
  } catch (err: any) {
    console.error("Pipeline error:", err?.message || err, err?.stack);
    await db.update(searches).set({ status: "error" }).where(eq(searches.id, searchId));
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "No org found" }, { status: 403 });
  }

  const { keywords, location, channels = ["google"], linkedinUrls = [] } = await request.json();
  const orgId = membership.orgId;

  /* Check if user is super admin */
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const isSuperAdmin = profile?.role === "super_admin";

  /* Check plan limits - Free: 1 search/day. Super admin bypass. */
  let searchesRemaining = Infinity;
  if (!isSuperAdmin) {
    const limits = await getPlanLimits(orgId);
    if (!limits.canSearch) {
      return NextResponse.json(
        { error: "Límite de búsquedas alcanzado. Upgrade a Pro para búsquedas ilimitadas." },
        { status: 429 }
      );
    }
    searchesRemaining = limits.searchesRemaining;
  }

  const [search] = await db
    .insert(searches)
    .values({ orgId, createdBy: user.id, keywords, location, channels, status: "running" })
    .returning();

  await runPipeline(search.id, orgId, keywords, location, channels, linkedinUrls);

  /* Increment search counter - skip for super admin */
  if (!isSuperAdmin) {
    await incrementSearchCount(orgId);
  }

  const updated = await db.select({ status: searches.status }).from(searches).where(eq(searches.id, search.id)).limit(1);
  return NextResponse.json({ searchId: search.id, status: updated[0]?.status ?? "error" });
}

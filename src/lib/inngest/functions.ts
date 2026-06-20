import { db } from "@/lib/db";
import {
  searches,
  apifyRuns,
  businesses,
  businessSeo,
  socialProfiles,
  opportunityScores,
  usageEvents,
  searchBusinesses,
} from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { inngest } from "./client";
import { startGooglePlacesSearch, searchInstagram } from "@/lib/integrations/apify";
import { getPageSpeedInsights } from "@/lib/integrations/pagespeed";

const CACHE_TTL_DAYS = 7;

export const processSearch = inngest.createFunction(
  {
    id: "process-search",
    triggers: [{ event: "search/requested" }],
  },
  async ({ event, step }) => {
    const { searchId, orgId, keywords, location, channels } = event.data;

    await step.run("update-status-running", async () => {
      await db
        .update(searches)
        .set({ status: "running" })
        .where(eq(searches.id, searchId));
    });

    // Step 1: Fan out Google Maps search by locality
    const localities = location.split(",").map((l: string) => l.trim());
    const queries = localities.map(
      (loc: string) => `${keywords} ${loc}`,
    );

    await step.run("start-google-places", async () => {
      const run = await startGooglePlacesSearch(queries, location, 100);
      await db.insert(apifyRuns).values({
        searchId,
        actorId: "compass/crawler-google-places",
        runId: run.id,
        status: "completed",
        costUsd: String((run as any).usageUsd?.ACTOR_COMPUTE_UNITS ?? 0),
      });
    });

    // Step 2: Process results — upsert businesses (global cache)
    const results = await step.run("fetch-and-upsert", async () => {
      const runRecords = await db
        .select()
        .from(apifyRuns)
        .where(
          and(
            eq(apifyRuns.searchId, searchId),
            eq(apifyRuns.status, "completed"),
          ),
        )
        .limit(1);

      if (runRecords.length === 0) return [];

      const { apifyClient } = await import("@/lib/integrations/apify");
      const { items } = await apifyClient.run(runRecords[0].runId!).dataset().listItems();
      const cacheCutoff = new Date(
        Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000,
      );

      const upserted: (typeof businesses.$inferSelect)[] = [];

      for (const item of items as Record<string, unknown>[]) {
        const placeId = item.placeId as string;
        if (!placeId) continue;

        const cached = await db
          .select()
          .from(businesses)
          .where(
            and(
              eq(businesses.placeId, placeId),
              gt(businesses.fetchedAt, cacheCutoff),
            ),
          )
          .limit(1);

        if (cached.length > 0) {
          upserted.push(cached[0]);
          continue;
        }

        const website = (item.website as string) || null;
        const phone = (item.phone as string) || null;
        const isWhatsapp = phone
          ? /^(\+?5[45]|52|57|51|506|503|502|595|591|593)/.test(
              phone.replace(/\s/g, ""),
            )
          : false;

        const [biz] = await db
          .insert(businesses)
          .values({
            placeId,
            name: (item.title as string) ?? (item.name as string) ?? "Unknown",
            address: (item.address as string) || null,
            phone,
            isWhatsapp,
            country: (item.country as string) || null,
            website,
            hasWebsite: !!website,
            lat: (item.latitude as number) || null,
            lng: (item.longitude as number) || null,
            category: (item.category as string) || null,
            rating: item.rating ? String(item.rating) : null,
            reviewsCount: (item.reviewsCount as number) || null,
            rawJson: item,
          })
          .onConflictDoUpdate({
            target: businesses.placeId,
            set: {
              name: (item.title as string) ?? (item.name as string) ?? "Unknown",
              address: (item.address as string) || null,
              phone,
              isWhatsapp,
              website,
              hasWebsite: !!website,
              lat: (item.latitude as number) || null,
              lng: (item.longitude as number) || null,
              category: (item.category as string) || null,
              rating: item.rating ? String(item.rating) : null,
              reviewsCount: (item.reviewsCount as number) || null,
              rawJson: item,
              fetchedAt: new Date(),
            },
          })
          .returning();

        upserted.push(biz);
      }

      for (const biz of upserted) {
        await db.insert(searchBusinesses).values({
          searchId,
          businessId: biz.id,
        }).onConflictDoNothing();
      }

      return upserted;
    });

    // Step 3: Enrich — PageSpeed for websites
    await step.run("enrich-pagespeed", async () => {
      for (const biz of results) {
        if (biz.website) {
          const ps = await getPageSpeedInsights(biz.website);
          await db
            .insert(businessSeo)
            .values({
              businessId: biz.id,
              hasWebsite: true,
              pagespeedPerf: ps.performance,
              pagespeedSeo: ps.seo,
              pagespeedA11y: ps.accessibility,
              analyzedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: businessSeo.businessId,
              set: {
                pagespeedPerf: ps.performance,
                pagespeedSeo: ps.seo,
                pagespeedA11y: ps.accessibility,
                analyzedAt: new Date(),
              },
            });
        } else {
          await db
            .insert(businessSeo)
            .values({
              businessId: biz.id,
              hasWebsite: false,
              analyzedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: businessSeo.businessId,
              set: { hasWebsite: false, analyzedAt: new Date() },
            });
        }
      }
    });

    // Step 4: Compute opportunity scores (LATAM model)
    await step.run("compute-scores", async () => {
      for (const biz of results) {
        let score = 0;
        const reasons: string[] = [];

        const seo = await db
          .select()
          .from(businessSeo)
          .where(eq(businessSeo.businessId, biz.id))
          .limit(1);

        const socials = await db
          .select()
          .from(socialProfiles)
          .where(eq(socialProfiles.businessId, biz.id));

        const hasActiveIg = socials.some(
          (s) => s.platform === "instagram" && (s.followers ?? 0) > 0,
        );

        if (!biz.hasWebsite && hasActiveIg) {
          score += 40;
          reasons.push("Sin sitio web pero IG activo");
        }

        const rating = biz.rating ? Number(biz.rating) : null;
        if (rating && rating >= 3.0 && rating <= 4.2) {
          score += 20;
          reasons.push("Calificación 3.0–4.2");
        }

        if ((biz.reviewsCount ?? 0) < 15) {
          score += 15;
          reasons.push("Menos de 15 reseñas");
        }

        if (biz.isWhatsapp) {
          score += 10;
          reasons.push("WhatsApp disponible");
        }

        if (seo[0]?.pagespeedSeo != null && seo[0].pagespeedSeo < 50) {
          score += 20;
          reasons.push("PageSpeed SEO bajo");
        }

        await db
          .insert(opportunityScores)
          .values({ businessId: biz.id, score, reasons })
          .onConflictDoUpdate({
            target: opportunityScores.businessId,
            set: { score, reasons },
          });
      }
    });

    // Step 5: Record usage and mark search done
    await step.run("mark-done", async () => {
      const runRecords = await db
        .select()
        .from(apifyRuns)
        .where(eq(apifyRuns.searchId, searchId));

      let totalCost = 0;
      for (const run of runRecords) {
        totalCost += Number(run.costUsd);
        await db.insert(usageEvents).values({
          orgId,
          searchId,
          actorId: run.actorId,
          costUsd: run.costUsd,
        });
      }

      await db
        .update(searches)
        .set({
          status: "done",
          totalCost: String(totalCost),
        })
        .where(eq(searches.id, searchId));
    });

    return { searchId, resultsCount: results.length };
  },
);

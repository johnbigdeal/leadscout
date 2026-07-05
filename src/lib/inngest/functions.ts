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
  subscriptions,
  organizations,
  memberships,
  profiles,
} from "@/lib/db/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { inngest } from "./client";
import { startGooglePlacesSearch, searchInstagram } from "@/lib/integrations/apify";
import { getPageSpeedInsights } from "@/lib/integrations/pagespeed";
import { isGmbUnclaimed } from "@/lib/business-attributes";
import { sendEmail, trialReminder3DaysHtml, trialExpiredHtml, dataDeletionWarningHtml, dataDeletedHtml } from "@/lib/integrations/resend";

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

        if (isGmbUnclaimed(biz.rawJson)) {
          score += 30;
          reasons.push("Ficha de Google sin reclamar");
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

/* ───── Trial email reminders ───── */

async function getOrgAdminEmail(orgId: string): Promise<{ email: string; name: string } | null> {
  const [membership] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.role, "owner")))
    .limit(1);

  if (!membership) return null;

  const [profile] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, membership.userId))
    .limit(1);

  if (!profile) return null;

  return { email: profile.email, name: profile.email.split("@")[0] };
}

export const trialReminder3Days = inngest.createFunction(
  {
    id: "trial-reminder-3-days",
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 12 * * *" }],
  },
  async ({ step }) => {
    const target = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const expiredSoon = await db
      .select({ orgId: subscriptions.orgId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.plan, "free"),
          sql`${subscriptions.trialEndsAt} IS NOT NULL`,
          sql`${subscriptions.trialEndsAt} < ${target}`,
          sql`${subscriptions.trialEndsAt} > ${new Date()}`,
        ),
      );

    for (const sub of expiredSoon) {
      await step.run(`send-reminder-${sub.orgId}`, async () => {
        const admin = await getOrgAdminEmail(sub.orgId);
        if (!admin) return;
        await sendEmail({
          to: admin.email,
          subject: "Tu prueba gratuita termina en 3 días",
          html: trialReminder3DaysHtml(admin.name, 3),
        });
      });
    }

    return { sent: expiredSoon.length };
  },
);

export const trialReminder1Day = inngest.createFunction(
  {
    id: "trial-reminder-1-day",
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 12 * * *" }],
  },
  async ({ step }) => {
    const target = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    const expiredSoon = await db
      .select({ orgId: subscriptions.orgId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.plan, "free"),
          sql`${subscriptions.trialEndsAt} IS NOT NULL`,
          sql`${subscriptions.trialEndsAt} < ${target}`,
          sql`${subscriptions.trialEndsAt} > ${new Date()}`,
        ),
      );

    for (const sub of expiredSoon) {
      await step.run(`send-reminder-${sub.orgId}`, async () => {
        const admin = await getOrgAdminEmail(sub.orgId);
        if (!admin) return;
        await sendEmail({
          to: admin.email,
          subject: "Tu prueba gratuita termina MAÑANA",
          html: trialReminder3DaysHtml(admin.name, 1),
        });
      });
    }

    return { sent: expiredSoon.length };
  },
);

export const trialExpiredNotification = inngest.createFunction(
  {
    id: "trial-expired",
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 12 * * *" }],
  },
  async ({ step }) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const justExpired = await db
      .select({ orgId: subscriptions.orgId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.plan, "free"),
          sql`${subscriptions.trialEndsAt} IS NOT NULL`,
          sql`${subscriptions.trialEndsAt} < ${now}`,
          sql`${subscriptions.trialEndsAt} > ${yesterday}`,
        ),
      );

    for (const sub of justExpired) {
      await step.run(`send-expired-${sub.orgId}`, async () => {
        const admin = await getOrgAdminEmail(sub.orgId);
        if (!admin) return;
        await sendEmail({
          to: admin.email,
          subject: "Tu prueba gratuita ha terminado",
          html: trialExpiredHtml(admin.name),
        });
      });
    }

    return { sent: justExpired.length };
  },
);

export const trialDataWarning = inngest.createFunction(
  {
    id: "trial-data-warning",
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 12 * * *" }],
  },
  async ({ step }) => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const nearDeletion = await db
      .select({ orgId: subscriptions.orgId, trialEndsAt: subscriptions.trialEndsAt })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.plan, "free"),
          sql`${subscriptions.trialEndsAt} IS NOT NULL`,
          sql`${subscriptions.dataDeletedAt} IS NOT NULL`,
          sql`${subscriptions.dataDeletedAt} < ${in7Days}`,
          sql`${subscriptions.dataDeletedAt} > ${now}`,
        ),
      );

    for (const sub of nearDeletion) {
      await step.run(`send-warning-${sub.orgId}`, async () => {
        const admin = await getOrgAdminEmail(sub.orgId);
        if (!admin) return;
        const daysLeft = Math.ceil((new Date(sub.trialEndsAt!).getTime() + 30 * 24 * 60 * 60 * 1000 - now.getTime()) / (1000 * 60 * 60 * 24));
        await sendEmail({
          to: admin.email,
          subject: `Tus datos se eliminarán en ${daysLeft} días`,
          html: dataDeletionWarningHtml(admin.name, daysLeft),
        });
      });
    }

    return { sent: nearDeletion.length };
  },
);

/* ───── Daily cleanup cron: hard-delete expired data ───── */

export const trialCleanup = inngest.createFunction(
  {
    id: "trial-cleanup",
    triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires 0 6 * * *" }],
  },
  async ({ step }) => {
    const now = new Date();

    const expired = await db
      .select({ orgId: subscriptions.orgId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.plan, "free"),
          sql`${subscriptions.dataDeletedAt} IS NOT NULL`,
          sql`${subscriptions.dataDeletedAt} < ${now}`,
        ),
      );

    for (const sub of expired) {
      await step.run(`cleanup-${sub.orgId}`, async () => {
        const admin = await getOrgAdminEmail(sub.orgId);
        if (admin) {
          await sendEmail({
            to: admin.email,
            subject: "Tus datos han sido eliminados",
            html: dataDeletedHtml(admin.name),
          });
        }

        /* Hard-delete the organization (cascades to all data) */
        await db.delete(organizations).where(eq(organizations.id, sub.orgId));
      });
    }

    return { deleted: expired.length };
  },
);

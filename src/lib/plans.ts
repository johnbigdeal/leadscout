/**
 * Plan limits and enforcement logic for Free vs Pro tiers.
 */
import { db } from "./db";
import { subscriptions, pipelines, services, leadCategories, leads, searches } from "./db/schema";
import { eq, and, gte, count, countDistinct, sql } from "drizzle-orm";
import { getCreditsRemaining } from "./referrals";

export interface PlanLimits {
  plan: "free" | "pro";
  canSearch: boolean;
  searchesRemaining: number;
  creditsRemaining?: number;
  usedToday?: number;
  canCreatePipeline: boolean;
  pipelinesRemaining: number;
  canConnectCloudflare: boolean;
  canPublishToCustomDomain: boolean;
  servicesLimit: number;
  categoriesLimit: number;
  tagsPerLeadLimit: number;
  trialExpired?: boolean;
  trialEndsAt?: string | null;
  daysUntilDeletion?: number | null;
}

/**
 * Get plan limits for an organization.
 */
export async function getPlanLimits(orgId: string, userId?: string): Promise<PlanLimits> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);

  if (!sub) {
    return {
      plan: "free",
      canSearch: true,
      searchesRemaining: 1,
      canCreatePipeline: true,
      pipelinesRemaining: 1,
      canConnectCloudflare: false,
      canPublishToCustomDomain: false,
      servicesLimit: 3,
      categoriesLimit: 3,
      tagsPerLeadLimit: 3,
      trialExpired: false,
      trialEndsAt: null,
      daysUntilDeletion: 30,
    };
  }

  const isPro = sub.plan === "pro" && sub.status === "active";

  if (isPro) {
    /* Pro: unlimited searches; referral credits just accumulate (for trainings/discounts). */
    return {
      plan: "pro",
      canSearch: true,
      searchesRemaining: Infinity,
      creditsRemaining: userId ? await getCreditsRemaining(userId) : 0,
      canCreatePipeline: true,
      pipelinesRemaining: Infinity,
      canConnectCloudflare: true,
      canPublishToCustomDomain: true,
      servicesLimit: -1,
      categoriesLimit: -1,
      tagsPerLeadLimit: -1,
    };
  }

  /* Trial check: if trialEndsAt is in the past, block everything */
  const now = new Date();
  const trialExpired = sub.trialEndsAt && new Date(sub.trialEndsAt) <= now;

  if (trialExpired) {
    return {
      plan: "free",
      canSearch: false,
      searchesRemaining: 0,
      canCreatePipeline: false,
      pipelinesRemaining: 0,
      canConnectCloudflare: false,
      canPublishToCustomDomain: false,
      servicesLimit: 0,
      categoriesLimit: 0,
      tagsPerLeadLimit: 0,
      trialExpired: true,
      trialEndsAt: sub.trialEndsAt?.toISOString() || null,
      daysUntilDeletion: sub.dataDeletedAt
        ? Math.max(0, Math.ceil((new Date(sub.dataDeletedAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 30,
    };
  }

  /* Free tier: check daily search reset */
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const daysUntilDeletion = sub.dataDeletedAt
    ? Math.max(0, Math.ceil((new Date(sub.dataDeletedAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : sub.trialEndsAt
      ? 30
      : null;

  let usedToday: number;
  if (userId) {
    /* Per-user daily limit: count this user's own searches created today. */
    const [r] = await db
      .select({ n: count() })
      .from(searches)
      .where(and(eq(searches.createdBy, userId), gte(searches.createdAt, startOfToday)));
    usedToday = Number(r?.n ?? 0);
  } else {
    /* Org-level fallback (legacy counter) when no user context is provided. */
    if (sub.searchesResetAt && sub.searchesResetAt < startOfToday) {
      await db
        .update(subscriptions)
        .set({ searchesToday: 0, searchesResetAt: now })
        .where(eq(subscriptions.orgId, orgId));
      sub.searchesToday = 0;
    }
    usedToday = sub.searchesToday || 0;
  }

  /* Referral credits add extra searches on top of the daily free one. */
  const creditsRemaining = userId ? await getCreditsRemaining(userId) : 0;
  const searchesRemaining = Math.max(0, 1 - usedToday) + creditsRemaining;

  /* Count existing pipelines */
  const existingPipelines = await db
    .select({ count: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.orgId, orgId));

  const pipelineCount = existingPipelines.length;
  const pipelinesRemaining = Math.max(0, (sub.pipelinesLimit || 1) - pipelineCount);

  return {
    plan: "free",
    canSearch: searchesRemaining > 0,
    searchesRemaining,
    creditsRemaining,
    usedToday,
    canCreatePipeline: pipelinesRemaining > 0,
    pipelinesRemaining,
    canConnectCloudflare: false,
    canPublishToCustomDomain: false,
    servicesLimit: 3,
    categoriesLimit: 3,
    tagsPerLeadLimit: 3,
    trialExpired: false,
    trialEndsAt: sub.trialEndsAt?.toISOString() || null,
    daysUntilDeletion,
  };
}

/**
 * Check if organization can perform a search (Free: 1/day, Pro: unlimited).
 */
export async function canSearch(orgId: string): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  return limits.canSearch;
}

/**
 * Increment search counter after a successful search.
 */
export async function incrementSearchCount(orgId: string): Promise<void> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);

  if (!sub) return;
  if (sub.plan === "pro" && sub.status === "active") return; /* Pro: unlimited */

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (sub.searchesResetAt && sub.searchesResetAt < startOfToday) {
    /* Reset for new day */
    await db
      .update(subscriptions)
      .set({ searchesToday: 1, searchesResetAt: now })
      .where(eq(subscriptions.orgId, orgId));
  } else {
    await db
      .update(subscriptions)
      .set({ searchesToday: (sub.searchesToday || 0) + 1 })
      .where(eq(subscriptions.orgId, orgId));
  }
}

/**
 * Check if organization can create a new pipeline (Free: 1 total, Pro: unlimited).
 */
export async function canCreatePipeline(orgId: string): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  return limits.canCreatePipeline;
}

/**
 * Check if organization can connect Cloudflare (Pro only).
 */
export async function canConnectCloudflare(orgId: string): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  return limits.canConnectCloudflare;
}

/**
 * Check if organization can publish to custom domains (Pro only).
 * Free can only publish to system domains (available_domains.isSystem = true).
 */
export async function canPublishToCustomDomain(orgId: string): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  return limits.canPublishToCustomDomain;
}

/**
 * Check if organization can create a new service (Free: 3 total, Pro: unlimited).
 */
export async function canCreateService(orgId: string): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  if (limits.servicesLimit === -1) return true;
  const [row] = await db
    .select({ c: count() })
    .from(services)
    .where(eq(services.orgId, orgId));
  return (row?.c ?? 0) < limits.servicesLimit;
}

/**
 * Check if organization can create a new category (Free: 3 total, Pro: unlimited).
 */
export async function canCreateCategory(orgId: string): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  if (limits.categoriesLimit === -1) return true;
  const [row] = await db
    .select({ c: count() })
    .from(leadCategories)
    .where(eq(leadCategories.orgId, orgId));
  return (row?.c ?? 0) < limits.categoriesLimit;
}

/**
 * Check if a lead can have the given number of tags (Free: 3 per lead, Pro: unlimited).
 */
export async function canAddTags(orgId: string, tags: string[]): Promise<boolean> {
  const limits = await getPlanLimits(orgId);
  if (limits.tagsPerLeadLimit === -1) return true;
  return tags.length <= limits.tagsPerLeadLimit;
}

/**
 * Upgrade organization to Pro plan (Stripe).
 */
export async function upgradeToPro(
  orgId: string,
  stripeSubscriptionId: string,
  stripeCustomerId: string,
  stripePriceId: string,
  currentPeriodEnd: Date,
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      plan: "pro",
      status: "active",
      stripeSubId: stripeSubscriptionId,
      stripeCustomerId,
      paypalSubscriptionId: null,
      paypalPlanId: null,
      currentPeriodEnd,
      pipelinesLimit: 999,
      canConnectCloudflare: true,
    })
    .where(eq(subscriptions.orgId, orgId));
}

/**
 * Downgrade organization to Free plan (Stripe).
 */
export async function downgradeToFree(orgId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      plan: "free",
      status: "active",
      stripeSubId: null,
      stripeCustomerId: null,
      paypalSubscriptionId: null,
      paypalPlanId: null,
      currentPeriodEnd: null,
      pipelinesLimit: 1,
      canConnectCloudflare: false,
      searchesToday: 0,
    })
    .where(eq(subscriptions.orgId, orgId));
}

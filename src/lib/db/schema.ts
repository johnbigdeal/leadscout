import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  doublePrecision,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull().default("member"),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgUserUnique: uniqueIndex().on(t.orgId, t.userId),
}));

export const subscriptions = pgTable("subscriptions", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  /* Usage tracking */
  searchesToday: integer("searches_today").notNull().default(0),
  searchesResetAt: timestamp("searches_reset_at", { withTimezone: true }),
  pipelinesLimit: integer("pipelines_limit").notNull().default(1),
  canConnectCloudflare: boolean("can_connect_cloudflare").notNull().default(false),
  /* PayPal integration */
  paypalSubscriptionId: text("paypal_subscription_id"),
  paypalPlanId: text("paypal_plan_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  /* Trial system */
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  dataDeletedAt: timestamp("data_deleted_at", { withTimezone: true }),
  /* Legacy fields (kept for compatibility) */
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubId: text("stripe_sub_id"),
  searchQuota: integer("search_quota").notNull().default(50),
});

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  searchId: uuid("search_id"),
  actorId: text("actor_id"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const searches = pgTable("searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull(),
  keywords: text("keywords").notNull(),
  location: text("location").notNull(),
  channels: text("channels").array().notNull().default(["google"]),
  status: text("status").notNull().default("queued"),
  totalCost: numeric("total_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apifyRuns = pgTable("apify_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchId: uuid("search_id")
    .notNull()
    .references(() => searches.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  runId: text("run_id"),
  status: text("status").notNull().default("started"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: text("place_id"),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isWhatsapp: boolean("is_whatsapp"),
  country: text("country"),
  website: text("website"),
  hasWebsite: boolean("has_website"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  category: text("category"),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  reviewsCount: integer("reviews_count"),
  source: text("source").notNull().default("google"),
  rawJson: jsonb("raw_json"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  placeIdIdx: index().on(t.placeId),
  categoryIdx: index().on(t.category),
  fetchedAtIdx: index().on(t.fetchedAt),
}));

export const searchBusinesses = pgTable("search_businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchId: uuid("search_id")
    .notNull()
    .references(() => searches.id, { onDelete: "cascade" }),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  searchBusinessUnique: uniqueIndex().on(t.searchId, t.businessId),
}));

export const businessSeo = pgTable("business_seo", {
  businessId: uuid("business_id")
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  hasWebsite: boolean("has_website"),
  pagespeedPerf: integer("pagespeed_perf"),
  pagespeedSeo: integer("pagespeed_seo"),
  pagespeedA11y: integer("pagespeed_a11y"),
  metaTitle: text("meta_title"),
  metaDesc: text("meta_desc"),
  hasSsl: boolean("has_ssl"),
  mobileFriendly: boolean("mobile_friendly"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialProfiles = pgTable("social_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  url: text("url"),
  followers: integer("followers"),
  contact: text("contact"),
  rawJson: jsonb("raw_json"),
});

export const opportunityScores = pgTable("opportunity_scores", {
  businessId: uuid("business_id")
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  reasons: text("reasons").array().notNull().default([]),
});

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  stages: text("stages").array().notNull().default(["new", "contacted", "qualified", "won", "lost"]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadCategories = pgTable("lead_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#0369A1"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgCategoryUnique: uniqueIndex().on(t.orgId, t.name),
}));

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  pipelineId: uuid("pipeline_id").references(() => pipelines.id),
  categoryId: uuid("category_id").references(() => leadCategories.id),
  stage: text("stage").notNull().default("new"),
  ownerId: uuid("owner_id"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgBusinessUnique: uniqueIndex().on(t.orgId, t.businessId),
}));

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultCost: numeric("default_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  recurrence: text("recurrence").notNull().default("one_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgServiceUnique: uniqueIndex().on(t.orgId, t.name),
}));

export const leadServices = pgTable("lead_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  cost: numeric("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  recurrence: text("recurrence").notNull().default("one_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  leadServiceUnique: uniqueIndex().on(t.leadId, t.serviceId),
}));

export const searchShares = pgTable("search_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchId: uuid("search_id")
    .notNull()
    .references(() => searches.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const websites = pgTable("websites", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  data: jsonb("data").notNull().default({}),
  html: text("html"),
  status: text("status").notNull().default("draft"),
  subdomain: text("subdomain").unique(),
  domain: text("domain"),
  publishedUrl: text("published_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cloudflareAccounts = pgTable("cloudflare_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  apiToken: text("api_token").notNull(),
  refreshToken: text("refresh_token"),
  authType: text("auth_type").notNull().default("manual"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgUnique: uniqueIndex().on(t.orgId),
}));

export const availableDomains = pgTable("available_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  zoneId: text("zone_id"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  isGlobal: boolean("is_global").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgDomainUnique: uniqueIndex().on(t.orgId, t.domain),
}));

export const customDomains = pgTable("custom_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  rootDomain: text("root_domain").notNull(),
  subdomain: text("subdomain").notNull(),
  zoneId: text("zone_id").notNull(),
  dnsRecordId: text("dns_record_id"),
  recordType: text("record_type").notNull().default("CNAME"),
  target: text("target").notNull().default("cname.vercel-dns.com"),
  status: text("status").notNull().default("pending"),
  sslStatus: text("ssl_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

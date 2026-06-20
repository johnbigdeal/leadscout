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

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubId: text("stripe_sub_id"),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  searchQuota: integer("search_quota").notNull().default(50),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
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

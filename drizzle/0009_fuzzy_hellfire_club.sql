ALTER TABLE "subscriptions" ADD COLUMN "searches_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "searches_reset_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "pipelines_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "can_connect_cloudflare" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paypal_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paypal_plan_id" text;
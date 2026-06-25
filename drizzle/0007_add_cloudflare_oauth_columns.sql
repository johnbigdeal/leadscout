ALTER TABLE "cloudflare_accounts" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "cloudflare_accounts" ADD COLUMN "auth_type" text DEFAULT 'manual' NOT NULL;
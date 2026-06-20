ALTER TABLE "lead_services" ADD COLUMN "recurrence" text DEFAULT 'one_time' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "recurrence" text DEFAULT 'one_time' NOT NULL;
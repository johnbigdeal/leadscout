ALTER TABLE "businesses" ALTER COLUMN "place_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "source" text DEFAULT 'google' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_place_id_index" ON "businesses" USING btree ("place_id");

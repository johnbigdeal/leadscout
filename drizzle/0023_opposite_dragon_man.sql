CREATE TABLE "invite_code_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"owner_id" uuid,
	"label" text,
	"max_uses" integer DEFAULT 10,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "invite_code_requests_status_index" ON "invite_code_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invite_code_requests_user_id_index" ON "invite_code_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invite_codes_owner_id_index" ON "invite_codes" USING btree ("owner_id");
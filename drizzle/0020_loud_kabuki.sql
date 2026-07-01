CREATE TABLE "sinpe_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"proof_url" text NOT NULL,
	"reference" text,
	"amount" text DEFAULT '10000 CRC' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sinpe_payments" ADD CONSTRAINT "sinpe_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sinpe_payments_org_id_index" ON "sinpe_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "sinpe_payments_status_index" ON "sinpe_payments" USING btree ("status");
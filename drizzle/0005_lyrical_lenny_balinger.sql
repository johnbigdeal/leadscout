CREATE TABLE "lead_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#0369A1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_categories" ADD CONSTRAINT "lead_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_categories_org_id_name_index" ON "lead_categories" USING btree ("org_id","name");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_category_id_lead_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."lead_categories"("id") ON DELETE no action ON UPDATE no action;
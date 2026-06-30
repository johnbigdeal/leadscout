CREATE TABLE "training_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"embed_url" text,
	"aspect_ratio" text DEFAULT '16 / 9',
	"file_url" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"access_level" text DEFAULT 'free' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_lessons" ADD CONSTRAINT "training_lessons_section_id_training_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."training_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_lessons_section_id_index" ON "training_lessons" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "training_sections_order_index" ON "training_sections" USING btree ("order");
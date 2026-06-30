CREATE TABLE "roadmap_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"author_id" uuid NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roadmap_votes" ADD CONSTRAINT "roadmap_votes_idea_id_roadmap_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."roadmap_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roadmap_ideas_status_index" ON "roadmap_ideas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "roadmap_ideas_vote_count_index" ON "roadmap_ideas" USING btree ("vote_count");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_votes_idea_id_user_id_index" ON "roadmap_votes" USING btree ("idea_id","user_id");--> statement-breakpoint
-- =========================================================================
-- RLS (defensa en profundidad). La app usa conexión directa de Postgres que
-- bypassa RLS; estas políticas solo limitan el acceso directo vía PostgREST
-- con la anon key pública: lectura pública, escritura solo del propio usuario.
-- Mover/eliminar ideas (admin) NO tiene policy → solo el rol de la app (bypass).
-- =========================================================================
ALTER TABLE "roadmap_ideas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roadmap_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "roadmap_ideas_select_public" ON "roadmap_ideas" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "roadmap_ideas_insert_own" ON "roadmap_ideas" FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());--> statement-breakpoint
CREATE POLICY "roadmap_votes_select_public" ON "roadmap_votes" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "roadmap_votes_insert_own" ON "roadmap_votes" FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "roadmap_votes_delete_own" ON "roadmap_votes" FOR DELETE TO authenticated USING (user_id = auth.uid());
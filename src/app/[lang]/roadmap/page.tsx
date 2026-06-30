import { createBrowserClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import RoadmapBoard from "@/components/roadmap/RoadmapBoard";

export const dynamic = "force-dynamic";

/* Roadmap público: lectura para todos. Resolvemos el usuario de forma OPCIONAL
   (sin redirigir) para habilitar votar/proponer y, si es super_admin, los
   controles de moderación. */
export default async function RoadmapPage() {
  const supabase = await createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    isAdmin = profile?.role === "super_admin";
  }

  return (
    <main className="min-h-screen bg-white">
      <RoadmapBoard currentUserId={user?.id ?? null} isAdmin={isAdmin} />
    </main>
  );
}

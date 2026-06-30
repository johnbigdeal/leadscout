import { createBrowserClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import RoadmapBoard from "@/components/roadmap/RoadmapBoard";

export const dynamic = "force-dynamic";

/* Roadmap DENTRO de LeadScout (para usuarios logueados): el DashboardLayout ya
   garantiza la sesión y aporta el sidebar/branding. Aquí solo resolvemos si el
   usuario es super_admin para habilitar los controles de moderación. */
export default async function DashboardRoadmapPage() {
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

  return <RoadmapBoard currentUserId={user?.id ?? null} isAdmin={isAdmin} />;
}

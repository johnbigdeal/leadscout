import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createBrowserClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import RoadmapBoard from "@/components/roadmap/RoadmapBoard";

export const dynamic = "force-dynamic";

/* Roadmap PÚBLICO (visitantes): standalone, siempre con branding de LeadScout.
   Si el usuario está logueado, lo enviamos a la versión dentro del dashboard
   (/dashboard/roadmap) para que la vea "dentro" de LeadScout. */
export default async function RoadmapPage() {
  const supabase = await createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard/roadmap");

  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header con branding de LeadScout */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center" aria-label={t("appName")}>
            <Logo height={30} priority />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/sign-in"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 sm:px-4"
            >
              {t("signUp")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Visitante: solo lectura + gating de login al votar/proponer. */}
        <RoadmapBoard currentUserId={null} isAdmin={false} />
      </main>

      {/* Footer con branding de LeadScout */}
      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
          <Link href="/" className="flex items-center" aria-label={t("appName")}>
            <Logo height={24} />
          </Link>
          <p className="text-xs text-zinc-400">
            © {t("appName")}
          </p>
        </div>
      </footer>
    </div>
  );
}

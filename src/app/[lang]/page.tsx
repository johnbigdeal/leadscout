import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  BarChart3,
  LayoutDashboard,
  Globe,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  DollarSign,
} from "lucide-react";

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-zinc-900">{title}</h4>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-zinc-900">
            <Zap className="h-5 w-5 text-zinc-900" />
            {t("appName")}
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              {t("signUp")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Encontrá prospectos de alto valor en minutos
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-600">
            LeadScout escanea Google Maps, Instagram y LinkedIn para encontrar negocios con potencial de conversión. Organizalos en un CRM visual y cerrá más ventas.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof / channels */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
            Buscá en múltiples canales
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 text-zinc-400">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-medium text-zinc-600">Google Maps</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-10.425c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="text-sm font-medium text-zinc-600">Instagram</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-sm font-medium text-zinc-600">LinkedIn</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Todo lo que necesitás para captar clientes
          </h2>
          <p className="mt-4 text-zinc-600">
            De la búsqueda al cierre, en una sola plataforma.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Search className="h-5 w-5" />}
            title="Búsqueda multi-canal"
            description="Escaneá Google Maps por ubicación, Instagram por hashtag y LinkedIn por comentarios en posts. Todo en una sola búsqueda."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Puntaje inteligente"
            description="Cada negocio recibe un puntaje basado en presencia web, SEO, redes sociales y datos de contacto. Priorizá los mejores."
          />
          <FeatureCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="CRM Kanban"
            description="Arrastrá prospectos entre etapas: Nuevo → Contactado → Calificado → Propuesta → Cierre. Con etiquetas, actividades y servicios."
          />
          <FeatureCard
            icon={<DollarSign className="h-5 w-5" />}
            title="Panel de ventas"
            description="Visualizá ingresos potenciales, MRR/ARR por recurrencia y cerrados por etapa. Llevá el control de tus números."
          />
          <FeatureCard
            icon={<Globe className="h-5 w-5" />}
            title="Multimoneda"
            description="Operá en USD, CRC, CLP, COP, ARS, PEN o EUR. Las tasas de cambio se actualizan automáticamente."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Magic links"
            description="Compartí resultados de búsqueda con tu equipo o clientes sin que necesiten cuenta. Links de 7 días de duración."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">¿Cómo funciona?</h2>
            <p className="mt-4 text-zinc-400">
              De la búsqueda al cierre en 4 pasos.
            </p>
          </div>
          <div className="mx-auto max-w-2xl space-y-8">
            <Step
              number="1"
              title="Definí tu búsqueda"
              description="Elegí keywords, ubicación y canales (Google Maps, Instagram, LinkedIn). LeadScout hace el resto."
            />
            <Step
              number="2"
              title="Revisá los resultados"
              description="Cada negocio viene con puntaje, datos de contacto, redes sociales y métricas de SEO. Filtrá por calidad."
            />
            <Step
              number="3"
              title="Convertí a leads"
              description="Agregá los mejores negocios al CRM. Asignales etapa, categoría, etiquetas y servicios con recurrencia."
            />
            <Step
              number="4"
              title="Cerrá ventas"
              description="Seguí el pipeline visual, registrá actividades y visualizá tus ingresos en el panel de ventas."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
              Diseñado para equipos de ventas en LATAM
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Búsquedas ilimitadas por canal",
                "CRM con pipelines personalizables",
                "Categorías con color para organizar leads",
                "Servicios con recurrencia (único, mensual, anual)",
                "Moneda local automática con tasas actualizadas",
                "Aprobación de usuarios y roles (superadmin)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-zinc-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                  85
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Dentista Central</p>
                  <p className="text-xs text-zinc-500">Bogotá · Sin sitio web · Con WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  62
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Abogados López & Asoc.</p>
                  <p className="text-xs text-zinc-500">Ciudad de México · Web lento · Sin Instagram</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                  91
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Restaurante El Sabor</p>
                  <p className="text-xs text-zinc-500">São Paulo · Web optimizado · Activo en redes</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-zinc-400">
              Ejemplo de resultados con puntaje
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-100 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Empezá a encontrar prospectos hoy
          </h2>
          <p className="mt-4 text-zinc-600">
            Creá tu cuenta gratuita y hacé tu primera búsqueda en menos de 2 minutos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-zinc-500">
          <p>
            © {new Date().getFullYear()} LeadScout. Hecho para equipos de ventas en LATAM.
          </p>
        </div>
      </footer>
    </div>
  );
}

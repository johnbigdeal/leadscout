import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";
import {
  Search,
  BarChart3,
  LayoutDashboard,
  Globe,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Shield,
  DollarSign,
  Sparkles,
  Gift,
  Target,
  ChevronDown,
  Link2,
  Mail,
  ShieldAlert,
} from "lucide-react";

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white p-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-zinc-900">
        {q}
        <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{a}</p>
    </details>
  );
}

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
          <Link href="/" className="flex items-center" aria-label={t("appName")}>
            <Logo height={30} priority />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#como" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 md:inline-block">
              Cómo funciona
            </a>
            <a href="#faq" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 md:inline-block">
              Preguntas
            </a>
            <Link href="/roadmap" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 md:inline-block">
              Roadmap
            </Link>
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

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            <Sparkles className="h-3.5 w-3.5" />
            Encontrá clientes y vendéles un sitio web — todo en un solo lugar
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Conseguí clientes hoy. Y un negocio que crece solo.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-600">
            LeadScout encuentra negocios reales en Google Maps, te dice cuáles tienen más oportunidad y los ordena en un CRM. ¿Y lo mejor? Generás un sitio web profesional para cada uno en minutos para cerrar la venta o arrancar tu propia agencia.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#como"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Gratis para empezar · Sin tarjeta · 1 búsqueda por día</p>
        </div>
      </section>

      {/* Dos caminos */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">¿Buscás clientes?</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Encontrá negocios por rubro y zona, con teléfono, WhatsApp, rating y un puntaje de oportunidad. Pasalos a tu CRM y cerrá más ventas, sin perder horas buscando a mano.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">¿Querés vender sitios web?</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              LeadScout te muestra los negocios que <strong>no tienen web</strong> o que <strong>no reclamaron su ficha de Google</strong>. Generás un sitio profesional o un <strong>link-in-bio</strong> para cada uno en minutos, lo publicás y lo usás para venderles. El negocio perfecto para arrancar tu agencia.
            </p>
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
            Todo lo que necesitás, en una sola plataforma
          </h2>
          <p className="mt-4 text-zinc-600">
            De encontrar el negocio a entregarle su sitio web. Sin saltar entre 5 herramientas.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Search className="h-5 w-5" />}
            title="Búsqueda de negocios reales"
            description="Buscá por rubro y zona en Google Maps y obtené teléfono, WhatsApp, dirección, rating y sitio web de cada negocio. En segundos."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Puntaje de oportunidad"
            description="Cada negocio trae un puntaje según su presencia web, SEO y redes. Detectá al instante quién no tiene web — tu próximo cliente."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Website builder instantáneo"
            description="Generá un sitio web profesional (o un link-in-bio) para cualquier negocio en minutos: textos con IA, imágenes, reseñas de Google y botón de WhatsApp. Publicalo y vendelo."
          />
          <FeatureCard
            icon={<Link2 className="h-5 w-5" />}
            title="Link-in-bio estilo Linktree"
            description="Además del sitio completo, creá una página de enlaces para cada negocio: WhatsApp, redes, reseñas y web en un solo link. Con temas, código QR y analíticas de clics."
          />
          <FeatureCard
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Fichas de Google sin reclamar"
            description="Detectamos los negocios que no reclamaron su Google My Business — una oportunidad enorme para ofrecerles gestión, y una de las señales que más suma al puntaje."
          />
          <FeatureCard
            icon={<Mail className="h-5 w-5" />}
            title="Emails en los resultados"
            description="Cuando están disponibles, extraemos el email del negocio directo en los resultados. Prospectá por correo, no solo por WhatsApp."
          />
          <FeatureCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="CRM Kanban"
            description="Arrastrá tus prospectos entre etapas (Nuevo → Contactado → Calificado → Ganado). Con etiquetas, notas, servicios y recordatorios."
          />
          <FeatureCard
            icon={<DollarSign className="h-5 w-5" />}
            title="Ventas y multimoneda"
            description="Seguí ingresos potenciales, MRR/ARR y cierres. Cobrá en USD, CRC, MXN, COP, ARS, CLP, PEN o EUR con tasas actualizadas."
          />
          <FeatureCard
            icon={<Gift className="h-5 w-5" />}
            title="Referidos = búsquedas gratis"
            description="Invitá con tu link único: cada persona que se suma te da una búsqueda gratis extra. Y si sos Pro, acumulás créditos para beneficios."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="como" className="scroll-mt-20 bg-zinc-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Cómo funciona</h2>
            <p className="mt-4 text-zinc-400">
              De cero a cliente (con su sitio web listo) en 4 pasos.
            </p>
          </div>
          <div className="mx-auto max-w-2xl space-y-8">
            <Step
              number="1"
              title="Buscá negocios"
              description="Elegí un rubro y una zona. LeadScout trae los negocios de Google Maps con todos sus datos de contacto."
            />
            <Step
              number="2"
              title="Detectá la oportunidad"
              description="Mirá el puntaje y filtrá: quién no tiene web, quién no reclamó su Google My Business, quién tiene WhatsApp o email. Esos son tus mejores prospectos."
            />
            <Step
              number="3"
              title="Sumalos a tu CRM"
              description="Pasá los mejores al tablero, asignales etapa, etiquetas y servicios. Llevá el seguimiento sin perder ninguno."
            />
            <Step
              number="4"
              title="Cerrá la venta o generá su sitio"
              description="Contactalos y cerrá. O generales un sitio web o un link-in-bio estilo Linktree para mostrarles lo que podés hacer — el argumento de venta perfecto."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
              Pensado para vendedores y emprendedores de LATAM
            </h2>
            <p className="mt-4 text-zinc-600">
              Ya sea que busques clientes o que quieras vivir de hacer sitios web, LeadScout te da las herramientas y los prospectos.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Negocios reales de Google Maps con todos sus datos de contacto",
                "Puntaje de oportunidad para detectar quién no tiene web",
                "Detección de negocios que no reclamaron su Google My Business",
                "Emails de contacto en los resultados cuando están disponibles",
                "Website builder con IA: sitio profesional en minutos",
                "Link-in-bio estilo Linktree con temas, QR y analíticas de clics",
                "Código HTML personalizado en tus sitios (Pro)",
                "Publicación instantánea en subdominio o tu propio dominio",
                "CRM Kanban con servicios, recurrencia y panel de ventas",
                "Multimoneda LATAM y referidos que te dan búsquedas gratis",
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

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-zinc-100 bg-zinc-50/50 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Preguntas frecuentes</h2>
            <p className="mt-4 text-zinc-600">Todo lo que querés saber antes de empezar.</p>
          </div>
          <div className="space-y-3">
            <Faq
              q="¿Qué es LeadScout y para quién es?"
              a="Es una plataforma para encontrar negocios (leads) y convertirlos en clientes. Sirve tanto si vendés un producto o servicio y buscás a quién ofrecerlo, como si querés ganar dinero creando sitios web para negocios que todavía no tienen uno."
            />
            <Faq
              q="¿De dónde salen los leads?"
              a="De Google Maps. Buscás por rubro y zona, y LeadScout te trae los negocios reales con su nombre, teléfono, WhatsApp, dirección, rating y si tienen o no sitio web — más un puntaje de oportunidad."
            />
            <Faq
              q="¿Necesito tarjeta de crédito para empezar?"
              a="No. Te registrás gratis y podés hacer 1 búsqueda por día durante tu período de prueba. Sin tarjeta, sin compromiso."
            />
            <Faq
              q="¿Qué diferencia hay entre el plan Free y el Pro?"
              a="Free: 1 búsqueda por día (hasta 25 leads por búsqueda), 1 pipeline y lo esencial del CRM. Pro: búsquedas ilimitadas (hasta 50 leads por búsqueda), pipelines y servicios ilimitados, y la opción de publicar en tu propio dominio."
            />
            <Faq
              q="¿Puedo crear sitios web para mis clientes?"
              a="Sí. LeadScout incluye un editor que genera un sitio profesional o un link-in-bio estilo Linktree en minutos: textos con IA, imágenes, reseñas de Google y botón de WhatsApp. Lo publicás al instante y lo usás para cerrar la venta o entregárselo al cliente. En Pro podés además insertar tu propio código HTML."
            />
            <Faq
              q="¿Qué es el link-in-bio?"
              a="Una página de enlaces estilo Linktree para cada negocio: junta WhatsApp, redes, tu sitio y reseñas en un solo link, con temas, código QR para compartir y analíticas de clics. Ideal para negocios que viven de Instagram."
            />
            <Faq
              q="¿Puedo usar mi propio dominio?"
              a="Sí, en el plan Pro. Conectás tu cuenta de Cloudflare y publicás los sitios en tu propio dominio (por ejemplo, en el dominio de tu agencia o el de tu cliente)."
            />
            <Faq
              q="¿Cómo funcionan los referidos y los créditos?"
              a="Tenés un link único. Por cada persona que se registra y es aprobada, ganás un crédito que equivale a una búsqueda gratis extra. Si sos Pro (búsquedas ilimitadas), los créditos se acumulan para beneficios como entrenamientos y descuentos."
            />
            <Faq
              q="¿En qué países y monedas funciona?"
              a="Funciona en toda Latinoamérica. Podés trabajar y cobrar en USD, CRC, MXN, COP, ARS, CLP, PEN o EUR, con tasas de cambio que se actualizan solas."
            />
            <Faq
              q="¿Mis búsquedas son privadas? ¿Puedo cancelar cuando quiera?"
              a="Sí. Cada usuario ve únicamente sus propias búsquedas y leads. Y no hay permanencia: el plan gratis es para siempre y podés dejar de usarlo o bajar de plan cuando quieras."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-100 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Tu próximo cliente ya está en Google Maps
          </h2>
          <p className="mt-4 text-zinc-600">
            Creá tu cuenta gratis, hacé tu primera búsqueda y generá un sitio web en minutos. Sin tarjeta.
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
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-sm text-zinc-500">
          <Logo height={26} />
          <p>
            © {new Date().getFullYear()} LeadScout. Hecho para equipos de ventas en LATAM.
          </p>
        </div>
      </footer>
    </div>
  );
}

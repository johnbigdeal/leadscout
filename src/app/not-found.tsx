import type { Metadata } from "next";
import Link from "next/link";
import { Search, LayoutDashboard, Globe, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Página no encontrada — LeadScout",
};

const OFFER = [
  { icon: Search, title: "Encontrá clientes", desc: "Negocios reales de Google Maps, Instagram y LinkedIn." },
  { icon: LayoutDashboard, title: "Organizalos en tu CRM", desc: "Un Kanban con puntaje de oportunidad por lead." },
  { icon: Globe, title: "Vendéles un sitio web", desc: "Generá una landing profesional en minutos." },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Navbar */}
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center" aria-label="LeadScout">
            <Logo height={30} priority />
          </Link>
          <Link
            href="/auth/sign-in"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-2xl text-center">
          <p className="bg-gradient-to-br from-accent to-zinc-900 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
            404
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Esta página se nos escapó
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-zinc-600">
            El enlace no existe o se movió. Pero tu próximo cliente sí existe — y
            está a unos clics.
          </p>

          {/* Stack de oferta */}
          <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
            {OFFER.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{desc}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:w-auto"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 sm:w-auto"
            >
              Iniciar sesión
            </Link>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            <Link href="/" className="font-medium text-zinc-700 underline-offset-4 hover:underline">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

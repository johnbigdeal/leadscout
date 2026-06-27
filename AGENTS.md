# LeadScout — Contexto para Agents

> Documento maestro de contexto. Leer esto primero antes de tocar cualquier archivo.

---

## Qué es LeadScout

Plataforma B2B para encontrar prospectos multi-canal (Google Maps, Instagram, LinkedIn), convertirlos en leads gestionables via CRM Kanban, y crear/publish landing pages instantáneas para cada lead.

**URL de producción:** https://leadscout.lat
**Dominios de publish:** leadscout.lat, pyme.live, brber.xyz

---

## Tech Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 16.2.9 (App Router, Turbopack) |
| Lenguaje | TypeScript | 5.7 |
| Estilos | Tailwind CSS | v4 + shadcn/ui + tw-animate-css |
| DB / ORM | PostgreSQL + Drizzle ORM | postgres-js driver |
| Auth | Supabase Auth | PKCE, cookies SSR |
| i18n | next-intl | routing: `[lang]`, solo `es` |
| Toasts | sonner | `<Toaster>` en `[lang]/layout.tsx` |
| Icons | Lucide React | v1.21.0 |
| Charts | Recharts | PieChart donut |
| Scraping | Apify SDK | actores de terceros |
| Images | Unsplash API | free tier (50 req/hour) |
| DNS | Cloudflare API | manual API token |
| Deploy | Vercel | npx vercel --prod |

**Paquetes clave:**
- `zod` v4 (cuidado: API cambió — usa `.issues` en vez de `.errors`)
- `@supabase/ssr` para server-side auth con cookies
- `next-intl/navigation` para routing i18n
- `sonner` para toasts (feedback de éxito/error en mutaciones; no usar `alert()`)

---

## Estructura de carpetas

```
src/
  app/
    [lang]/                          # i18n routing
      auth/
        sign-in/                     # Login (Zod validation, loading states)
        sign-up/                     # Register con orgName
        forgot-password/             # Reset password flow
        reset-password/              # Set new password
        magic-link/                  # Passwordless login
        confirm/                     # Email confirmation
      dashboard/
        layout.tsx                   # Server Component con auth
        DashboardClient.tsx          # Client Component del sidebar
        search/                      # Formulario de búsqueda
        results/                     # Resultados + business cards
        crm/                         # CRM Kanban
        sales/                       # Panel de ventas (donuts)
        websites/                    # Lista de websites
        builder/[id]/                # ParaluxBuilder
        settings/                    # Configuración general
        settings/domains/            # Cloudflare connection + available_domains
        admin/approvals/             # Superadmin approvals
      site/[domain]/                 # Public published sites
      magic/search/[token]/          # Búsquedas públicas compartidas
    api/                             # API routes
  components/
    ui/                              # shadcn/ui components
    ParaluxBuilder.jsx               # Website builder principal
  lib/
    auth.ts                          # Auth centralizado (authenticateRequest, requireAuth, requireAdmin)
    auth-errors.ts                   # Traducción de errores Supabase al español
    rate-limit.ts                    # Rate limiter en memoria
    db/                              # Drizzle schema + connection
    paralux/
      generate-html.ts               # Generador HTML puro (no React deps)
      category-translations.ts       # Mapa español→inglés para Unsplash
    supabase/
      client.ts                      # createBrowserClient
      server.ts                      # createServerClient + createServiceClient
  middleware.ts                      # Protección /dashboard/* y /api/*
  i18n/                              # Config next-intl
messages/
  es.json                            # Español (único locale)
```

---

## Variables de entorno críticas

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | URL base (https://leadscout.lat) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (onboarding, admin) |
| `DATABASE_URL` | postgres://... |
| `APIFY_TOKEN` | Token Apify |
| `VERCEL_TOKEN` | Token Vercel (para agregar dominios) |
| `UNSPLASH_ACCESS_KEY` | Access key Unsplash |
| `CLOUDFLARE_CLIENT_ID` | OAuth client ID (legacy, no usar) |
| `CLOUDFLARE_CLIENT_SECRET` | OAuth secret (legacy, no usar) |

> **Importante:** en Vercel estas vars deben estar habilitadas para **Production _y_ Preview**. Si solo están en Production, los deploys de Preview (ramas/PRs) fallan en el build (ver Gotcha #9).

---

## Convenciones obligatorias

1. **Toda API route:** `export const dynamic = "force-dynamic"`
2. **Auth:** Usar `requireAuth(request)` desde `@/lib/auth` (no duplicar)
3. **Moneda:** Todo en USD en DB. Conversión en UI via `CurrencyContext`
4. **Idioma:** Español únicamente. Strings en `messages/es.json` (NO agregar pt-BR ni otros locales)
5. **Client Components:** Agregar `"use client"` al tope
6. **Server Components:** Obtener auth del servidor (ver `dashboard/layout.tsx`)
7. **Zod v4:** Usar `result.error.issues` (NO `.errors`), path puede ser `string | symbol` — castear
8. **Feedback de mutaciones:** Chequear `res.ok` y notificar con `toast` de `sonner` (`toast.success`/`toast.error`); NO usar `alert()`

---

## Arquitectura clave

### Auth
- **Proxy** (`src/proxy.ts` — convención Next 16, único archivo. **DEBE estar en `src/`**, no en la raíz: como el proyecto usa `src/app`, Next ignora `proxy.ts`/`middleware.ts` de la raíz) maneja: redirect www→non-www, rewrite de dominios custom → `/site/[host]`, redirect de **toda ruta sin `/es`** a su equivalente `/es/...` (la app es español-only, ver `src/app/page.tsx`), y redirect de `/es/dashboard/*` sin sesión → sign-in
- **`matcher`:** `"/((?!api|_next|.*\\..*).*)"` — corre en páginas pero **excluye** `/api`, `_next` y cualquier path con extensión (assets de `/public` como `/brand/*.png` se sirven directo)
- **`/api/*`** NO se protege en el proxy: cada route usa `requireAuth(request)`
- **Centralizado** en `src/lib/auth.ts` — `authenticateRequest`, `requireAuth`, `requireAdmin`
- **21 API routes** ya refactorizadas para usar `requireAuth()`
- **Features:** Email+password, Magic Links, forgot password, email confirmation
- **Dashboard layout** es Server Component — obtiene user directo de Supabase sin fetch extra

### Builder + Publishing
- **ParaluxBuilder** (`src/components/ParaluxBuilder.jsx`) — editor visual con tabs
- **Preview del builder** usa `srcDoc={html}` en iframe (NO blob URLs — rompen en refresh)
- **Site público** se sirve como documento HTML real desde `src/app/site/[domain]/route.ts` (NO iframe — ver ADR-003). El HTML de `generateHTML()` ya trae `<head>` con título, meta description y Open Graph/Twitter
- **generateHTML()** es función pura en `src/lib/paralux/generate-html.ts` (no React deps)
- **Publish flow:**
  1. Crea CNAME en Cloudflare: `{subdomain} → cname.vercel-dns.com`
  2. **CRÍTICO:** `proxied: false` (DNS only / gris). Naranja rompe validación Vercel
  3. Agrega dominio a Vercel project
  4. Guarda en `custom_domains` + actualiza `websites`
- **DNS cleanup:** Al borrar website o unpublish, se borra el registro DNS de Cloudflare
- **Multi-domain:** Tabla `available_domains` define qué dominios usar (leadscout.lat, pyme.live, brber.xyz)

### Imágenes (Unsplash)
- **Búsqueda:** `GET /api/images/search?q=&page=&per_page=`
- **Auto-search:** Al crear website desde lead, busca con categoría del lead traducida al inglés
- **Mapa:** `src/lib/paralux/category-translations.ts` — 180+ categorías español→inglés
- **Asignación:** `[0]→hero, [1]→about, [2]→statement, [3-6]→gallery`
- **Límite:** 50 requests/hour (free tier)

### CRM
- **Leads** tienen `categoryId` → `leadCategories.name`
- **Pipelines** personalizables por org
- **Kanban:** Drag-and-drop entre stages
- **Services:** Recurrencia (único, mensual, anual, lifetime)

### Branding (logo + colores)
- **Logo:** "LeadScout Modern Logo v3". Assets en `public/brand/` — `leadscout-logo[-light][@2x].png` (lockup) y `leadscout-mark[-light][@2x].png` (icono). La versión `-light` (blanco) es para fondos oscuros (sidebar navy). Favicon/app icon: `src/app/icon.png` + `apple-icon.png` (convención de archivo de Next; NO hay `favicon.ico`)
- **Componente:** `src/components/Logo.tsx` — `<Logo variant="lockup|mark" theme="color|light" height={px} />`. Usado en el header/footer del landing y en el sidebar del dashboard
- **Colores de marca** (LeadScout Design System de Stitch) en `globals.css`: Deep Navy `#1a2b3c` (primary/sidebar), Trust Blue `#2563eb` (accent/action/ring)
- **Insignia "Hecho con LeadScout"** en sitios generados: la inyecta `generateHTML(data, { showBadge })` en `generate-html.ts`. **Gating por plan, server-side** en `site/[domain]/route.ts`: resuelve el plan del org dueño (`website.orgId → subscriptions`) y fuerza `showBadge=true` en **Free**; en **Pro** respeta `data.hideBadge` (toggle en la pestaña Estilo del builder). No es bypasseable editando `data` porque el plan se resuelve al servir

---

## Tablas principales (Drizzle schema)

| Tabla | Propósito |
|-------|-----------|
| `organizations` | Tenant. `currency`, `name` |
| `memberships` | Relación user-org. `role`, `approved` |
| `users` | Perfil extendido de Supabase Auth |
| `searches` | Búsquedas ejecutadas |
| `businesses` | Resultados crudos de scraping |
| `socialProfiles` | Perfiles sociales linkeados |
| `leads` | Negocios convertidos. `stage`, `pipelineId`, `categoryId` |
| `pipelines` | Pipelines custom por org |
| `leadCategories` | Categorías con color |
| `services` | Servicios ofrecidos |
| `leadServices` | Servicios asignados a leads |
| `websites` | Websites creados. `data` (JSON), `status`, `subdomain`, `domain` |
| `customDomains` | Dominios publicados. `domain`, `dnsRecordId`, `zoneId` |
| `availableDomains` | Dominios disponibles para publish. `domain`, `zoneId`, `isActive`, `isDefault` |
| `cloudflareAccounts` | Cuenta Cloudflare conectada. `apiToken`, `accountId` |
| `searchShares` | Tokens para compartir búsquedas |
| `apifyRuns` | Tracking de runs de Apify |

---

## Decisiones técnicas clave

Ver `docs/ARCHITECTURE.md` para el detalle completo. Resumen:

1. **Site público como documento HTML real** (route handler, no iframe) — para SEO y previews al compartir (ADR-003). El **preview del builder** sí usa `srcDoc` en iframe (blob URLs rompen al refresh)
2. **`proxied: false` en Cloudflare** — Vercel necesita ver el CNAME real para SSL
3. **Supabase Auth en vez de Clerk** — Precio (50k MAU free), RLS nativo, self-hostable
4. **Auth centralizado** — Evita duplicar código en 21 API routes
5. **Middleware Next.js** — Protección a nivel edge, más seguro que useEffect en cliente
6. **Category translation** — Unsplash funciona mejor en inglés, traducimos categorías del lead
7. **Rate limiting en memoria** — Suficiente para onboarding. En escala usar Redis.

---

## Gotchas / Known Issues

1. **Middleware → proxy (Next 16) — ubicación crítica:** El middleware es un **único** archivo `src/proxy.ts`. **Tiene que estar en `src/`** (no en la raíz): con proyectos que usan `src/app`, Next NO ejecuta `proxy.ts`/`middleware.ts` de la raíz (no tira error, simplemente lo ignora → las rutas sin prefijo dan 404 al no redirigir a `/es`). NO crear `middleware.ts` ni `src/middleware.ts` en paralelo. Si tocás el matcher, verificá con un `console.log` que el proxy realmente corre (`[PROXY HIT]`).
2. **Zod v4 API:** `result.error.issues` en vez de `.errors`. Path puede ser `symbol`, castear a `string`.
3. **Unsplash límite:** 50 req/hour. En producción monitorear uso.
4. **Cloudflare OAuth:** Fue removido. Solo conexión manual con API token.
5. **DNS propagation:** Subdominios nuevos tardan 30s-5min en propagar. El frontend hace polling.
6. **Vercel build:** A veces TypeScript da errores de dependencias (`gel`, `mysql2`). Son falsos positivos de `drizzle-orm`, ignorar.
7. **Subdominios huérfanos:** Si un website se borra/despublica pueden quedar subdominios sin uso. Settings → Dominios tiene "Limpiar sin usar" (`DELETE /api/cloudflare/domains?cleanup=unused`) que borra los huérfanos en Cloudflare + Vercel + DB.
8. **SSL de subdominios (per-subdominio):** Los dominios usan nameservers de Cloudflare, así que Vercel NO auto-emite certificados wildcard. La ruta de publish usa la estrategia confiable: `ensureWildcardRecord` crea el CNAME `*.rootDomain → cname.vercel-dns.com` (solo routing) y `addDomainToVercel(fullDomain)` agrega cada subdominio al proyecto para que Vercel emita su cert vía HTTP-01 (~10–60s). No hay setup manual por dominio: cualquier dominio raíz en `availableDomains` (con su `zoneId`) funciona en la primera publicación. El fix de frontend (botón "Abrir sitio" habilitado al publicar OK) evita que el usuario quede en "Esperando DNS…" durante esa ventana.
9. **Deploys de Preview fallan ("supabaseUrl is required" / "Failed to collect page data"):** Las env vars están configuradas **solo para Production**. Varios clientes SDK se crean a **nivel de módulo** (`auth.ts`, varias rutas `/api/*`, `integrations/stripe.ts`, `mercadopago.ts`, `apify.ts`) y al hacer `next build` (fase "collect page data") se evalúan sin env → revientan. Por eso **Production (`main`) siempre deploya OK pero los Preview (ramas/PRs) fallan**. Fix: habilitar las env vars también para el entorno **Preview** en Vercel (Settings → Environment Variables → tildar "Preview"). Alternativa de código: instanciar esos clientes de forma lazy (no a nivel de módulo). El logo/landing igual renderiza sin env; lo que necesita env es auth/pagos/búsqueda en runtime.

---

## Cómo deployar

```bash
npm run build    # Verificar build local primero
npx vercel --prod
```

- **Production** (push/merge a `main`) deploya OK siempre (tiene las env vars).
- **Preview** (ramas/PRs): requiere que las env vars estén habilitadas para el entorno Preview, si no falla el build (Gotcha #9).
- Para reproducir el build de Preview localmente: `mv .env.local .env.local.bak && npm run build` (y restaurar después).

**Nota:** Nunca usar `git commit`/`git push` a menos que el usuario lo pida explícitamente.

---

## Contacto

**Autor:** Zyrative (johnbigdeal@gmail.com)

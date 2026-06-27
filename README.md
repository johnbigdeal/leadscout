# LeadScout

Buscador inteligente de prospectos multi-canal con CRM Kanban, panel de ventas, website builder instantáneo y sistema de monedas. Extrae negocios de Google Maps, Instagram y LinkedIn, los puntuá con datos de SEO/social, convertilos en leads gestionables y creá landing pages profesionales en segundos.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase)

---

## Características principales

### Búsqueda multi-canal
- **Google Places** — búsqueda por keywords + ubicación (`clockworks/google-places-scraper`)
- **Instagram** — hashtags (`dYMKiEGMgEOeKZ8rR`) con detalles
- **LinkedIn** — scraper de comentarios en posts (`benjarapi/linkedin-post-comments`)

### CRM Kanban
- Tablero drag-and-drop con columnas por etapa
- Pipelines personalizables por organización
- Categorías con color para clasificar leads
- Asignación de servicios con recurrencia (único, mensual, anual, lifetime)
- Detalle completo con actividades, redes sociales y contactos
- **Crear Website** desde cualquier lead — pre-filled con datos del negocio

### Website Builder (ParaluxBuilder)
- Editor visual con tabs: Contenido, Imágenes, Estilo, Contacto, WhatsApp
- Preview en iframe con toggle Desktop/Móvil
- Búsqueda de imágenes vía Unsplash por categoría del lead (traducida al inglés)
- WhatsApp CTA flotante con posición y tamaño configurable
- Publicación instantánea a subdominio (`mi-negocio.leadscout.lat`)
- Multi-domain support: `leadscout.lat`, `pyme.live`, `brber.xyz`

### Panel de Ventas
- 3 gráficos donut: potencial por etapa, cerrados por recurrencia, MRR por recurrencia
- CRUD de servicios con costo USD y tipo de recurrencia
- Cálculo automático de MRR/ARR por etapa

### Sistema de monedas
- Moneda base por organización (USD, CRC, CLP, COP, ARS, PEN, EUR, etc.)
- Tasas de cambio vía `@fawazahmed0/currency-api` (free, no API key)
- Conversión automática en toda la UI

### Auth avanzado
- Email + password con validación Zod
- Magic Links (login sin password)
- Forgot password con email reset
- Email confirmation
- Middleware de Next.js para protección a nivel edge
- Superadmin + flujo de aprobación de usuarios

### Otros
- **Magic links** — compartir resultados de búsqueda públicamente sin login
- **Idioma** — español únicamente (next-intl con locale `es`)
- **Deploy en Vercel** — API routes con `maxDuration = 300` para scraping síncrono

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript 5.7 |
| Estilos | Tailwind CSS v4 + shadcn/ui + tw-animate-css |
| DB ORM | Drizzle ORM + postgres-js |
| Auth | Supabase Auth (PKCE, cookies SSR) |
| Validation | Zod v4 |
| Scraping | Apify SDK (actores de terceros) |
| Images | Unsplash API |
| DNS | Cloudflare API (manual token) |
| i18n | next-intl (solo `es`) |
| Toasts | sonner |
| Charts | Recharts (PieChart donut) |
| Icons | Lucide React v1.21.0 |

---

## Requisitos

- Node.js 20+
- Cuenta de [Apify](https://apify.com) (para scraping)
- Proyecto de [Supabase](https://supabase.com) (Auth + PostgreSQL)
- Cuenta de [Vercel](https://vercel.com) (deploy)
- Cuenta de [Cloudflare](https://cloudflare.com) (DNS para subdominios)
- Cuenta de [Unsplash](https://unsplash.com/developers) (images, free tier)

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/johnbigdeal/leadscout.git
cd leadscout
npm install
```

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL base de tu app (ej: `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (para admin approvals) |
| `DATABASE_URL` | Connection string de PostgreSQL |
| `APIFY_TOKEN` | Token de tu cuenta Apify |
| `VERCEL_TOKEN` | Token de Vercel (para agregar dominios) |
| `UNSPLASH_ACCESS_KEY` | Access key de Unsplash |

### 3. Base de datos

```bash
# Aplicar migraciones
npx drizzle-kit migrate

# O generar y aplicar
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 4. Correr dev server

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

---

## Arquitectura

### Flujo de búsqueda (síncrono)

```
Usuario → POST /api/searches
  → Crea search row (status: running)
  → Llama Apify actor según canal
    → Google Places: clockworks/google-places-scraper
    → Instagram: dYMKiEGMgEOeKZ8rR (hashtag)
    → LinkedIn: benjarapi/linkedin-post-comments
  → Procesa resultados
    → Matching por teléfono/nombre normalizado
    → Si existe: linkea socialProfiles
    → Si no: crea business + socialProfiles
  → Actualiza search a completed
  → Retorna businesses al frontend
```

### Flujo de publish

```
Builder → POST /api/websites/[id]/publish
  → Valida subdomain
  → Busca zoneId del rootDomain en available_domains
  → Crea CNAME en Cloudflare: {subdomain} → cname.vercel-dns.com
  → IMPORTANTE: proxied: false (DNS only / gris)
  → Agrega dominio a Vercel project
  → Guarda en custom_domains
  → Actualiza website.status = "published"
  → Frontend hace polling hasta que HTTP 200
```

### Flujo de creación de website desde lead

```
CRM → Click "Crear Website"
  → POST /api/websites (con leadId)
  → Busca categoría del lead → traduce al inglés
  → Busca imágenes en Unsplash: "{category} business"
  → Asigna: [0]→hero, [1]→about, [2]→statement, [3-6]→gallery
  → Crea website con datos pre-filled del business
  → Redirect a /dashboard/builder/{id}
```

### Auth (centralizado)

```
Middleware (edge) → protege /dashboard/* y /api/*
  → Si no hay sesión: redirect a /auth/sign-in

API Routes → requireAuth(request)
  → Valida Bearer token
  → Obtiene user de Supabase
  → Obtiene membership (orgId, role, approved)
  → Retorna AuthContext

Dashboard Layout → Server Component
  → Obtiene user directo de Supabase (cookies)
  → Verifica membership + approved
  → Redirect si no aprobado
```

### Modelo de datos (principales)

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant/empresa. `currency`, `subscription` |
| `memberships` | Relación user-org. Campos: `role`, `approved` |
| `users` | Perfil extendido de Supabase Auth |
| `searches` | Búsquedas ejecutadas |
| `businesses` | Resultados crudos de scraping |
| `socialProfiles` | Perfiles sociales linkeados a business |
| `leads` | Negocios convertidos a leads. `stage`, `pipelineId`, `categoryId` |
| `pipelines` | Pipelines custom por org |
| `leadCategories` | Categorías con color |
| `services` | Servicios ofrecidos |
| `leadServices` | Servicios asignados a leads |
| `websites` | Websites creados. `data` (JSON), `status`, `subdomain`, `domain` |
| `customDomains` | Dominios publicados. `domain`, `dnsRecordId`, `zoneId` |
| `availableDomains` | Dominios disponibles para publish |
| `cloudflareAccounts` | Cuenta Cloudflare conectada |
| `searchShares` | Tokens para compartir búsquedas |
| `apifyRuns` | Tracking de runs de Apify |

### Estructura de carpetas

```
src/
  app/
    [lang]/                 # i18n routing (solo es)
      auth/                 # Sign-in, sign-up, forgot-password, magic-link, confirm
      dashboard/
        crm/                # CRM Kanban
        sales/              # Panel de ventas
        search/             # Formulario de búsqueda
        results/            # Resultados de búsqueda
        websites/           # Lista de websites
        builder/[id]/       # ParaluxBuilder
        settings/           # Configuración
        settings/domains/   # Cloudflare + available_domains
        admin/approvals/    # Aprobaciones (superadmin)
      site/[domain]/        # Public published sites
      magic/search/[token]/ # Vista pública de búsquedas
    api/                    # API routes
  components/
    ui/                     # shadcn/ui components
    ParaluxBuilder.jsx      # Website builder
  lib/
    auth.ts                 # Auth centralizado
    auth-errors.ts          # Traducción errores Supabase
    rate-limit.ts           # Rate limiter
    db/                     # Drizzle schema + connection
    paralux/
      generate-html.ts      # HTML generator
      category-translations.ts # Mapa categorías ES→EN
    supabase/               # Client + server helpers
    currency-context.tsx    # Contexto global de moneda
    i18n/                   # Config next-intl
```

---

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/searches` | Ejecutar búsqueda |
| GET | `/api/searches/list` | Listar búsquedas |
| GET | `/api/searches/[id]/results` | Resultados de una búsqueda |
| POST | `/api/searches/[id]/share` | Generar magic link |
| GET | `/api/magic/search/[token]` | Ver búsqueda pública |
| GET | `/api/leads` | Listar leads |
| POST | `/api/leads` | Crear lead desde business |
| GET | `/api/leads/[id]` | Detalle de lead |
| PATCH | `/api/leads/[id]` | Actualizar stage/tags/category |
| DELETE | `/api/leads/[id]` | Eliminar lead |
| GET/POST | `/api/leads/[id]/activities` | Actividades |
| GET/POST | `/api/leads/[id]/services` | Servicios asignados |
| GET/POST | `/api/services` | CRUD de servicios |
| GET/PUT | `/api/settings/currency` | Moneda de la org |
| GET | `/api/settings/exchange-rate` | Tasas de cambio |
| GET/POST | `/api/pipelines` | Pipelines |
| PATCH | `/api/pipelines/[id]` | Renombrar pipeline |
| GET/POST | `/api/lead-categories` | Categorías |
| GET | `/api/sales/stats` | Estadísticas de ventas |
| POST | `/api/onboarding` | Crear org post-signup |
| GET/POST | `/api/admin/approvals` | Aprobar/rechazar usuarios |
| GET | `/api/auth/status` | Rol, aprobación, moneda |
| GET | `/api/websites` | Listar websites |
| POST | `/api/websites` | Crear website |
| GET/PUT/DELETE | `/api/websites/[id]` | CRUD website |
| POST | `/api/websites/[id]/publish` | Publicar website |
| POST | `/api/websites/[id]/unpublish` | Despublicar website |
| GET/POST/PATCH/DELETE | `/api/domains/available` | Dominios disponibles |
| GET | `/api/images/search` | Buscar imágenes Unsplash |
| GET/POST | `/api/cloudflare/connect` | Conectar Cloudflare |
| GET | `/api/cloudflare/zones` | Listar zonas Cloudflare |
| GET/POST/DELETE | `/api/cloudflare/domains` | Subdominios. `DELETE ?id=` borra uno; `DELETE ?cleanup=unused` limpia los huérfanos |
| GET | `/site/[domain]` | Sirve el site publicado como HTML real (route handler) |

---

## Actores de Apify

| Canal | Actor | Input |
|---|---|---|
| Google Places | `clockworks/google-places-scraper` | `{ searchStrings, locationQuery, language }` |
| Instagram | `dYMKiEGMgEOeKZ8rR` | `{ searchType: "hashtag", searchQuery, resultsType: "details" }` |
| LinkedIn | `benjarapi/linkedin-post-comments` | `{ postUrl, maxComments: 100 }` |

---

## Convenciones

- Todas las API routes usan `export const dynamic = "force-dynamic"`
- Auth vía `requireAuth(request)` desde `@/lib/auth` (no duplicar)
- Todo en USD en la base de datos; conversión en la UI con `CurrencyContext`
- Idioma: español únicamente — strings en `messages/es.json` (no agregar otros locales)
- Feedback asíncrono con toasts de `sonner` (`<Toaster>` montado en `[lang]/layout.tsx`); no usar `alert()`
- Componentes UI en `src/components/ui/` (shadcn/ui v4)
- Zod v4: usar `result.error.issues` (NO `.errors`)
- Logo/marca: usar `<Logo>` de `@/components/Logo` (assets en `public/brand/`, `theme="light"` para fondos oscuros); colores de marca en `globals.css` (navy `#1a2b3c`, azul `#2563eb`). Sitios generados llevan la insignia "Hecho con LeadScout" (obligatoria en Free, ocultable en Pro)

---

## Deploy

```bash
npm run build      # Verificar build local
npx vercel --prod  # Deploy a producción
```

Configuración en Vercel Dashboard:
- `maxDuration: 300` en API routes de scraping
- Variables de entorno (ver tabla arriba) — **habilitarlas para Production _y_ Preview**

> ⚠️ **Preview deploys:** si las env vars solo están en *Production*, los deploys de Preview (ramas/PRs) **fallan en el build** (`supabaseUrl is required` / `Failed to collect page data`). Varios clientes SDK (Supabase, Stripe, MercadoPago, Apify) se instancian a nivel de módulo y se evalúan en build sin env. Production (`main`) deploya OK igual; para que los Preview compilen, tildá cada var también para "Preview" en Vercel. Repro local del build de Preview: `mv .env.local .env.local.bak && npm run build` (restaurar después).

---

## Documentación adicional

- [`docs/CLOUDFLARE-SETUP.md`](docs/CLOUDFLARE-SETUP.md) — Configuración de dominios con Cloudflare + Vercel
- [`docs/BUILDER.md`](docs/BUILDER.md) — Documentación del Website Builder
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Decisiones técnicas y arquitectura

---

## Roadmap / Próximos pasos

- [ ] Webhooks de Stripe/Mercado Pago para suscripciones
- [ ] Exportar leads a CSV/Excel
- [ ] Email notifications (nuevos leads, cambios de stage)
- [ ] AI scoring de leads
- [ ] Mobile app (React Native)

---

## Licencia

MIT — ver [LICENSE](LICENSE)

---

## Autor

**Zyrative** ([johnbigdeal@gmail.com](mailto:johnbigdeal@gmail.com))

Repo: [github.com/johnbigdeal/leadscout](https://github.com/johnbigdeal/leadscout)

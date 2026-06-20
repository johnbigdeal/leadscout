# LeadScout

Buscador inteligente de prospectos multi-canal con CRM Kanban, panel de ventas y sistema de monedas. Extrae negocios de Google Maps, Instagram y LinkedIn, los puntuá con datos de SEO/social y convertilos en leads gestionables.

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
- Tablero drag-and-drop con columnas por etapa (`new` → `contacted` → `qualified` → `proposal` → `negotiation` → `closed_won`/`closed_lost`)
- Pipelines personalizables por organización
- Categorías con color para clasificar leads
- Asignación de servicios con recurrencia (único, mensual, anual, lifetime)
- Detalle completo con actividades, redes sociales y contactos

### Panel de Ventas
- 3 gráficos donut: potencial por etapa, cerrados por recurrencia, MRR por recurrencia
- CRUD de servicios con costo USD y tipo de recurrencia
- Cálculo automático de MRR/ARR por etapa

### Sistema de monedas
- Moneda base por organización (USD, CRC, CLP, COP, ARS, PEN, EUR, etc.)
- Tasas de cambio vía `@fawazahmed0/currency-api` (free, no API key)
- Conversión automática en toda la UI

### Otros
- **Magic links** — compartir resultados de búsqueda públicamente sin login
- **Superadmin + aprobación** — detección automática de superadmin por email, flujo de aprobación de usuarios
- **i18n** — español (es) y portugués brasileño (pt-BR)
- **Deploy en Vercel** — API routes con `maxDuration = 300` para scraping síncrono

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5.7 |
| Estilos | Tailwind CSS v4 + shadcn/ui (base-ui) |
| DB ORM | Drizzle ORM + postgres-js |
| Auth | Supabase Auth (PKCE, cookies) |
| Scraping | Apify SDK (actores de terceros) |
| i18n | next-intl |
| Charts | Recharts (PieChart donut) |

---

## Requisitos

- Node.js 20+
- Cuenta de [Apify](https://apify.com) (para scraping)
- Proyecto de [Supabase](https://supabase.com) (Auth + PostgreSQL)
- Cuenta de [Vercel](https://vercel.com) (deploy)

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
| `DATABASE_URL` | Connection string de PostgreSQL (formato `postgres://...`) |
| `APIFY_TOKEN` | Token de tu cuenta Apify |
| `INNGEST_EVENT_KEY` | Event key de Inngest (opcional, para background jobs) |
| `INNGEST_SIGNING_KEY` | Signing key de Inngest (opcional) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe (para pagos futuros) |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Clave pública de Mercado Pago (para LATAM) |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de Mercado Pago |
| `REDIS_URL` | URL de Redis (opcional, para caching) |

### 3. Base de datos

```bash
# Aplicar migraciones
npx drizzle-kit migrate

# O generar y aplicar
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 4. Inngest (opcional, para background jobs)

```bash
npx inngest-cli@latest dev
```

### 5. Correr dev server

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
  → Opcional: PageSpeed + social scraper secundario
  → Actualiza search a completed
  → Retorna businesses al frontend
```

**Nota:** El pipeline es síncrono (`call()` en vez de `start()`). El frontend espera la respuesta con `loading`.

### Modelo de datos (principales)

| Tabla | Propósito |
|---|---|
| `organizations` | Tenant/empresa. Tiene `currency`, `subscription` |
| `memberships` | Relación user-org. Campos: `role`, `approved` |
| `users` | Perfil extendido de Supabase Auth |
| `searches` | Búsquedas ejecutadas. `keywords`, `location`, `channels`, `status` |
| `businesses` | Resultados crudos de scraping. `source`, `placeId`, `rawJson` |
| `socialProfiles` | Perfiles sociales linkeados a business |
| `leads` | Negocios convertidos a leads. `stage`, `pipelineId`, `categoryId` |
| `pipelines` | Pipelines custom por org. `name`, `stages[]` |
| `leadCategories` | Categorías con color |
| `services` | Servicios ofrecidos. `name`, `costUsd`, `recurrence` |
| `leadServices` | Servicios asignados a leads. `recurrence`, `startDate`, `endDate` |
| `searchShares` | Tokens mágicos para compartir búsquedas públicamente |
| `apifyRuns` | Tracking de runs de Apify |

### Estructura de carpetas

```
src/
  app/
    [lang]/                 # i18n routing (es, pt-BR)
      auth/sign-in/         # Login
      auth/sign-up/         # Registro
      dashboard/
        crm/                # CRM Kanban
        sales/              # Panel de ventas
        search/             # Formulario de búsqueda
        results/            # Resultados de búsqueda
        settings/           # Configuración
        admin/approvals/    # Aprobaciones (superadmin)
      magic/search/[token]/ # Vista pública de búsquedas compartidas
    api/                    # API routes
  components/
    ui/                     # shadcn/ui components
    business-card.tsx       # Tarjeta de negocio
  lib/
    db/                     # Drizzle schema + connection
    integrations/           # Apify, PageSpeed, scrapers
    supabase/               # Cliente + server helpers
    currency-context.tsx    # Contexto global de moneda
    i18n/                   # Config de next-intl
```

---

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/searches` | Ejecutar búsqueda |
| GET | `/api/searches/list` | Listar búsquedas del usuario |
| GET | `/api/searches/[id]/results` | Resultados de una búsqueda |
| POST | `/api/searches/[id]/share` | Generar magic link |
| GET | `/api/magic/search/[token]` | Ver búsqueda pública |
| GET | `/api/leads` | Listar leads (con filtros) |
| POST | `/api/leads` | Crear lead desde business |
| GET | `/api/leads/[id]` | Detalle de lead |
| PATCH | `/api/leads/[id]` | Actualizar stage/tags/category/pipeline |
| DELETE | `/api/leads/[id]` | Eliminar lead |
| GET/POST | `/api/leads/[id]/activities` | Actividades del lead |
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

---

## Actores de Apify

| Canal | Actor | Input |
|---|---|---|
| Google Places | `clockworks/google-places-scraper` | `{ searchStrings, locationQuery, language }` |
| Instagram | `dYMKiEGMgEOeZ8rR` | `{ searchType: "hashtag", searchQuery, resultsType: "details", resultsLimit: 10 }` |
| LinkedIn | `benjarapi/linkedin-post-comments` | `{ postUrl, maxComments: 100, sortOrder: "RELEVANCE" }` |

---

## Convenciones

- Todas las API routes usan `export const dynamic = "force-dynamic"`
- Auth vía Bearer token desde cookies de Supabase
- Todo en USD en la base de datos; conversión en la UI con `CurrencyContext`
- i18n: strings en `messages/es.json` y `messages/pt-BR.json`
- Componentes UI en `src/components/ui/` (shadcn/ui v4)

---

## Deploy

El proyecto está optimizado para **Vercel**:

```bash
npx vercel --prod
```

Configuración clave en `vercel.json` (si aplica):
- `maxDuration: 300` en API routes de scraping
- Variables de entorno en Vercel Dashboard

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

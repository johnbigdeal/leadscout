# Decisiones de Arquitectura

> Documento de decisiones técnicas (ADRs) para LeadScout. Explica el "por qué" detrás de cada elección importante.

---

## ADR-001: Supabase Auth en vez de Clerk

**Contexto:** Necesitábamos auth con multi-org/teams, OAuth, magic links, y buena UX.

**Opciones consideradas:**
- Supabase Auth (gratis hasta 50k MAU, incluido con DB)
- Clerk (gratis hasta 10k MAU, $0.02/MAU después)

**Decisión:** Supabase Auth

**Razones:**
1. **Precio:** Supabase da 50k MAU gratis vs. 10k de Clerk
2. **RLS nativo:** Row Level Security de PostgreSQL se integra directamente con Supabase Auth
3. **Self-hostable:** Podemos hostear todo local si necesitamos
4. **Todo en uno:** Auth + DB + Storage en una sola plataforma
5. **Drizzle compatible:** Funciona bien con nuestra stack existente

**Trade-offs:**
- UX de login más básica (lo mejoramos con shadcn/ui + custom forms)
- Organizaciones requieren implementación manual (ya lo hicimos)
- Menos features pre-armadas (onboarding flows, etc.)

**Estado:** ✅ Implementado. Auth centralizado en `src/lib/auth.ts`.

---

## ADR-002: proxied: false en Cloudflare DNS

**Contexto:** Al publicar subdominios, necesitamos que Vercel valide el dominio y genere SSL automáticamente.

**Opciones consideradas:**
- `proxied: true` (naranja) — Cloudflare proxyea todo, SSL propio
- `proxied: false` (gris) — DNS only, Vercel ve el CNAME real

**Decisión:** `proxied: false` (DNS only)

**Razones:**
1. **Vercel necesita ver el CNAME:** Para validar que somos dueños del dominio, Vercel lee el registro DNS. Si Cloudflare proxyea (naranja), Vercel ve IPs de Cloudflare en vez del CNAME.
2. **SSL automático:** Vercel genera y renueva certificados Let's Encrypt automáticamente cuando ve el CNAME.
3. **Sin "Too many redirects":** Con proxy naranja + Vercel, hay doble SSL termination que causa redirects infinitos.
4. **Recomendación oficial de Vercel:** [Vercel Docs - Cloudflare Integration](https://vercel.com/docs/integrations/cloudflare)

**Trade-offs:**
- Sin CDN de Cloudflare para los subdominios (pero Vercel Edge Network ya hace CDN)
- Sin DDoS protection de Cloudflare (aceptable para landing pages de clientes)
- IP real de Vercel expuesta (no es un problema de seguridad)

**Estado:** ✅ Implementado. CNAME records se crean con `proxied: false`.

---

## ADR-003: Published sites servidos como documento HTML real (no iframe)

**Contexto:** Los sites publicados deben ser indexables por Google y mostrar previews correctos al compartir en redes (WhatsApp, Facebook, X, LinkedIn).

**Historia:** Inicialmente los sites publicados se renderizaban dentro de un `<iframe srcDoc={html}>` en una página Next.js. Problema: los crawlers leían el documento **exterior** (cuyo `<title>` era el dominio crudo y cuyo `<body>` era solo el iframe), no el HTML interior. Resultado: SEO pobre, sin meta description, previews de compartir vacíos, y título de pestaña = dominio.

**Decisión:** Servir el HTML generado **como el documento real** mediante un Route Handler (`src/app/site/[domain]/route.ts`) que responde `text/html`. El HTML que produce `generateHTML()` ya es un documento completo (`<!doctype html>` con su propio `<title>`, `<meta description>` y Open Graph/Twitter Cards derivados del negocio).

**Razones:**
1. **SEO:** Google indexa el contenido real del site, con título y descripción correctos.
2. **Compartibilidad:** Los meta Open Graph/Twitter del `<head>` generan previews ricos al compartir.
3. **Título de pestaña** correcto (nombre del negocio).
4. **Anchor links** (`#servicios`, `#contacto`) siguen funcionando: es un documento real, `href="#section"` resuelve nativamente.

**Trade-offs:**
- El 404 se devuelve como `Response` 404 (no `notFound()`).
- Sin hidratación React en el site público (es HTML estático autónomo con estilos inline; no se necesita).

**Estado:** ✅ Implementado. Published sites: `src/app/site/[domain]/route.ts` sirve el HTML directo.

**Nota:** El **builder preview** (dentro del dashboard) sigue usando `<iframe srcDoc={html}>` — ahí sí es correcto, porque es una preview de edición en vivo, no la página pública. Antes usaba blob URLs (temporales, rompían al refresh) y fue corregido a `srcDoc`.

---

## ADR-004: Auth centralizado en src/lib/auth.ts

**Contexto:** Cada API route tenía una función `auth()` copiada y pegada (~21 archivos).

**Problema:**
- Duplicación masiva de código
- Si cambiaba algo, había que tocar 21 lugares
- Inconsistencias entre rutas

**Decisión:** Crear `src/lib/auth.ts` con helpers reutilizables

**API:**
```ts
authenticateRequest(request) → AuthContext | null
requireAuth(request, options?) → { ctx } | { response }
requireAdmin(request) → { ctx } | { response }
getOrgCurrency(orgId) → string
translateAuthError(error) → string
```

**Razones:**
1. **DRY:** Una sola fuente de verdad para auth
2. **Consistency:** Todas las rutas usan el mismo patrón
3. **Testability:** Se puede testear auth en un solo lugar
4. **Type safety:** `AuthContext` tipado con orgId, role, approved

**Estado:** ✅ Implementado. 21 API routes refactorizadas.

---

## ADR-005: Middleware de Next.js para protección de rutas

**Contexto:** El dashboard "protegía" con un `useEffect` en el cliente que hacía fetch a `/api/auth/status`.

**Problema:**
- Flash de contenido no autenticado antes de redirigir
- Bypassable desactivando JavaScript
- No protegía `/api/*` (cada route tenía que validar manualmente)

**Decisión:** Implementar middleware de Next.js (`src/middleware.ts`)

**Razones:**
1. **Edge-level protection:** Corre antes de que la request llegue al servidor
2. **No flash:** Redirección instantánea, sin renderizar contenido
3. **Seguro:** No se puede bypassar desde el cliente
4. **Universal:** Protege tanto `/dashboard/*` como `/api/*`

**Trade-offs:**
- Deprecado en Next.js 16 (mensaje: "use proxy instead"). Aún funciona.
- No tiene acceso a Drizzle/DB (usa Supabase server client con cookies)

**Estado:** ✅ Implementado. Middleware protege `/dashboard/*` y `/api/*`.

---

## ADR-006: Category translation para Unsplash

**Contexto:** Al crear un website desde un lead, queremos buscar imágenes relevantes en Unsplash.

**Problema:**
- Las categorías del lead están en español (ej: "Barbería", "Tecnología")
- Unsplash funciona mejor en inglés
- Búsquedas en español dan resultados peores

**Decisión:** Crear mapa de traducción español → inglés

**Implementación:**
- `src/lib/paralux/category-translations.ts`
- 180+ categorías mapeadas
- Función `translateCategory()` normaliza (lowercase, trim, replace spaces with underscores)

**Ejemplo:**
```ts
"Barbería" → "barbershop"
"Tecnología" → "technology"
"Restaurante" → "restaurant"
```

**Razones:**
1. **Mejores resultados:** Unsplash en inglés tiene más contenido relevante
2. **Consistente:** Siempre se traduce, no importa el idioma de la categoría
3. **Extensible:** Fácil agregar más categorías al mapa

**Trade-offs:**
- Categorías personalizadas no en el mapa no se traducen (fallback a original)
- Mantenimiento: hay que agregar nuevas categorías manualmente

**Estado:** ✅ Implementado. Búsqueda automática al crear website desde lead.

---

## ADR-007: Rate limiting en memoria

**Contexto:** El endpoint `/api/onboarding` crea organizaciones y es público (llamado desde sign-up).

**Riesgo:** Abuso — alguien podría spammear sign-ups y crear miles de orgs.

**Decisión:** Rate limiter simple en memoria

**Implementación:**
- `src/lib/rate-limit.ts`
- Mapa en memoria: `{ identifier → { count, resetTime } }`
- Default: 10 requests / 1 minuto

**Razones:**
1. **Simple:** No requiere Redis ni servicio externo
2. **Suficiente:** Para onboarding, 10 req/min es más que suficiente
3. **No state:** Se resetea al redeployar (aceptable para este caso)

**Trade-offs:**
- No persiste entre deploys
- No funciona en múltiples instancias (si escalamos horizontalmente)
- Para escala: migrar a Redis o Vercel KV

**Estado:** ✅ Implementado en `/api/onboarding`.

---

## ADR-008: Dashboard layout como Server Component

**Contexto:** El dashboard layout anterior era un Client Component que hacía `fetch("/api/auth/status")` en un `useEffect`.

**Problema:**
- Fetch innecesario — el servidor ya tiene acceso a las cookies de auth
- Flash de "Esperando aprobación" antes de redirigir
- Latencia extra en cada carga del dashboard

**Decisión:** Convertir a Server Component

**Implementación:**
- `src/app/[lang]/dashboard/layout.tsx` → Server Component
- Obtiene user directo de Supabase via `createBrowserClient()`
- Verifica membership y approved
- Redirige en el servidor (redirect de Next.js)
- Pasa `isAdmin` y `currency` al Client Component hijo

**Razones:**
1. **Menos requests:** Sin fetch a `/api/auth/status`
2. **Más rápido:** Auth se resuelve en el servidor antes de enviar HTML
3. **Mejor UX:** No hay flash de contenido no autorizado
4. **SEO:** Server Components son mejores para SEO

**Estado:** ✅ Implementado.

---

## Decisiones pendientes / Futuras

### CDN para imágenes
- **Opción:** Cloudflare Images, Cloudinary, o proxy propio
- **Problema:** Unsplash images pueden ser lentas desde algunas regiones
- **Status:** No implementado. Usando URLs directas de Unsplash.

### Caché de búsquedas
- **Opción:** Redis, Vercel KV, o caché en memoria
- **Problema:** Búsquedas repetidas con mismos keywords son costosas (Apify)
- **Status:** No implementado.

### Background jobs
- **Opción:** Inngest (ya está en dependencias pero no usado activamente)
- **Problema:** Scraping síncrono bloquea el request
- **Status:** Inngest configurado pero no en uso crítico.

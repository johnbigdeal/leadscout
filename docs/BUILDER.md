# Website Builder (ParaluxBuilder)

> Editor visual para crear landing pages instantáneas desde leads del CRM.

---

## Overview

ParaluxBuilder es un editor WYSIWYG integrado en el dashboard de LeadScout. Permite crear landing pages profesionales en minutos con contenido pre-filled desde los datos del lead.

**Ubicación:** `src/components/ParaluxBuilder.jsx`

---

## Flujo de uso

1. **Desde CRM:** Click "Crear Website" en un lead → crea website pre-filled → redirect al builder
2. **Desde Websites:** Click "Editar" en un website existente
3. **Editar:** Modificar contenido, imágenes, estilo, contacto, WhatsApp
4. **Preview:** Ver en desktop o mobile
5. **Publicar:** Elegir subdominio y dominio → deploy instantáneo

---

## Tabs del Builder

### 1. Contenido
- **Business Name** — Nombre del negocio (hero headline)
- **Tagline** — Eslogan corto
- **Hero Subtext** — Descripción del hero
- **About Title/Text** — Sección "Sobre nosotros"
- **Services** — Lista de servicios (título + descripción)
- **CTA Text** — Texto del botón de llamada a la acción

### 2. Imágenes
- **Unsplash Search** — Buscar imágenes por keyword
- **Asignar a sección:**
  - Hero (imagen principal)
  - Nosotros (about section)
  - Frase (statement section background)
  - Galería (hasta 4 imágenes)
- **Auto-asignación:** Al crear desde lead, se asignan automáticamente según posición en resultados

### 3. Estilo
- **Preset:** Modern, Classic, Bold, Minimal
- **Dark Mode:** Toggle claro/oscuro
- **Accent Color:** Color principal (botones, links)
- **Font:** Fuente tipográfica

### 4. Contacto
- **Phone** — Número de teléfono
- **Email** — Email de contacto
- **Location** — Dirección
- **Instagram** — Perfil de Instagram
- **Website** — URL del sitio web

### 5. WhatsApp
- **Toggle** — Activar/desactivar botón flotante
- **Phone** — Número de WhatsApp
- **Pre-loaded Message** — Mensaje pre-cargado
- **Position:** Right / Left / Center
- **Size:** Normal / Large
- **Preview** — Vista previa del botón verde flotante

---

## Cómo funciona el preview

El builder usa un `<iframe>` con `srcDoc={html}` para mostrar la preview en tiempo real.

```tsx
<iframe
  srcDoc={preview}
  sandbox="allow-scripts"
/>
```

**Por qué `srcDoc` y no blob URL:**
- Blob URLs (`URL.createObjectURL`) son temporales — se invalidan al refresh
- `srcDoc` inyecta el HTML directamente en el iframe
- Los anchor links (`#servicios`, `#contacto`) funcionan correctamente con JavaScript de scroll

---

## generateHTML()

**Ubicación:** `src/lib/paralux/generate-html.ts`

Función pura (no depende de React) que genera HTML estático completo:

```ts
function generateHTML(data: WebsiteData): string {
  // Retorna string HTML con:
  // - CSS inline (Tailwind-like + custom)
  // - JavaScript para scroll animations, parallax, reveal
  // - Navbar con anchor links
  // - Hero, About, Services, Statement, Gallery, Contact, Footer
  // - WhatsApp FAB button (posicionado según config)
}
```

**Características del HTML generado:**
- **Responsive** — Mobile-first con breakpoints
- **Animations** — Scroll reveal, parallax hero, intersection observer
- **Anchor links** — JavaScript intercepta clicks y hace scroll suave
- **No external dependencies** — Todo inline (excepto Google Fonts)
- **Dark mode** — Clases CSS condicionales

---

## Flujo de Publish

### 1. Frontend — Builder
```
User click "Publicar"
  → Dialog: elegir dominio + subdomain
  → Click "Publicar" → POST /api/websites/[id]/publish
  → Show loading spinner
  → On success: show success modal
  → Start polling: check HTTP status every 4s
  → When HTTP 200: enable "Abrir sitio" button
```

### 2. Backend — Publish API
```
POST /api/websites/[id]/publish
  → Validate subdomain format
  → Resolve zoneId from available_domains
  → Create/update CNAME in Cloudflare (proxied: false)
  → Add domain to Vercel project
  → Save to custom_domains table
  → Update website: status="published", subdomain, domain, publishedUrl
  → Return { url: "https://subdomain.domain.com" }
```

### 3. DNS Record
```
Type: CNAME
Name: {subdomain}
Target: cname.vercel-dns.com
Proxy: DNS only (GRIS) ← CRÍTICO
TTL: 1 (auto)
```

---

## Public Site Rendering

**Ubicación:** `src/app/site/[domain]/route.ts` (Route Handler, no página React)

Cuando alguien visita `https://mi-negocio.leadscout.lat`:

1. Middleware detecta subdomain → rewrite a `/site/[domain]`
2. El Route Handler `GET` busca website por `domain` o `subdomain`
3. Llama `generateHTML(site.data)`
4. Retorna el HTML directo: `new Response(html, { headers: { "content-type": "text/html" } })`
5. El HTML es un documento completo (con `<head>`, `<title>`, meta description, Open Graph/Twitter) → indexable y compartible
6. El HTML tiene JavaScript para anchor links funcionales

> **No se usa `<iframe>` para el site público** (sí para el preview del builder). Servirlo como documento real es lo que da SEO y previews de compartir correctos. Ver `docs/ARCHITECTURE.md` ADR-003.

---

## Imágenes — Unsplash Integration

### Auto-search al crear website

Cuando se crea un website desde un lead:

```
Lead category: "Barbería"
  → translateCategory("Barbería") → "barbershop"
  → Search Unsplash: "barbershop business"
  → Results: [img1, img2, img3, img4, img5, img6, img7, img8]
  → Assign:
    img1 → heroImage
    img2 → aboutImage
    img3 → stmtImage
    img4-7 → gallery
```

### Mapa de categorías

**Ubicación:** `src/lib/paralux/category-translations.ts`

180+ categorías español → inglés:
- `barbería` → `barbershop`
- `tecnología` → `technology`
- `restaurante` → `restaurant`
- `salud` → `healthcare`
- etc.

**Fallback:** Si no hay match, usa la categoría original.

---

## WhatsApp FAB Button

El botón flotante de WhatsApp se renderiza en el HTML generado:

```html
<a class="wa wa--right wa--normal" href="https://wa.me/PHONE?text=MESSAGE">
  <svg>...</svg>
</a>
```

**Clases CSS:**
- `.wa--right` / `.wa--left` / `.wa--center` — Posición
- `.wa--normal` / `.wa--large` — Tamaño
- Animation: pulse CSS keyframes

---

## Estado del website

| Estado | Descripción |
|--------|-------------|
| `draft` | Creado pero no publicado |
| `published` | Publicado con subdomain activo |

Al unpublish:
- Borra registro DNS de Cloudflare
- Borra de `custom_domains`
- Cambia status a `draft`

Al delete:
- Borra registro DNS de Cloudflare
- Borra de `custom_domains`
- Borra el website

---

## Componentes clave

| Componente | Archivo | Propósito |
|-----------|---------|-----------|
| ParaluxBuilder | `src/components/ParaluxBuilder.jsx` | Editor visual principal |
| generateHTML | `src/lib/paralux/generate-html.ts` | Generador HTML puro |
| category-translations | `src/lib/paralux/category-translations.ts` | Mapa ES→EN |
| Builder Page | `src/app/[lang]/dashboard/builder/[id]/page.tsx` | Wrapper del builder |
| Public Site | `src/app/site/[domain]/route.ts` | Sirve sites publicados como HTML real (no iframe) |

---

## API Endpoints relacionados

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/websites` | Crear website (auto-images desde lead) |
| GET | `/api/websites` | Listar websites |
| GET/PUT/DELETE | `/api/websites/[id]` | CRUD website |
| POST | `/api/websites/[id]/publish` | Publicar a subdomain |
| POST | `/api/websites/[id]/unpublish` | Despublicar |
| GET | `/api/images/search` | Buscar imágenes Unsplash |
| GET/POST | `/api/domains/available` | Dominios disponibles para publish |

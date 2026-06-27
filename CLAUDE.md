# LeadScout — Resumen para Claude / Agents

> TL;DR: Plataforma B2B de prospecting + CRM + website builder. Next.js 16, Supabase Auth, Drizzle, Cloudflare DNS.

---

## Qué es

LeadScout busca negocios en Google Maps/Instagram/LinkedIn, los convierte en leads en un CRM Kanban, y permite crear landing pages instantáneas para cada lead.

**URL:** https://leadscout.lat

---

## Stack en 10 segundos

- **Next.js 16** + TypeScript + Tailwind v4 + shadcn/ui
- **PostgreSQL** + Drizzle ORM
- **Supabase Auth** (email, Google OAuth, Magic Links)
- **Cloudflare API** para DNS de subdominios
- **Unsplash API** para imágenes
- **Vercel** para deploy

---

## Cómo empezar

```bash
npm install
# Configurar .env.local (ver README.md)
npx drizzle-kit migrate
npm run dev
```

---

## Convenciones clave

1. **Auth:** Usar `requireAuth(request)` desde `@/lib/auth`. Nunca duplicar.
2. **Middleware:** Protege `/dashboard/*` y `/api/*` a nivel edge.
3. **Cloudflare DNS:** Siempre `proxied: false` (gris, NO naranja). Vercel necesita ver el CNAME.
4. **Builder preview:** Usar `srcDoc={html}` (NO blob URLs). Pero el **site público** se sirve como documento HTML real desde `site/[domain]/route.ts` (NO iframe — SEO/compartir).
5. **Zod v4:** Usar `.issues` en vez de `.errors`.
6. **Moneda:** Todo en USD en DB. Conversión en UI.
7. **Idioma:** Español únicamente (`messages/es.json`). Nunca agregar portugués u otros locales.
8. **Feedback:** Chequear `res.ok` y usar `toast` de `sonner` (no `alert()`).

---

## Documentación completa

- **README.md** — Setup, API endpoints, stack
- **AGENTS.md** — Contexto maestro para agents (arquitectura, decisiones, gotchas)
- **docs/CLOUDFLARE-SETUP.md** — Configuración de dominios
- **docs/BUILDER.md** — Cómo funciona el website builder
- **docs/ARCHITECTURE.md** — Decisiones técnicas detalladas

---

## Contacto

Zyrative — johnbigdeal@gmail.com

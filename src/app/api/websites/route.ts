import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { websites, memberships, businesses, leads, socialProfiles, pipelines, leadCategories } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { translateCategory } from "@/lib/paralux/category-translations";
import { generateCopySafe } from "@/lib/paralux/generate-copy";

export const dynamic = "force-dynamic";

/* GET /api/websites */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const rows = await db
    .select()
    .from(websites)
    .where(eq(websites.orgId, ctx.orgId));

  return NextResponse.json(rows);
}

/* Unsplash helper */
async function searchUnsplashImages(query: string, count: number = 8): Promise<Array<{ url: string; author: string; authorUrl: string; unsplashUrl: string }>> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(Math.min(count, 30)));
    url.searchParams.set("orientation", "landscape");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const UTM = "utm_source=leadscout&utm_medium=referral";
    return (
      data.results?.map((img: any) => {
        const username = img.user?.username || "";
        return {
          url: img.urls?.regular,
          author: img.user?.name || "Unsplash",
          authorUrl: username ? `https://unsplash.com/@${username}?${UTM}` : `https://unsplash.com/?${UTM}`,
          unsplashUrl: `https://unsplash.com/?${UTM}`,
        };
      }).filter((img: any) => img.url) || []
    );
  } catch (e) {
    console.error("Unsplash search error:", e);
    return [];
  }
}

/* Deriva el `data` de un sitio "link in bio" a partir del negocio y sus redes,
   reusando la misma info del lead que la landing (nombre, WhatsApp, web, redes,
   email, Maps, reseña). Devuelve la forma que consumen BioLinkBuilder y
   generateBiolinkHTML. */
function buildBiolinkData(
  biz: any,
  socialsArr: { platform: string; url: string | null }[],
  phoneDigits: string,
  categoryEs: string,
  images: any[],
  copy: any,
): Record<string, any> {
  const social = (p: string) => socialsArr.find((s) => s.platform === p)?.url || "";
  const instagram = social("instagram");
  const facebook = social("facebook");
  const linkedin = social("linkedin");
  const tiktok = social("tiktok");
  const youtube = social("youtube");
  const website = biz.website || "";
  const email = biz.email || "";
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : "";
  const mapsUrl = biz.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.name || ""} ${biz.address}`)}`
    : "";
  const reviewUrl = biz.placeId
    ? `https://search.google.com/local/writereview?placeid=${biz.placeId}`
    : "";
  const bio = copy && typeof copy.tagline === "string" && copy.tagline.trim()
    ? copy.tagline.trim()
    : categoryEs || "";

  const links: { id: string; title: string; url: string; icon: string }[] = [];
  let n = 0;
  const add = (title: string, url: string, icon: string) => {
    if (url) links.push({ id: `l${++n}`, title, url, icon });
  };
  add("WhatsApp", waUrl, "whatsapp");
  add("Sitio web", website, "globe");
  add("Instagram", instagram, "instagram");
  add("Facebook", facebook, "facebook");
  add("TikTok", tiktok, "tiktok");
  add("YouTube", youtube, "youtube");
  add("LinkedIn", linkedin, "linkedin");
  add("Llamar", biz.phone ? `tel:${biz.phone}` : "", "phone");
  add("Email", email ? `mailto:${email}` : "", "mail");
  add("Ver en Google Maps", mapsUrl, "map");
  add("Dejá tu reseña", reviewUrl, "star");

  return {
    siteType: "biolink",
    businessName: biz.name || "Mi negocio",
    avatar: images[0]?.url || "",
    bio,
    links,
    socials: {
      instagram, facebook, whatsapp: waUrl, tiktok, youtube, linkedin,
      x: "", website, email: email ? `mailto:${email}` : "",
    },
    dark: false,
    bgType: "solid",
    bgColor1: "#f4f4f5",
    bgColor2: "#e4e4e7",
    bgAngle: 135,
    accent: "#111827",
    textColor: "#111827",
    buttonTextColor: "#ffffff",
    buttonStyle: "fill",
    buttonRadius: 14,
    font: "system",
    theme: "minimal",
  };
}

/* POST /api/websites */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { name, leadId, businessId, siteType: rawSiteType } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const siteType = rawSiteType === "biolink" ? "biolink" : "paralux";

  let initialData: Record<string, any> = {};
  let resolvedBusinessId = businessId;

  /* If leadId provided, resolve businessId from lead */
  if (leadId && !resolvedBusinessId) {
    const [lead] = await db
      .select({ businessId: leads.businessId })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);
    if (lead) resolvedBusinessId = lead.businessId;
  }

  /* Un sitio por lead o por negocio: si ya existe uno (borrador o publicado)
     para este lead O este negocio, se devuelve en vez de crear un duplicado.
     Cubre el botón del CRM (manda leadId) y el de resultados (solo businessId). */
  /* El dedup es por TIPO: un lead/negocio puede tener a la vez una landing y un
     biolink. Los sitios viejos (sin data.siteType) se consideran "paralux". */
  const typeCond = siteType === "biolink"
    ? sql`${websites.data}->>'siteType' = 'biolink'`
    : sql`(${websites.data}->>'siteType' IS NULL OR ${websites.data}->>'siteType' = 'paralux')`;
  async function findExisting() {
    const conds = [
      leadId ? eq(websites.leadId, leadId) : null,
      resolvedBusinessId ? eq(websites.businessId, resolvedBusinessId) : null,
    ].filter(Boolean) as any[];
    if (conds.length === 0) return null;
    const [existing] = await db
      .select()
      .from(websites)
      .where(and(eq(websites.orgId, ctx.orgId), conds.length === 1 ? conds[0] : or(...conds), typeCond))
      .limit(1);
    return existing ?? null;
  }

  const pre = await findExisting();
  if (pre) return NextResponse.json(pre);

  /* Pre-fill with business data if available */
  let leadCategoryName: string | null = null;

  if (leadId) {
    const [lead] = await db
      .select({ categoryId: leads.categoryId })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (lead?.categoryId) {
      const [cat] = await db
        .select({ name: leadCategories.name })
        .from(leadCategories)
        .where(eq(leadCategories.id, lead.categoryId))
        .limit(1);
      if (cat?.name) leadCategoryName = translateCategory(cat.name);
    }
  }

  if (resolvedBusinessId) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, resolvedBusinessId))
      .limit(1);

    if (biz) {
      const socials = await db
        .select()
        .from(socialProfiles)
        .where(eq(socialProfiles.businessId, resolvedBusinessId));

      const instagram = socials.find(s => s.platform === "instagram")?.url || "";
      const facebook = socials.find(s => s.platform === "facebook")?.url || "";

      /* Search for real images — prefer lead category, then business category, then business name */
      const searchQuery = leadCategoryName
        ? `${leadCategoryName} business`
        : biz.category
        ? `${translateCategory(biz.category)} business`
        : biz.name
        ? `${biz.name} business`
        : "business";

      const categoryEs = leadCategoryName || (biz.category ? translateCategory(biz.category) : "");
      const phoneDigits = biz.phone ? biz.phone.replace(/\D/g, "") : "";

      /* Unsplash e IA en paralelo (no dependen entre sí) con tope de tiempo
         para acotar la espera; si la IA no responde a tiempo, queda la base. */
      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
        Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

      const [images, copy] = await Promise.all([
        searchUnsplashImages(searchQuery, 8),
        withTimeout(
          generateCopySafe({ name: biz.name || "", what: categoryEs || biz.name || "negocio", language: "es" }),
          15000,
        ),
      ]);

      /* Redes sociales reales del lead (sin los placeholders del DEFAULT). */
      const socialLinks = [
        instagram ? { type: "instagram", url: instagram } : null,
        facebook ? { type: "facebook", url: facebook } : null,
        phoneDigits ? { type: "whatsapp", url: `https://wa.me/${phoneDigits}` } : null,
      ].filter(Boolean);

      if (siteType === "biolink") {
        /* Link in bio: reusa la misma info del lead con otra forma de `data`. */
        initialData = buildBiolinkData(biz, socials, phoneDigits, categoryEs, images, copy);
      } else {
      /* Base 100% derivada del lead. Cubre TODOS los campos de texto para que el
         builder no rellene ninguno con el contenido dummy de DEFAULT, incluso si
         la IA no está disponible. La IA (abajo) reemplaza el copy de marketing. */
      initialData = {
        businessName: biz.name || "",
        logoText: (biz.name || "").toUpperCase().slice(0, 16),
        tagline: categoryEs || "",
        heroHeadline: biz.name || "",
        heroSubtext: categoryEs
          ? `Profesionales en ${categoryEs}. Contáctanos hoy.`
          : "Contáctanos hoy y trabajemos juntos.",
        ctaText: "Contactar",
        aboutTitle: "Sobre nosotros",
        aboutText: categoryEs
          ? `Somos especialistas en ${categoryEs}. Con años de experiencia, ofrecemos servicios de calidad adaptados a tus necesidades.`
          : "Somos un equipo apasionado por lo que hacemos. Cada proyecto es una oportunidad de crear algo extraordinario.",
        /* Vacío = el generador omite la sección de cita (sin texto dummy). */
        stmtText: "",
        servicesTitle: "Servicios",
        services: categoryEs
          ? [
              { title: categoryEs, desc: `Nuestro servicio principal de ${categoryEs}.` },
              { title: "Atención personalizada", desc: "Asesoramiento adaptado a lo que necesitás." },
              { title: "Calidad garantizada", desc: "Resultados profesionales en los que podés confiar." },
            ]
          : [
              { title: "Servicio principal", desc: "Nuestra propuesta central para vos." },
              { title: "Atención personalizada", desc: "Asesoramiento adaptado a lo que necesitás." },
              { title: "Calidad garantizada", desc: "Resultados profesionales en los que podés confiar." },
            ],
        galleryTitle: "Proyectos",
        googleReviewsTitle: "Lo que dicen nuestros clientes",
        /* Sin reseñas inventadas: solo se mostrará el botón "Dejá tu reseña". */
        googleReviews: [],
        socialTitle: "Seguinos",
        socialLinks,
        ctaTitle: "¿Hablamos?",
        ctaSubtext: "Respondemos rápido. Escribinos y coordinemos.",
        contactCtaText: "Escribir por WhatsApp",
        phone: biz.phone || "",
        /* WhatsApp del sitio = teléfono real del lead (no el placeholder del DEFAULT). */
        whatsappEnabled: !!biz.phone,
        whatsappNumber: phoneDigits,
        whatsappMessage: `Hola ${biz.name || ""}, vi su sitio y me gustaría comprar.`,
        email: biz.email || "",
        location: biz.address || "",
        instagram,
        facebook,
        website: biz.website || "",
        /* Google review link from the business' Place ID (from Maps search),
           used by the web builder's "Dejá tu reseña en Google" button. */
        googleReviewUrl: biz.placeId
          ? `https://search.google.com/local/writereview?placeid=${biz.placeId}`
          : "",
        heroImage: images[0] || { url: "https://picsum.photos/seed/bizhero/1800/1100" },
        aboutImage: images[1] || { url: "https://picsum.photos/seed/bizabout/1000/1250" },
        stmtImage: images[2] || { url: "https://picsum.photos/seed/bizstmt/1800/1000" },
        gallery: images.slice(3, 6) || [],
        preset: "modern",
        dark: false,
        accent: "#3B3BF5",
      };

      /* Auto-relleno con IA (ya resuelto arriba en paralelo). Best-effort — si
         la IA falla o expira, queda la base derivada del lead (nunca dummy). */
      if (copy) {
        const pick = (v: unknown, fallback: any) =>
          typeof v === "string" && v.trim() ? v.trim() : fallback;

        initialData.tagline = pick(copy.tagline, initialData.tagline);
        initialData.heroHeadline = pick(copy.heroHeadline, initialData.heroHeadline);
        initialData.heroSubtext = pick(copy.heroSubtext, initialData.heroSubtext);
        initialData.ctaText = pick(copy.ctaText, initialData.ctaText);
        initialData.aboutTitle = pick(copy.aboutTitle, initialData.aboutTitle);
        initialData.aboutText = pick(copy.aboutText, initialData.aboutText);
        initialData.stmtText = pick(copy.stmtText, initialData.stmtText);
        initialData.servicesTitle = pick(copy.servicesTitle, initialData.servicesTitle);
        initialData.galleryTitle = pick(copy.galleryTitle, initialData.galleryTitle);
        initialData.googleReviewsTitle = pick(copy.googleReviewsTitle, initialData.googleReviewsTitle);
        initialData.socialTitle = pick(copy.socialTitle, initialData.socialTitle);
        initialData.ctaTitle = pick(copy.ctaTitle, initialData.ctaTitle);
        initialData.ctaSubtext = pick(copy.ctaSubtext, initialData.ctaSubtext);
        initialData.contactCtaText = pick(copy.contactCtaText, initialData.contactCtaText);

        if (Array.isArray(copy.services)) {
          const cleaned = copy.services
            .filter((s) => s && (s.title || s.desc))
            .map((s) => ({ title: String(s.title || ""), desc: String(s.desc || "") }));
          if (cleaned.length) initialData.services = cleaned;
        }
      }
      }
    }
  }

  /* Re-check + insert atómico bajo advisory lock por objetivo (lead/negocio):
     si dos requests paralelas generaron a la vez, la segunda encuentra el
     sitio recién creado y lo devuelve en vez de duplicar. */
  const lockKey = `web:${ctx.orgId}:${siteType}:${leadId || resolvedBusinessId || name.trim()}`;
  const website = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

    const existing = await findExisting();
    if (existing) return existing;

    const [created] = await tx
      .insert(websites)
      .values({
        orgId: ctx.orgId,
        leadId: leadId || null,
        businessId: resolvedBusinessId || null,
        name: name.trim(),
        data: initialData,
      })
      .returning();
    return created;
  });

  return NextResponse.json(website);
}

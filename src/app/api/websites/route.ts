import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { websites, memberships, businesses, leads, socialProfiles, pipelines, leadCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

/* POST /api/websites */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { name, leadId, businessId } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  /* One website per lead: if one already exists for this lead (draft or
     published), return it instead of creating a duplicate. The CRM "Crear
     Website" button then opens the existing draft. */
  if (leadId) {
    const [existing] = await db
      .select()
      .from(websites)
      .where(and(eq(websites.leadId, leadId), eq(websites.orgId, ctx.orgId)))
      .limit(1);
    if (existing) return NextResponse.json(existing);
  }

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
      const images = await searchUnsplashImages(searchQuery, 8);

      const categoryEs = leadCategoryName || (biz.category ? translateCategory(biz.category) : "");
      const phoneDigits = biz.phone ? biz.phone.replace(/\D/g, "") : "";

      /* Redes sociales reales del lead (sin los placeholders del DEFAULT). */
      const socialLinks = [
        instagram ? { type: "instagram", url: instagram } : null,
        facebook ? { type: "facebook", url: facebook } : null,
        phoneDigits ? { type: "whatsapp", url: `https://wa.me/${phoneDigits}` } : null,
      ].filter(Boolean);

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

      /* Auto-relleno con IA: genera copy de marketing tailored al lead y
         reemplaza el texto base. Best-effort — si la IA falla, queda la base
         derivada del lead (nunca contenido dummy). */
      const copy = await generateCopySafe({
        name: biz.name || "",
        what: categoryEs || biz.name || "negocio",
        language: "es",
      });

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

  const [website] = await db
    .insert(websites)
    .values({
      orgId: ctx.orgId,
      leadId: leadId || null,
      businessId: resolvedBusinessId || null,
      name: name.trim(),
      data: initialData,
    })
    .returning();

  return NextResponse.json(website);
}

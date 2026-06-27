import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { websites, memberships, businesses, leads, socialProfiles, pipelines, leadCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { translateCategory } from "@/lib/paralux/category-translations";

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
      const linkedin = socials.find(s => s.platform === "linkedin")?.url || "";

      /* Search for real images — prefer lead category, then business category, then business name */
      const searchQuery = leadCategoryName
        ? `${leadCategoryName} business`
        : biz.category
        ? `${translateCategory(biz.category)} business`
        : biz.name
        ? `${biz.name} business`
        : "business";
      const images = await searchUnsplashImages(searchQuery, 8);

      initialData = {
        businessName: biz.name || "",
        logoText: (biz.name || "").toUpperCase().slice(0, 16),
        tagline: biz.category || "",
        heroHeadline: biz.name || "",
        heroSubtext: `Profesionales en ${biz.category || "nuestro rubro"}. Contáctanos hoy.`,
        aboutTitle: "Sobre nosotros",
        aboutText: biz.category
          ? `Somos especialistas en ${biz.category}. Con años de experiencia, ofrecemos servicios de calidad adaptados a tus necesidades.`
          : "Somos un equipo apasionado por lo que hacemos. Cada proyecto es una oportunidad de crear algo extraordinario.",
        ctaText: "Contactar",
        phone: biz.phone || "",
        email: biz.email || "",
        location: biz.address || "",
        instagram,
        website: biz.website || "",
        heroImage: images[0] || { url: "https://picsum.photos/seed/bizhero/1800/1100" },
        aboutImage: images[1] || { url: "https://picsum.photos/seed/bizabout/1000/1250" },
        stmtImage: images[2] || { url: "https://picsum.photos/seed/lumenstmt/1800/1000" },
        gallery: images.slice(3, 6) || [],
        servicesTitle: "Servicios",
        services: [
          { title: "Servicio Principal", desc: "Descripción de nuestro servicio principal." },
          { title: "Especialización", desc: "Descripción de nuestra especialización." },
          { title: "Consultoría", desc: "Asesoramiento personalizado para tus necesidades." },
        ],
        preset: "modern",
        dark: false,
        accent: "#3B3BF5",
      };
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

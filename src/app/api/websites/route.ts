import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { websites, memberships, businesses, leads, socialProfiles, pipelines } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function auth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return null;
  const [membership] = await db
    .select({ orgId: memberships.orgId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);
  if (!membership) return null;
  return { user, orgId: membership.orgId };
}

/* GET /api/websites */
export async function GET(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(websites)
    .where(eq(websites.orgId, ctx.orgId));

  return NextResponse.json(rows);
}

/* POST /api/websites */
export async function POST(request: Request) {
  const ctx = await auth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, leadId, businessId } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  let initialData: Record<string, any> = {};

  /* Pre-fill with business data if available */
  if (businessId) {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (biz) {
      const socials = await db
        .select()
        .from(socialProfiles)
        .where(eq(socialProfiles.businessId, businessId));

      const instagram = socials.find(s => s.platform === "instagram")?.url || "";
      const linkedin = socials.find(s => s.platform === "linkedin")?.url || "";

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
        heroImage: "https://picsum.photos/seed/bizhero/1800/1100",
        aboutImage: "https://picsum.photos/seed/bizabout/1000/1250",
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
      businessId: businessId || null,
      name: name.trim(),
      data: initialData,
    })
    .returning();

  return NextResponse.json(website);
}

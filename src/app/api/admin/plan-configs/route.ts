import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { planConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfecto para empezar",
    price: 0,
    currency: "USD",
    interval: null,
    popular: false,
    features: [
      "1 búsqueda por día",
      "1 pipeline (tablero Kanban)",
      "3 servicios",
      "3 categorías",
      "3 etiquetas por lead",
      "Publicar en subdominios del sistema",
      "Websites ilimitados",
      "WhatsApp CTA",
    ],
    limitations: [
      "Sin dominios personalizados",
      "Sin conexión Cloudflare propia",
    ],
    stripePriceId: null,
    paypalPlanId: null,
    isActive: true,
  },
  {
    id: "pro_monthly",
    name: "Pro Mensual",
    description: "Para profesionales del marketing",
    price: 2000,
    currency: "USD",
    interval: "month",
    popular: false,
    features: [
      "Búsquedas ilimitadas",
      "Pipelines ilimitados",
      "Servicios ilimitados",
      "Categorías ilimitadas",
      "Etiquetas ilimitadas",
      "Publicar en cualquier dominio",
      "Conectar Cloudflare propio",
      "Dominios personalizados",
      "Websites ilimitados",
      "WhatsApp CTA",
      "Soporte prioritario",
    ],
    limitations: [],
    stripePriceId: "",
    paypalPlanId: "",
    isActive: true,
  },
  {
    id: "pro_yearly",
    name: "Pro Anual",
    description: "Ahorra $140 al año",
    price: 10000,
    currency: "USD",
    interval: "year",
    popular: true,
    features: [
      "Todo lo del Pro Mensual",
      "2 meses gratis (ahorro $140)",
      "Soporte prioritario",
    ],
    limitations: [],
    stripePriceId: "",
    paypalPlanId: "",
    isActive: true,
  },
];

/* GET /api/admin/plan-configs */
export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const plans = await db.select().from(planConfigs).orderBy(planConfigs.id);
  return NextResponse.json({ plans: plans.length > 0 ? plans : DEFAULT_PLANS });
}

/* POST /api/admin/plan-configs — seed defaults if table is empty */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const existing = await db.select({ id: planConfigs.id }).from(planConfigs).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ message: "Planes ya existen" }, { status: 409 });
  }
  await db.insert(planConfigs).values(DEFAULT_PLANS);
  return NextResponse.json({ message: "Planes inicializados", plans: DEFAULT_PLANS });
}

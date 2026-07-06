import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plans";
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
    stripePriceId: null,
    paypalPlanId: null,
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
  },
  {
    id: "pro-monthly",
    name: "Pro Mensual",
    description: "Para profesionales del marketing",
    price: 20,
    currency: "USD",
    interval: "month",
    stripePriceId: null,
    paypalPlanId: null,
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
  },
  {
    id: "pro-yearly",
    name: "Pro Anual",
    description: "Ahorra $140 al año",
    price: 100,
    currency: "USD",
    interval: "year",
    stripePriceId: null,
    paypalPlanId: null,
    features: [
      "Todo lo del Pro Mensual",
      "2 meses gratis (ahorro $140)",
      "Soporte prioritario",
    ],
    limitations: [],
  },
];

/* GET /api/billing/plans */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const limits = await getPlanLimits(ctx.orgId, ctx.user.id);
  const effectivePlan = ctx.isSuperAdmin ? "pro" : limits.plan;

  let dbPlans: any[] = [];
  try {
    dbPlans = await db.select().from(planConfigs).where(eq(planConfigs.isActive, true));
  } catch {
    /* plan_configs table may not exist yet (needs migration) */
  }
  const source = dbPlans.length > 0 ? dbPlans : DEFAULT_PLANS;

  const plans = source.map((p: any) => ({
    id: p.id.replace(/_/g, "-"),
    name: p.name,
    description: p.description,
    price: Number(p.price) / 100,
    currency: p.currency || "USD",
    interval: p.interval,
    stripePriceId: p.stripePriceId,
    paypalPlanId: p.paypalPlanId,
    features: Array.isArray(p.features) ? p.features : [],
    limitations: Array.isArray(p.limitations) ? p.limitations : [],
    popular: p.popular ?? false,
      current: p.id === "free" ? effectivePlan === "free" : effectivePlan === "pro",
    ...(p.id === "free" ? { searchesRemaining: limits.searchesRemaining, creditsRemaining: limits.creditsRemaining ?? 0 } : {}),
    ...(p.id === "pro_yearly" ? { discount: "Ahorra $140" } : {}),
  }));

  return NextResponse.json({
    currentPlan: effectivePlan,
    plans,
    trialExpired: ctx.isSuperAdmin ? false : limits.trialExpired,
    trialEndsAt: limits.trialEndsAt,
    daysUntilDeletion: limits.daysUntilDeletion,
  });
}

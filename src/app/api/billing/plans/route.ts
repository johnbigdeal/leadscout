import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plans";
import { PAYPAL_PLANS } from "@/lib/integrations/paypal";

export const dynamic = "force-dynamic";

/* GET /api/billing/plans */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const limits = await getPlanLimits(ctx.orgId);

  const plans = [
    {
      id: "free",
      name: "Free",
      description: "Perfecto para empezar",
      price: 0,
      currency: "USD",
      interval: null,
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
      current: limits.plan === "free",
    },
    {
      id: "pro-monthly",
      name: "Pro Mensual",
      description: "Para profesionales del marketing",
      price: 20,
      currency: "USD",
      interval: "month",
      paypalPlanId: PAYPAL_PLANS.monthly,
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
      current: limits.plan === "pro",
      popular: true,
    },
    {
      id: "pro-yearly",
      name: "Pro Anual",
      description: "Ahorra $140 al año",
      price: 100,
      currency: "USD",
      interval: "year",
      paypalPlanId: PAYPAL_PLANS.yearly,
      features: [
        "Todo lo del Pro Mensual",
        "2 meses gratis (ahorro $140)",
        "Soporte prioritario",
      ],
      limitations: [],
      current: limits.plan === "pro",
      discount: "Ahorra $140",
    },
  ];

  return NextResponse.json({
    currentPlan: limits.plan,
    plans,
    trialExpired: limits.trialExpired,
    trialEndsAt: limits.trialEndsAt,
    daysUntilDeletion: limits.daysUntilDeletion,
  });
}

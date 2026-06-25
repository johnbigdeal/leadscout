"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Zap, Globe, Search, LayoutDashboard, Crown } from "lucide-react";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string | null;
  features: string[];
  limitations: string[];
  current: boolean;
  popular?: boolean;
  discount?: string;
  stripePriceId?: string;
}

export default function PlansPage() {
  const t = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPlans();

    let timer: ReturnType<typeof setTimeout>;

    if (searchParams.get("success") === "true") {
      setMessage("¡Suscripción activada! Tu plan Pro está siendo procesado.");
      timer = setTimeout(() => {
        setMessage("");
        router.replace("/dashboard/settings/plans", { scroll: false });
      }, 5000);
    } else if (searchParams.get("cancelled") === "true") {
      setMessage("El pago fue cancelado. Tu plan sigue siendo Free.");
      timer = setTimeout(() => {
        setMessage("");
        router.replace("/dashboard/settings/plans", { scroll: false });
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [searchParams, router]);

  async function fetchPlans() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/billing/plans", { headers });
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans);
      setCurrentPlan(data.currentPlan);
    }
    setLoading(false);
  }

  async function handleSubscribe(planId: string) {
    if (planId === "free") return;
    setSubscribing(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers,
      body: JSON.stringify({ planId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } else {
      const err = await res.json();
      setMessage(err.error || "Error al procesar la suscripción");
    }
    setSubscribing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl tracking-tight">Planes y Precios</h1>
        <p className="mt-2 text-muted-foreground">
          Elegí el plan que mejor se adapte a tu negocio
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-lg bg-primary/10 p-4 text-center text-sm text-primary">
          {message}
        </div>
      )}

      <div className="grid gap-6 pt-6 md:grid-cols-3">
        {plans.map((plan) => {
          const card = (
            <Card
              className={`relative flex flex-col flex-1 ${
                plan.current || plan.popular
                  ? "border-2 border-primary shadow-xl shadow-primary/15 overflow-visible"
                  : "border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Zap className="mr-1 h-3 w-3" />
                    Más popular
                  </Badge>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-background">
                    Plan actual
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pt-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold">Gratis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        USD/{plan.interval === "month" ? "mes" : "año"}
                      </span>
                    </>
                  )}
                  {plan.discount && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium">
                      {plan.discount}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Incluye
                    </p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Limitaciones
                      </p>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <X className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  {plan.current ? (
                    <Button className="w-full" variant="outline" disabled>
                      Plan actual
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button className="w-full" variant="outline" disabled={currentPlan !== "pro"}>
                      {currentPlan === "pro" ? "Downgrade" : "Plan actual"}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] ${
                        plan.popular
                          ? "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-[length:300%_auto] animate-shimmer text-white border-0 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30"
                          : "hover:shadow-primary/25"
                      }`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing || currentPlan === "pro"}
                    >
                      {subscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : currentPlan === "pro" ? (
                        "Ya eres Pro"
                      ) : (
                        <>Upgrade a {plan.name}</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );

          if (plan.id === "pro-yearly") {
            return (
              <div key={plan.id} className="animated-border-card h-full flex flex-col">
                {card}
              </div>
            );
          }
          return card;
        })}
      </div>

      <div className="mt-12 rounded-lg border bg-muted/50 p-6">
        <h3 className="font-semibold mb-2">¿Necesitás ayuda?</h3>
        <p className="text-sm text-muted-foreground">
          Si tenés dudas sobre los planes o necesitás una solución enterprise,
          contactanos a johnbigdeal@gmail.com
        </p>
      </div>
    </div>
  );
}

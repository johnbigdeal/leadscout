"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Layers, Loader2, Crosshair, Zap, Lightbulb } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { FreeBadge } from "@/components/plan-badges";

export default function SearchPage() {
  const t = useTranslations("search");
  const router = useRouter();
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [searching, setSearching] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [searchesRemaining, setSearchesRemaining] = useState<number | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function fetchPlan() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/billing/plans", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPlan(data.currentPlan || "free");
      setTrialExpired(data.trialExpired || false);
      const freePlan = data.plans.find((p: any) => p.id === "free");
      if (freePlan) {
        setSearchesRemaining(freePlan.searchesRemaining ?? null);
        setCreditsRemaining(freePlan.creditsRemaining ?? 0);
      }
    }
  }

  useEffect(() => {
    fetchPlan();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);

    /* Check if trial expired */
    if (trialExpired) {
      setShowUpgradeModal(true);
      return;
    }

    /* Check if Free and no searches remaining */
    if (plan === "free" && searchesRemaining === 0) {
      setShowUpgradeModal(true);
      return;
    }

    setSearching(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const body: Record<string, unknown> = { keywords, location, channels: ["google"] };
      const res = await fetch("/api/searches", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const { searchId } = await res.json();
        router.push(`/dashboard/results?searchId=${searchId}`);
      } else {
        const err = await res.json();
        if (res.status === 429) {
          setShowUpgradeModal(true);
        } else {
          setSearchError(err.error || "Error al buscar");
        }
      }
    } catch {
      setSearchError("Error de conexión. Revisá tu internet e intentá de nuevo.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Crosshair className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keywords" className="text-sm font-medium text-foreground">
              <Layers className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              {t("keywords")}
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder={t("keywordsPlaceholder")}
                required
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-foreground">
              <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
              {t("location")}
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("locationPlaceholder")}
              required
            />
          </div>

          {/* Recomendaciones para mejores resultados */}
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              {t("tipsTitle")}
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{t("tipVariar")}</li>
              <li>{t("tipZonas")}</li>
              <li>{t("tipEspecifico")}</li>
              <li>{t("tipRepetir")}</li>
            </ul>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[0.7rem]">{t("tipExamplesLabel")}</span>
              {["barbería", "dentista", "restaurante", "gimnasio", "ferretería"].map((ej) => (
                <button
                  key={ej}
                  type="button"
                  onClick={() => setKeywords(ej)}
                  className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[0.7rem] text-zinc-600 transition-colors hover:border-primary hover:text-primary"
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>

          {/* Plan status + error */}
          {plan === "free" && searchesRemaining !== null && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <FreeBadge>Free</FreeBadge>
                <span>
                  {searchesRemaining} búsquedas restantes hoy
                  {creditsRemaining > 0 && (
                    <span className="text-blue-500"> ({creditsRemaining} de referidos)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/referrals")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  Referí y ganá búsquedas
                </button>
                {searchesRemaining === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    Upgrade a Pro
                  </button>
                )}
              </div>
            </div>
          )}
          {searchError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {searchError}
            </div>
          )}

          <Button type="submit" disabled={searching || (plan === "free" && searchesRemaining === 0)} className="w-full h-11 text-base shadow-lg shadow-primary/20">
            {searching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("statusRunning")}
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                {t("submit")}
              </>
            )}
          </Button>
        </form>
      </div>

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="Búsquedas ilimitadas" />
    </div>
  );
}

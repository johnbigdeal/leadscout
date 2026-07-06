"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Zap, Globe, Search, LayoutDashboard, Crown, Smartphone, Copy, Upload, Clock } from "lucide-react";
import { upload } from "@vercel/blob/client";

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
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [daysUntilDeletion, setDaysUntilDeletion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sinpeCopied, setSinpeCopied] = useState(false);
  const [inCostaRica, setInCostaRica] = useState(false);
  const [sinpeNumber, setSinpeNumber] = useState("64593374");
  const [sinpeName, setSinpeName] = useState("JONATHAN RODRIGUEZ");
  const [sinpeAmount, setSinpeAmount] = useState("10,000 colones");
  const [supportEmail, setSupportEmail] = useState("johnbigdeal@gmail.com");

  // Detecta Costa Rica por zona horaria para resaltar el pago local (sin llamadas de red).
  useEffect(() => {
    try {
      if (Intl.DateTimeFormat().resolvedOptions().timeZone === "America/Costa_Rica") {
        setInCostaRica(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  async function fetchSinpeConfig() {
    const headers = await getAuthHeaders();
    try {
      const res = await fetch("/api/admin/sinpe-config", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSinpeNumber(data.config.number);
          setSinpeName(data.config.name);
          setSinpeAmount(data.config.amount);
          setSupportEmail(data.config.supportEmail);
        }
      }
    } catch {
      /* noop */
    }
  }

  async function copySinpeNumber() {
    try {
      await navigator.clipboard.writeText(sinpeNumber);
      setSinpeCopied(true);
      setTimeout(() => setSinpeCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  // Comprobante SINPE
  const [sinpePayment, setSinpePayment] = useState<{ status: string; createdAt: string; adminNote: string | null } | null>(null);
  const [sinpeFile, setSinpeFile] = useState<File | null>(null);
  const [sinpeReference, setSinpeReference] = useState("");
  const [sinpeUploading, setSinpeUploading] = useState(false);
  const [sinpeError, setSinpeError] = useState("");

  useEffect(() => {
    fetchSinpePayment();
  }, []);

  async function fetchSinpePayment() {
    const headers = await getAuthHeaders();
    try {
      const res = await fetch("/api/billing/sinpe", { headers });
      if (res.ok) {
        const data = await res.json();
        setSinpePayment(data.payment);
      }
    } catch {
      /* noop */
    }
  }

  async function submitSinpeProof() {
    if (!sinpeFile) return;
    setSinpeUploading(true);
    setSinpeError("");
    try {
      const headers = await getAuthHeaders();
      const blob = await upload(`sinpe/${sinpeFile.name}`, sinpeFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        headers,
        clientPayload: JSON.stringify({ kind: "proof" }),
        contentType: sinpeFile.type,
      });
      const url = blob.url;

      const jsonHeaders = { ...headers, "Content-Type": "application/json" };
      const res = await fetch("/api/billing/sinpe", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ proofUrl: url, reference: sinpeReference }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "No se pudo enviar el comprobante.");
      }
      const data = await res.json();
      setSinpePayment(data.payment);
      setSinpeFile(null);
      setSinpeReference("");
    } catch (e) {
      setSinpeError(e instanceof Error ? e.message : "Error al enviar el comprobante.");
    }
    setSinpeUploading(false);
  }

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat("es", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(price);

  useEffect(() => {
    fetchPlans();
    fetchSinpeConfig();

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
    setError("");
    const headers = await getAuthHeaders();
    try {
      const res = await fetch("/api/billing/plans", { headers });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
        setCurrentPlan(data.currentPlan);
        setTrialExpired(data.trialExpired || false);
        setTrialEndsAt(data.trialEndsAt || null);
        setDaysUntilDeletion(data.daysUntilDeletion || null);
      } else {
        setError("No pudimos cargar los planes. Recargá la página e intentá de nuevo.");
      }
    } catch {
      setError("No pudimos cargar los planes. Revisá tu conexión e intentá de nuevo.");
    }
    setLoading(false);
  }

  function handleDowngrade() {
    window.location.href =
      "mailto:" + encodeURIComponent(supportEmail) + "?subject=" +
      encodeURIComponent("Solicitud de downgrade a Free") +
      "&body=" +
      encodeURIComponent("Hola, quiero bajar mi plan de Pro a Free. Mi cuenta es: ");
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
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Error al procesar la suscripción. Intentá de nuevo.");
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
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-lg bg-primary/10 p-4 text-center text-sm text-primary"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Trial status */}
      {currentPlan === "free" && trialExpired && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Zap className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-red-800">Tu prueba gratuita ha terminado</p>
              <p className="text-sm text-red-600">
                {daysUntilDeletion !== null && daysUntilDeletion > 0
                  ? `Tus datos se eliminarán en ${daysUntilDeletion} días. Upgrade a Pro para recuperar el acceso.`
                  : "Tus datos serán eliminados próximamente."}
              </p>
            </div>
          </div>
        </div>
      )}
      {currentPlan === "free" && !trialExpired && trialEndsAt && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">
                Prueba gratuita activa — termina el {new Date(trialEndsAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-sm text-amber-600">
                Upgrade a Pro antes de que termine para no perder el acceso.
              </p>
            </div>
          </div>
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
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        {plan.currency || "USD"}/{plan.interval === "month" ? "mes" : "año"}
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
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={currentPlan !== "pro"}
                      onClick={currentPlan === "pro" ? handleDowngrade : undefined}
                    >
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

      {/* Pago local — Costa Rica (SINPE Móvil) */}
      <div
        className={`mt-12 rounded-xl border p-6 ${
          inCostaRica ? "border-primary/40 bg-primary/5" : "border bg-muted/40"
        }`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                ¿Estás en Costa Rica? 🇨🇷
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pagá tu plan Pro en colones por <span className="font-medium text-foreground">SINPE Móvil</span>:{" "}
                <span className="font-semibold text-foreground">{sinpeAmount} por mes</span>.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-lg border bg-background p-4 sm:min-w-[240px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SINPE Móvil
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-wide">{sinpeNumber}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={copySinpeNumber}
                aria-label="Copiar número SINPE"
                title="Copiar número"
              >
                {sinpeCopied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{sinpeName}</p>
          </div>
        </div>

        {/* Estado / envío del comprobante */}
        <div className="mt-5 border-t border-border/60 pt-4">
          {sinpePayment?.status === "pending" ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              <Clock className="h-4 w-4 shrink-0" />
              Tu comprobante está <span className="font-semibold">en revisión</span>. Te activamos el Pro apenas el admin lo verifique.
            </div>
          ) : sinpePayment?.status === "approved" ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              Comprobante <span className="font-semibold">aprobado</span>. ¡Tu plan Pro está activo!
            </div>
          ) : (
            <>
              {sinpePayment?.status === "rejected" && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <X className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Tu último comprobante fue <span className="font-semibold">rechazado</span>.
                    {sinpePayment.adminNote ? ` Motivo: ${sinpePayment.adminNote}.` : ""} Podés subir uno nuevo.
                  </span>
                </div>
              )}
              <p className="mb-2 text-sm font-medium">Ya pagaste? Subí tu comprobante para verificación</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setSinpeFile(e.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-lg border bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/70"
                  />
                </label>
                <Button onClick={submitSinpeProof} disabled={!sinpeFile || sinpeUploading} className="shrink-0">
                  {sinpeUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar comprobante
                    </>
                  )}
                </Button>
              </div>
              <input
                type="text"
                value={sinpeReference}
                onChange={(e) => setSinpeReference(e.target.value)}
                placeholder="Referencia o nota (opcional)"
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              {sinpeError && <p className="mt-2 text-sm text-destructive">{sinpeError}</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                Aceptamos imagen o PDF. También podés escribirnos a{" "}
                <a href={"mailto:" + supportEmail} className="font-medium text-primary hover:underline">
                  {supportEmail}
                </a>
                .
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-muted/50 p-6">
        <h3 className="font-semibold mb-2">¿Necesitás ayuda?</h3>
        <p className="text-sm text-muted-foreground">
          Si tenés dudas sobre los planes o necesitás una solución enterprise,
          contactanos a {supportEmail}
        </p>
      </div>
    </div>
  );
}

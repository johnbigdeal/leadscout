"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Users, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

type ReferralData = {
  code: string | null;
  link: string | null;
  referredCount: number;
  creditsEarned: number;
  creditsUsed: number;
  creditsRemaining: number;
  referred: { email: string; createdAt: string; approved: boolean }[];
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const headers = await getAuthHeaders();
      const [refRes, planRes] = await Promise.all([
        fetch("/api/referrals", { headers }),
        fetch("/api/billing/plans", { headers }),
      ]);
      if (refRes.ok) setData(await refRes.json());
      if (planRes.ok) {
        const p = await planRes.json();
        setPlan(p.currentPlan || "free");
      }
      setLoading(false);
    })();
  }, []);

  async function copyLink() {
    if (!data?.link) return;
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = plan === "pro";

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight">Referidos</h1>
          <p className="text-sm text-muted-foreground">
            {isPro
              ? "Cada persona que invitás suma créditos para entrenamientos especiales y descuentos."
              : "Cada persona que invitás te da 1 búsqueda gratis extra."}
          </p>
        </div>
      </div>

      {/* Link */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Tu link de referido
        </label>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={data?.link || ""}
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
          />
          <Button variant="outline" size="sm" onClick={copyLink} disabled={!data?.link}>
            {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Compartí este link. Ganás el crédito cuando la cuenta de tu referido es aprobada (o ingresa por primera vez).
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat icon={<Users className="h-4 w-4" />} label="Referidos" value={data?.referredCount ?? 0} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Créditos disponibles" value={data?.creditsRemaining ?? 0} highlight />
        <Stat
          icon={<Gift className="h-4 w-4" />}
          label={isPro ? "Créditos acumulados" : "Créditos usados"}
          value={isPro ? (data?.creditsEarned ?? 0) : (data?.creditsUsed ?? 0)}
        />
      </div>

      <div className={`mb-6 rounded-xl border p-4 text-sm ${isPro ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
        {isPro
          ? "Como sos Pro, tus búsquedas ya son ilimitadas: tus créditos de referido se acumulan para entrenamientos especiales y descuentos."
          : "Cada crédito equivale a 1 búsqueda extra (además de tu búsqueda diaria gratuita)."}
      </div>

      {/* Referred list */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h2 className="text-sm font-semibold">Personas que referiste</h2>
        </div>
        {(data?.referred?.length ?? 0) === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            Todavía no referiste a nadie. ¡Compartí tu link!
          </p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {data!.referred.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-800">{r.email}</span>
                  {r.approved ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Aprobado</span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Pendiente</span>
                  )}
                </div>
                <span className="text-xs text-zinc-400">{new Date(r.createdAt).toLocaleDateString("es")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-zinc-200 bg-white"}`}>
      <div className="mb-2 flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-zinc-900"}`}>{value.toLocaleString("es")}</p>
    </div>
  );
}

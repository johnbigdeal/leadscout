"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES, formatMoney } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { UpgradeModal } from "@/components/upgrade-modal";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  defaultCost: string;
  currency?: string;
  recurrence: string;
};

type Pipeline = {
  id: string;
  name: string;
  stages: string[];
};

type MonthlyRevenue = Record<string, number>;

type Stats = {
  potentialRevenue: number;
  potentialMrr: number;
  closedRevenue: number;
  closedMrr: number;
  arr: number;
  wonCount: number;
  totalLeads: number;
  monthlyRevenue: MonthlyRevenue;
  stageCounts: Record<string, number>;
  potentialByStage: Record<string, number>;
  closedByRecurrence: Record<string, number>;
  mrrByRecurrence: Record<string, number>;
  hasServices: boolean;
};

const RECURRENCE_LABELS: Record<string, string> = {
  one_time: "Único",
  monthly: "Mensual",
  annual: "Anual",
  lifetime: "Vitalicio",
};

const STAGE_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganado",
  lost: "Perdido",
};

const COLORS = ["#0F172A", "#0369A1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("es", { style: "currency", currency, minimumFractionDigits: 0 }).format(n);
}

function DonutCard({
  title,
  data,
  total,
  totalLabel,
  currency = "USD",
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
  total: string;
  totalLabel: string;
  currency?: string;
}) {
  const active = data.filter((d) => d.value > 0);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={active.length ? active : [{ name: "Sin datos", value: 1, color: "#E4E4E7" }]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {(active.length ? active : [{ name: "Sin datos", value: 1, color: "#E4E4E7" }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [formatCurrency(Number(value || 0), currency), String(name)]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #E4E4E7", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-zinc-900">{total}</p>
          <p className="text-xs text-zinc-500">{totalLabel}</p>
          <div className="mt-2 space-y-1">
            {active.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-zinc-600">{d.name}</span>
                <span className="ml-auto font-medium text-zinc-900">{formatCurrency(d.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const { currency, convertAmount } = useCurrency();
  const fmt = useCallback((n: number) => formatCurrency(convertAmount(n), currency), [convertAmount, currency]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("all");
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceCost, setServiceCost] = useState("");
  const [serviceCurrency, setServiceCurrency] = useState(currency || "USD");
  const [serviceRecurrence, setServiceRecurrence] = useState("one_time");
  const [plan, setPlan] = useState<string>("free");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchServices() {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/services?_=${Date.now()}`, { headers, cache: "no-store" });
    if (res.ok) setServices(await res.json());
  }

  async function fetchPipelines() {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/pipelines?_=${Date.now()}`, { headers, cache: "no-store" });
    if (res.ok) setPipelines(await res.json());
  }

  async function fetchPlan() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/billing/plans", { headers });
    if (res.ok) {
      const data = await res.json();
      setPlan(data.currentPlan || "free");
    }
  }

  async function fetchStats(pipelineId?: string) {
    const headers = await getAuthHeaders();
    const url = pipelineId && pipelineId !== "all"
      ? `/api/sales/stats?pipelineId=${pipelineId}&_=${Date.now()}`
      : `/api/sales/stats?_=${Date.now()}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (res.ok) setStats(await res.json());
  }

  useEffect(() => {
    fetchServices();
    fetchPipelines();
    fetchStats();
    fetchPlan();
    const onVisible = () => { if (!document.hidden) { fetchServices(); fetchStats(selectedPipelineId); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    fetchStats(selectedPipelineId);
  }, [selectedPipelineId]);

  async function saveService() {
    if (!serviceName.trim()) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const body = { name: serviceName.trim(), defaultCost: serviceCost || "0", currency: serviceCurrency || "USD", recurrence: serviceRecurrence };
      let res: Response;
      if (editService) {
        res = await fetch(`/api/services/${editService.id}`, { method: "PUT", headers, body: JSON.stringify(body) });
      } else {
        res = await fetch("/api/services", { method: "POST", headers, body: JSON.stringify(body) });
        if (res.status === 403) {
          setShowServiceDialog(false);
          setShowUpgradeModal(true);
          return;
        }
      }
      if (!res.ok) {
        toast.error("No se pudo guardar el servicio. Intenta de nuevo.");
        return;
      }
      setShowServiceDialog(false);
      setEditService(null);
      setServiceName("");
      setServiceCost("");
      setServiceRecurrence("one_time");
      fetchServices();
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return;
    const headers = await getAuthHeaders();
    await fetch(`/api/services/${id}`, { method: "DELETE", headers });
    fetchServices();
  }

  function openNewService() {
    setEditService(null);
    setServiceName("");
    setServiceCost("");
    setServiceCurrency(currency || "USD");
    setShowServiceDialog(true);
  }

  function openEditService(s: Service) {
    setEditService(s);
    setServiceName(s.name);
    setServiceCost(s.defaultCost);
    setServiceCurrency(s.currency || "USD");
    setServiceRecurrence(s.recurrence || "one_time");
    setShowServiceDialog(true);
  }

  const months = stats?.monthlyRevenue
    ? Object.entries(stats.monthlyRevenue).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const monthlyConverted = months.map(([month, revenue]) => [month, convertAmount(revenue)] as const);
  const maxRevenue = Math.max(...monthlyConverted.map(([, v]) => v), 1);

  // Chart 1: Ingresos Potenciales by stage
  const potentialData = stats
    ? Object.entries(stats.potentialByStage || {}).map(([key, value], i) => ({
        name: STAGE_LABELS[key] || key,
        value: convertAmount(value),
        color: COLORS[i] || COLORS[0],
      }))
    : [];

  // Chart 2: Ventas Cerradas by recurrence
  const closedData = stats
    ? Object.entries(stats.closedByRecurrence || {}).map(([key, value], i) => ({
        name: RECURRENCE_LABELS[key] || key,
        value: convertAmount(value),
        color: COLORS[i + 3] || COLORS[0],
      }))
    : [];

  // Chart 3: MRR by recurrence
  const mrrData = stats
    ? Object.entries(stats.mrrByRecurrence || {}).map(([key, value], i) => ({
        name: RECURRENCE_LABELS[key] || key,
        value: convertAmount(value),
        color: COLORS[i + 1] || COLORS[0],
      }))
    : [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">Panel de Ventas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestiona servicios y visualiza ingresos</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            aria-label="Filtrar por pipeline"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos los pipelines</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => { fetchServices(); fetchStats(selectedPipelineId); }}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* 3 Donut Charts */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <DonutCard
          title="Ingresos Potenciales"
          data={potentialData}
          total={stats ? fmt(stats.potentialRevenue) : "—"}
          totalLabel="Total potencial"
          currency={currency}
        />
        <DonutCard
          title="Ventas Cerradas"
          data={closedData}
          total={stats ? fmt(stats.closedRevenue) : "—"}
          totalLabel="Total cerrado"
          currency={currency}
        />
        <DonutCard
          title="MRR"
          data={mrrData}
          total={stats ? fmt(stats.closedMrr) : "—"}
          totalLabel="Recurrente / mes"
          currency={currency}
        />
      </div>

      {stats && !stats.hasServices && stats.totalLeads > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Los ingresos muestran $0</strong> porque ningún prospecto tiene servicios asignados.
          Para ver ingresos: creá un servicio abajo, luego abrí un prospecto en CRM y asignale el servicio con su costo.
        </div>
      )}

          {monthlyConverted.length > 0 && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Ingresos por Mes</h2>
          <div className="flex items-end gap-3" style={{ height: "200px" }}>
            {monthlyConverted.map(([month, revenue]) => {
              const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
              const label = new Date(month + "-01").toLocaleDateString("es", { month: "short", year: "2-digit" });
              return (
                <div key={month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-medium text-zinc-600">{fmt(revenue)}</span>
                  <div
                    className="w-full rounded-t-md bg-emerald-400 transition-all hover:bg-emerald-500"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="text-[11px] text-zinc-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Servicios</h2>
          <Button size="sm" onClick={() => {
            if (plan === "free" && services.length >= 3) {
              setShowUpgradeModal(true);
              return;
            }
            openNewService();
          }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>
        <div className="divide-y divide-zinc-100">
          {services.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-400">
              No hay servicios todavía. Crea el primer servicio para asignarlo a oportunidades ganadas.
            </p>
          ) : (
            services.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {RECURRENCE_LABELS[s.recurrence] || s.recurrence}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500">Costo por defecto: {formatMoney(Number(s.defaultCost), s.currency || "USD")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-zinc-200 text-xs">
                    {formatMoney(Number(s.defaultCost), s.currency || "USD")}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEditService(s)} className="h-7 w-7 text-zinc-400 hover:text-zinc-600" aria-label="Editar servicio">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteService(s.id)} className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-500" aria-label="Eliminar servicio">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
            <DialogDescription>
              Define el nombre y el costo del servicio para asignarlo a oportunidades.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Nombre del servicio
              </label>
              <Input value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="ej. Consultoría SEO" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Costo por defecto
              </label>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.01" value={serviceCost} onChange={e => setServiceCost(e.target.value)} placeholder="0.00" className="flex-1" />
                <select
                  value={serviceCurrency}
                  onChange={e => setServiceCurrency(e.target.value)}
                  aria-label="Moneda del servicio"
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tipo de cobro
              </label>
              <select
                value={serviceRecurrence}
                onChange={e => setServiceRecurrence(e.target.value)}
                aria-label="Tipo de cobro"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="one_time">Único (one-time)</option>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
                <option value="lifetime">Vitalicio</option>
              </select>
            </div>
            <Button className="w-full" onClick={saveService} disabled={!serviceName.trim() || saving}>
              {saving ? "Guardando..." : editService ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="Servicios ilimitados" />
    </div>
  );
}

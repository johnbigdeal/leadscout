"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, DollarSign, GitBranch, Shield, CheckCircle, XCircle, User, Pencil, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/currency-context";

const CURRENCIES = [
  { code: "USD", name: "Dólar estadounidense", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "CRC", name: "Colón costarricense", symbol: "₡" },
  { code: "MXN", name: "Peso mexicano", symbol: "$" },
  { code: "COP", name: "Peso colombiano", symbol: "$" },
  { code: "ARS", name: "Peso argentino", symbol: "$" },
  { code: "CLP", name: "Peso chileno", symbol: "$" },
  { code: "PEN", name: "Sol peruano", symbol: "S/" },
];

async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

type Pipeline = {
  id: string;
  name: string;
  category: string | null;
  stages: string[];
};

export default function SettingsPage() {
  const { currency, refreshCurrency } = useCurrency();
  const [localCurrency, setLocalCurrency] = useState(currency);
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [editingPipeline, setEditingPipeline] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    setLocalCurrency(currency);
  }, [currency]);

  useEffect(() => {
    async function load() {
      const headers = await getAuthHeaders();
      const [statusRes, pipelinesRes] = await Promise.all([
        fetch("/api/auth/status", { headers }),
        fetch("/api/pipelines", { headers }),
      ]);
      let userRole: string | null = null;
      if (statusRes.ok) {
        const data = await statusRes.json();
        setLocalCurrency(data.currency || "USD");
        setRole(data.role);
        userRole = data.role;
      }
      if (pipelinesRes.ok) setPipelines(await pipelinesRes.json());
      if (userRole === "superadmin") {
        const pendingRes = await fetch("/api/admin/approvals", { headers });
        if (pendingRes.ok) setPending(await pendingRes.json());
      }
    }
    load();
  }, []);

  async function saveCurrency() {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    await fetch("/api/settings/currency", {
      method: "PUT", headers,
      body: JSON.stringify({ currency: localCurrency }),
    });
    await refreshCurrency();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRenamePipeline(pipelineId: string) {
    if (!editName.trim()) return;
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/pipelines/${pipelineId}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPipelines(prev => prev.map(p => p.id === pipelineId ? updated : p));
      setEditingPipeline(null);
    } else {
      alert("Error al renombrar pipeline");
    }
  }

  async function handleApprovalAction(membershipId: string, action: "approve" | "reject") {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/admin/approvals", {
      method: "POST", headers,
      body: JSON.stringify({ membershipId, action }),
    });
    if (res.ok) {
      setPending(prev => prev.filter((m: any) => m.id !== membershipId));
    }
  }

  const isSuperadmin = role === "superadmin";

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl tracking-tight">Configuración</h1>
      </div>

      <div className="space-y-6 max-w-xl">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-zinc-500" />
            <h2 className="font-semibold">Moneda</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-500">
            Seleccioná la moneda para mostrar todos los montos en el sistema.
          </p>
          <select
            value={localCurrency}
            onChange={(e) => setLocalCurrency(e.target.value)}
            className="mb-4 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
          <Button onClick={saveCurrency}>
            {saved ? "Guardado" : "Guardar moneda"}
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-zinc-500" />
            <h2 className="font-semibold">Pipelines</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-500">
            Gestioná los pipelines y sus nombres.
          </p>
          <div className="space-y-2">
            {pipelines.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
                {editingPipeline === p.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleRenamePipeline(p.id); if (e.key === "Escape") setEditingPipeline(null); }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleRenamePipeline(p.id)} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingPipeline(null)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4 text-zinc-400" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                      {p.category && <p className="text-xs text-zinc-500">{p.category}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingPipeline(p.id); setEditName(p.name); }} className="h-8 w-8 p-0">
                      <Pencil className="h-4 w-4 text-zinc-400" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {pipelines.length === 0 && (
              <p className="text-sm text-zinc-400 py-4 text-center">No hay pipelines creados.</p>
            )}
          </div>
        </div>

        {isSuperadmin && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-zinc-500" />
              <h2 className="font-semibold">Aprobaciones de usuarios</h2>
            </div>
            {pending.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                No hay aprobaciones pendientes.
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200">
                        <User className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{m.email}</p>
                        <p className="text-xs text-zinc-500">{new Date(m.createdAt).toLocaleDateString("es")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 text-xs h-8" onClick={() => handleApprovalAction(m.id, "reject")}>
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Rechazar
                      </Button>
                      <Button size="sm" className="text-xs h-8" onClick={() => handleApprovalAction(m.id, "approve")}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Aprobar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

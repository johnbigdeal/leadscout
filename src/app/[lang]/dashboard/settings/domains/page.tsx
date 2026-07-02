"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Globe, CheckCircle2, Loader2, Link2, Crown, Zap, Users, Server } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { UpgradeButton } from "@/components/plan-badges";
import { toast } from "sonner";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

type Zone = { id: string; name: string; status: string };
type Domain = {
  id: string;
  domain: string;
  subdomain: string;
  rootDomain: string;
  status: string;
  sslStatus: string | null;
};
type AvailableDomain = {
  id: string;
  domain: string;
  zoneId: string;
  isActive: boolean;
  isDefault: boolean;
  isGlobal: boolean;
  accessLevel: string; // "both" | "free" | "pro"
};

const ACCESS_LABEL: Record<string, string> = {
  both: "Free y Pro",
  free: "Solo Free",
  pro: "Solo Pro",
};

export default function DomainsSettings() {
  const [connected, setConnected] = useState(false);
  const [authType, setAuthType] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [email, setEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [availableDomainsList, setAvailableDomainsList] = useState<AvailableDomain[]>([]);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [oauthMsg, setOauthMsg] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [addZoneId, setAddZoneId] = useState("");

  async function fetchPlan() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/billing/plans", { headers });
    if (res.ok) {
      const data = await res.json();
      setPlan(data.currentPlan || "free");
    }
  }

  async function fetchAuthStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/auth/status", { headers });
    if (res.ok) {
      const data = await res.json();
      setIsSuperAdmin(!!data.isSuperAdmin);
    }
  }

  async function fetchStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cloudflare/connect", { headers });
    if (res.ok) {
      const data = await res.json();
      setConnected(data.connected);
      setAuthType(data.authType || null);
      if (data.connected) {
        setAccountId(data.accountId || "");
        fetchZones();
        fetchDomains();
        fetchAvailableDomainsList();
      }
    }
  }

  async function fetchZones() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cloudflare/zones", { headers });
    if (res.ok) setZones(await res.json());
  }

  async function fetchDomains() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cloudflare/domains", { headers });
    if (res.ok) setDomains(await res.json());
  }

  async function fetchAvailableDomainsList() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/domains/available", { headers });
    if (res.ok) setAvailableDomainsList(await res.json());
  }

  async function patchDomain(id: string, body: Record<string, unknown>, okMsg?: string) {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/domains/available?id=${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    if (res.ok) {
      if (okMsg) toast.success(okMsg);
      fetchAvailableDomainsList();
    } else {
      toast.error("No se pudo actualizar el dominio.");
    }
  }

  async function addAvailableDomain(zone: Zone) {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/domains/available", {
      method: "POST",
      headers,
      body: JSON.stringify({ domain: zone.name, zoneId: zone.id }),
    });
    if (res.ok) {
      toast.success("Dominio agregado");
      setAddZoneId("");
      fetchAvailableDomainsList();
    } else {
      toast.error("No se pudo agregar el dominio.");
    }
  }

  async function deleteAvailableDomain(id: string) {
    if (!confirm("¿Eliminar este dominio de la lista?")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/domains/available?id=${id}`, { method: "DELETE", headers });
    if (res.ok) {
      toast.success("Dominio eliminado");
      fetchAvailableDomainsList();
    } else {
      toast.error("No se pudo eliminar el dominio.");
    }
  }

  useEffect(() => {
    fetchStatus();
    fetchPlan();
    fetchAuthStatus();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const success = params.get("success");
      const error = params.get("error");
      if (success) setOauthMsg("Cuenta conectada correctamente ✓");
      if (error) setOauthMsg(`Error: ${error}`);
      if (success || error) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  async function handleConnect() {
    if (!apiToken || !accountId) return;
    setConnecting(true);
    setOauthMsg(null);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/cloudflare/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({ apiToken, accountId, email }),
      });
      if (res.ok) {
        setConnected(true);
        setApiToken("");
        setAccountId("");
        setOauthMsg("Cuenta conectada correctamente ✓");
        fetchZones();
        fetchDomains();
        fetchAvailableDomainsList();
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error || data?.detail || "No se pudo conectar la cuenta de Cloudflare.";
        setOauthMsg(`Error: ${msg}`);
      }
    } catch {
      setOauthMsg("Error: No se pudo conectar la cuenta de Cloudflare.");
    } finally {
      setConnecting(false);
    }
  }

  async function addDomain() {
    if (!selectedZone || !subdomain) return;
    setAddingDomain(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/cloudflare/domains", {
      method: "POST",
      headers,
      body: JSON.stringify({
        subdomain,
        rootDomain: selectedZone.name,
        zoneId: selectedZone.id,
      }),
    });
    if (res.ok) {
      setShowAddDomain(false);
      setSubdomain("");
      toast.success("Subdominio creado");
      fetchDomains();
    } else {
      toast.error("No se pudo crear el subdominio.");
    }
    setAddingDomain(false);
  }

  async function deleteDomain(id: string) {
    if (!confirm("¿Eliminar este dominio?")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/cloudflare/domains?id=${id}`, { method: "DELETE", headers });
    if (res.ok) {
      toast.success("Subdominio eliminado");
      fetchDomains();
    } else {
      toast.error("No se pudo eliminar el subdominio.");
    }
  }

  async function cleanupUnusedDomains() {
    if (!confirm("¿Eliminar todos los subdominios sin usar (sin sitio asociado o no publicados)? Se borrarán sus registros DNS en Cloudflare.")) return;
    setCleaning(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/cloudflare/domains?cleanup=unused", { method: "DELETE", headers });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.removed > 0
            ? `${data.removed} subdominio${data.removed === 1 ? "" : "s"} sin usar eliminado${data.removed === 1 ? "" : "s"}`
            : "No había subdominios sin usar",
        );
        fetchDomains();
      } else {
        toast.error("No se pudieron limpiar los subdominios.");
      }
    } catch {
      toast.error("No se pudieron limpiar los subdominios.");
    } finally {
      setCleaning(false);
    }
  }

  const zonesToAdd = zones.filter((z) => !availableDomainsList.some((ad) => ad.domain === z.name));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Dominios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectá Cloudflare, elegí en qué dominios se publican los sitios y gestioná los subdominios creados.
        </p>
      </div>

      {oauthMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${oauthMsg.includes("Error") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {oauthMsg}
        </div>
      )}

      {/* ─── Sección A: Cuenta de Cloudflare ─── */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Cuenta de Cloudflare</h3>
          {connected && (
            <Badge className="ml-auto bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Conectada
            </Badge>
          )}
        </div>

        {connected ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>Cuenta <span className="font-mono text-zinc-700">{accountId ? `${accountId.slice(0, 8)}…` : "—"}</span></span>
            {authType && (
              <Badge variant="outline" className="text-[10px]">
                {authType === "oauth" ? "OAuth" : "Token manual"}
              </Badge>
            )}
          </div>
        ) : plan === "free" && !isSuperAdmin ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-purple-600 shadow-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900">Conexión Cloudflare — Solo Pro</h4>
              <p className="mt-1 text-sm text-amber-700 max-w-md mx-auto">
                Conectá tu cuenta de Cloudflare para publicar en tu propio dominio y gestionar DNS automáticamente.
              </p>
            </div>
            <UpgradeButton onClick={() => setShowUpgradeModal(true)} />
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">Cómo obtener tus credenciales:</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-700">
                <li>Ir a <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener" className="underline font-medium">Cloudflare → My Profile → API Tokens</a></li>
                <li>Click en <strong>Crear Token</strong> → template <strong>Edit zone DNS</strong></li>
                <li>En <em>Zone Resources</em>: <strong>Include → All zones</strong></li>
                <li>Continue to summary → <strong>Create Token</strong> y copialo</li>
                <li>Tu <strong>Account ID</strong> está en el panel derecho del <a href="https://dash.cloudflare.com" target="_blank" rel="noopener" className="underline">dashboard</a></li>
              </ol>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Account ID</label>
                <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="ej: 1a2b3c4d5e6f…" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">API Token</label>
                <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="cfut_…" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Email (opcional)</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
            </div>
            <Button onClick={handleConnect} disabled={connecting || !apiToken || !accountId}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Conectar cuenta
            </Button>
          </div>
        )}
      </section>

      {connected && (
        <>
          {/* ─── Sección B: Dominios para publicar ─── */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Dominios para publicar</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isSuperAdmin
                    ? "Marcá dominios como “para todos” y definí qué planes pueden usarlos."
                    : "Dominios disponibles para publicar tus sitios."}
                </p>
              </div>
              {zonesToAdd.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={addZoneId}
                    onChange={(e) => setAddZoneId(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Agregar desde Cloudflare…</option>
                    {zonesToAdd.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!addZoneId}
                    onClick={() => {
                      const z = zones.find((zz) => zz.id === addZoneId);
                      if (z) addAvailableDomain(z);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Agregar
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {availableDomainsList.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                  No hay dominios configurados. Agregá uno desde las zonas de Cloudflare.
                </p>
              ) : (
                availableDomainsList.map((d) => {
                  const canManage = isSuperAdmin || !d.isGlobal;
                  return (
                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="h-4 w-4 shrink-0 text-zinc-400" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{d.domain}</span>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant={d.isActive ? "default" : "secondary"} className="text-[10px]">
                              {d.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                            {d.isDefault && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Default</Badge>
                            )}
                            {d.isGlobal && (
                              <Badge variant="outline" className="text-[10px] text-sky-700 border-sky-200 bg-sky-50">
                                <Users className="mr-1 h-2.5 w-2.5" /> Global · {ACCESS_LABEL[d.accessLevel] || "Free y Pro"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {/* Controles de super admin: global + acceso */}
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => patchDomain(d.id, { isGlobal: !d.isGlobal }, d.isGlobal ? "Dominio ahora privado" : "Dominio disponible para todos")}
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                d.isGlobal ? "text-sky-700 hover:bg-sky-50" : "text-zinc-500 hover:bg-zinc-100"
                              }`}
                            >
                              {d.isGlobal ? "Hacer privado" : "Para todos"}
                            </button>
                            {d.isGlobal && (
                              <select
                                value={d.accessLevel}
                                onChange={(e) => patchDomain(d.id, { accessLevel: e.target.value }, "Acceso actualizado")}
                                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                <option value="both">Free y Pro</option>
                                <option value="free">Solo Free</option>
                                <option value="pro">Solo Pro</option>
                              </select>
                            )}
                          </>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={() => patchDomain(d.id, { isActive: !d.isActive })}
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                d.isActive ? "text-zinc-500 hover:bg-zinc-100" : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {d.isActive ? "Desactivar" : "Activar"}
                            </button>
                            {!d.isDefault && d.isActive && (
                              <button
                                onClick={() => patchDomain(d.id, { isDefault: true }, "Dominio predeterminado actualizado")}
                                className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                              >
                                Default
                              </button>
                            )}
                            <button
                              onClick={() => deleteAvailableDomain(d.id)}
                              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                              aria-label="Eliminar dominio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* ─── Sección C: Subdominios creados ─── */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Subdominios creados</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Subdominios ya publicados y sus registros DNS.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cleanupUnusedDomains}
                  disabled={cleaning || domains.length === 0}
                  title="Eliminar subdominios sin sitio asociado o no publicados"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {cleaning ? "Limpiando…" : "Limpiar sin usar"}
                </Button>
                <Button size="sm" onClick={() => setShowAddDomain(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {domains.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
                  No hay subdominios creados
                </p>
              ) : (
                domains.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
                    <div>
                      <span className="text-sm font-medium">{d.domain}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {d.status}
                        </Badge>
                        {d.sslStatus && (
                          <Badge variant="outline" className="text-[10px]">SSL: {d.sslStatus}</Badge>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteDomain(d.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500" aria-label="Eliminar subdominio">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar subdominio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Dominio raíz
              </label>
              <select
                value={selectedZone?.id || ""}
                onChange={(e) => setSelectedZone(zones.find(z => z.id === e.target.value) || null)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Seleccionar...</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Subdominio
              </label>
              <div className="flex items-center gap-2">
                <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="pedro" />
                {selectedZone && (
                  <span className="text-sm text-zinc-500">.{selectedZone.name}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDomain(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={addDomain} disabled={addingDomain || !selectedZone || !subdomain}>
                {addingDomain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="Conexión Cloudflare y dominios personalizados" />
    </div>
  );
}

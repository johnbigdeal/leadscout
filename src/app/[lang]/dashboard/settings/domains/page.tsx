"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Globe, CheckCircle2, Loader2, Link2 } from "lucide-react";

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

export default function DomainsSettings() {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [email, setEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);

  async function fetchStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cloudflare/connect", { headers });
    if (res.ok) {
      const data = await res.json();
      setConnected(data.connected);
      if (data.connected) {
        setAccountId(data.accountId || "");
        fetchZones();
        fetchDomains();
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

  useEffect(() => {
    fetchStatus();
  }, []);

  async function handleConnect() {
    if (!apiToken || !accountId) return;
    setConnecting(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/cloudflare/connect", {
      method: "POST",
      headers,
      body: JSON.stringify({ apiToken, accountId, email }),
    });
    if (res.ok) {
      setConnected(true);
      fetchZones();
    }
    setConnecting(false);
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
      fetchDomains();
    }
    setAddingDomain(false);
  }

  async function deleteDomain(id: string) {
    if (!confirm("¿Eliminar este dominio?")) return;
    const headers = await getAuthHeaders();
    await fetch(`/api/cloudflare/domains?id=${id}`, { method: "DELETE", headers });
    fetchDomains();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-semibold">Cloudflare</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectá tu cuenta de Cloudflare para gestionar dominios y subdominios.
        </p>
      </div>

      {!connected ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-semibold">Conectar cuenta</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Account ID
              </label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="tu-account-id" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                API Token
              </label>
              <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="tu-api-token" />
              <p className="mt-1 text-xs text-zinc-500">
                Creá un token en Cloudflare con permisos: Zone:Read, DNS:Edit
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Email (opcional)
              </label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <Button onClick={handleConnect} disabled={connecting || !apiToken || !accountId}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Conectar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium">Cuenta conectada</span>
          </div>

          {/* Zones */}
          <div>
            <h3 className="text-sm font-semibold">Dominios disponibles</h3>
            <div className="mt-3 space-y-2">
              {zones.length === 0 ? (
                <p className="text-sm text-zinc-500">No se encontraron dominios en Cloudflare</p>
              ) : (
                zones.map((z) => (
                  <div key={z.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-medium">{z.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{z.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Domains */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Subdominios creados</h3>
              <Button size="sm" onClick={() => setShowAddDomain(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Agregar
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {domains.length === 0 ? (
                <p className="text-sm text-zinc-500">No hay subdominios creados</p>
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
                    <button onClick={() => deleteDomain(d.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}

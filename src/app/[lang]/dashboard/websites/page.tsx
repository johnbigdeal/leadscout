"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Globe, ExternalLink, Pencil, Trash2, RefreshCw, EyeOff } from "lucide-react";
import { toast } from "sonner";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

type Website = {
  id: string;
  name: string;
  status: string;
  subdomain: string | null;
  domain: string | null;
  publishedUrl: string | null;
  data?: { siteType?: string } | null;
  createdAt: string;
  updatedAt: string;
};

const isBiolink = (w: Website) => w.data?.siteType === "biolink";

export default function WebsitesPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"paralux" | "biolink">("paralux");
  const [creating, setCreating] = useState(false);

  async function fetchWebsites() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/websites", { headers });
    if (res.ok) setWebsites(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchWebsites();
  }, []);

  async function createWebsite() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/websites", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newName.trim(), siteType: newType }),
      });
      if (res.ok) {
        const website = await res.json();
        setShowNewDialog(false);
        setNewName("");
        router.push(`/dashboard/builder/${website.id}`);
      } else {
        toast.error("No se pudo crear el website. Intentá de nuevo.");
      }
    } catch {
      toast.error("No se pudo crear el website. Intentá de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebsite(id: string) {
    if (!confirm("¿Eliminar este website?")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/websites/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      toast.success("Website eliminado");
      fetchWebsites();
    } else {
      toast.error("No se pudo eliminar el website.");
    }
  }

  async function unpublishWebsite(id: string) {
    if (!confirm("¿Despublicar este website? El subdominio dejará de funcionar.")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/websites/${id}/unpublish`, { method: "POST", headers });
    if (res.ok) {
      toast.success("Website despublicado");
      fetchWebsites();
    } else {
      toast.error("No se pudo despublicar el website.");
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">Websites</h1>
          <p className="mt-1 text-sm text-muted-foreground">Landing pages creadas con el builder</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchWebsites}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Website
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : websites.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Globe className="h-12 w-12 text-zinc-300" />
          <p className="text-muted-foreground">No hay websites todavía</p>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {websites.map((w) => (
            <div key={w.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{w.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {w.domain || "Sin dominio asignado"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={w.status === "published" ? "default" : "secondary"} className="text-[10px]">
                    {w.status === "published" ? "Publicado" : "Borrador"}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${isBiolink(w) ? "border-violet-200 bg-violet-50 text-violet-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                    {isBiolink(w) ? "Link in bio" : "Landing"}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs"
                  onClick={() => router.push(`/dashboard/builder/${w.id}`)}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Editar
                </Button>
                {w.publishedUrl && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => window.open(w.publishedUrl!, "_blank")}>
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => unpublishWebsite(w.id)}>
                      <EyeOff className="mr-1 h-3 w-3" />
                      Despublicar
                    </Button>
                  </>
                )}
                <button
                  onClick={() => deleteWebsite(w.id)}
                  aria-label="Eliminar website"
                  title="Eliminar website"
                  className="ml-auto rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Website</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tipo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "paralux", label: "Landing", desc: "Sitio web completo" },
                  { id: "biolink", label: "Link in bio", desc: "Estilo Linktree" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewType(opt.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${newType === opt.id ? "border-primary bg-primary/5" : "border-zinc-200 hover:border-zinc-300"}`}
                  >
                    <span className="block text-sm font-medium text-zinc-900">{opt.label}</span>
                    <span className="block text-xs text-zinc-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Nombre
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim() && !creating) {
                    e.preventDefault();
                    createWebsite();
                  }
                }}
                placeholder="ej. Landing Pedro Barber"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={createWebsite} disabled={!newName.trim() || creating}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

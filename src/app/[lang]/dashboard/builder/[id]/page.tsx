"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ParaluxBuilder from "@/components/ParaluxBuilder";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Globe, Save, Loader2 } from "lucide-react";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.id as string;
  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [builderData, setBuilderData] = useState<any>(null);
  const mainDomain = "leadscout.lat";

  async function fetchWebsite() {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/websites/${websiteId}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setWebsite(data);
      setBuilderData(data.data || {});
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWebsite();
  }, [websiteId]);

  /* Auto-save */
  const saveData = useCallback(async (data: any, html: string) => {
    setSaving(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/websites/${websiteId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ data, html }),
    });
    setSaving(false);
  }, [websiteId]);

  /* Debounced auto-save */
  useEffect(() => {
    if (!builderData) return;
    const timer = setTimeout(() => {
      /* Generate HTML for saving */
      /* We'll pass a ref to the builder to get HTML */
    }, 5000);
    return () => clearTimeout(timer);
  }, [builderData]);

  async function handlePublish() {
    if (!subdomain.trim()) return;
    setPublishing(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/websites/${websiteId}/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({ subdomain: subdomain.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setPublishedUrl(data.url);
      setShowPublish(false);
    } else {
      const err = await res.json();
      alert(err.error || "Error al publicar");
    }
    setPublishing(false);
  }

  function generateSubdomain() {
    const data = builderData || website?.data || {};
    const name = data.businessName || website?.name || "site";
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 62);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Website no encontrado</p>
        <Button onClick={() => router.push("/dashboard/websites")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Builder header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/websites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">{website.name}</h1>
            <p className="text-xs text-zinc-500">
              {saving ? "Guardando..." : "Cambios guardados"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPublish(true)}>
            <Globe className="mr-1.5 h-4 w-4" />
            Publicar
          </Button>
        </div>
      </div>

      {/* Builder */}
      <div className="flex-1 overflow-hidden">
        <ParaluxBuilder
          initialData={builderData}
          onChange={(data: any, html: string) => {
            setBuilderData(data);
            saveData(data, html);
          }}
        />
      </div>

      {/* Publish dialog */}
      <Dialog open={showPublish} onOpenChange={(open) => {
        setShowPublish(open);
        if (open && !subdomain) {
          setSubdomain(generateSubdomain());
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar Website</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {publishedUrl ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">¡Publicado!</p>
                <a href={publishedUrl} target="_blank" rel="noopener" className="mt-1 block text-emerald-600 underline">
                  {publishedUrl}
                </a>
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-600">
                  Elegí el subdominio para tu landing page:
                </p>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Subdominio
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="mi-negocio"
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-sm text-zinc-500">.{mainDomain}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Solo letras, números y guiones. Ej: estudio-lumen
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowPublish(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handlePublish} disabled={publishing || !subdomain.trim()}>
                    {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Publicar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

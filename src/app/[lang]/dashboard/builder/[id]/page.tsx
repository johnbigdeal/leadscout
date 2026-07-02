"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ParaluxBuilder from "@/components/ParaluxBuilder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Globe, Save, Loader2, Monitor, Smartphone, Sparkles, Copy, Check, ExternalLink, Crown, Zap, Download, CloudAlert, RefreshCw } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { toast } from "sonner";

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ data: any; html: string } | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [builderData, setBuilderData] = useState<any>(null);
  const [device, setDevice] = useState("desktop");
  const [showAI, setShowAI] = useState(false);
  const [availableDomains, setAvailableDomains] = useState<{ id: string; domain: string; isDefault: boolean }[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteReady, setSiteReady] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [plan, setPlan] = useState<string>("free");
  const [publishMode, setPublishMode] = useState<"subdomain" | "custom">("subdomain");
  const [customDomain, setCustomDomain] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentHtml, setCurrentHtml] = useState<string>("");

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

  async function fetchPlan() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/billing/plans", { headers });
    if (res.ok) {
      const data = await res.json();
      setPlan(data.currentPlan || "free");
    }
  }

  useEffect(() => {
    fetchWebsite();
    fetchAvailableDomains();
    fetchPlan();
  }, [websiteId]);

  /* Poll published site status */
  useEffect(() => {
    if (!showSuccessModal || !publishedUrl || siteReady) return;

    const checkSite = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(publishedUrl, {
          method: "HEAD",
          mode: "no-cors",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok || res.status === 0 /* no-cors returns opaque response */) {
          setSiteReady(true);
          setCheckingStatus(false);
        }
      } catch {
        /* Still propagating, keep checking */
      }
    };

    checkSite();
    const interval = setInterval(checkSite, 4000);
    const timeout = setTimeout(() => {
      setCheckingStatus(false);
      clearInterval(interval);
    }, 60000); /* Stop after 1 minute */

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [showSuccessModal, publishedUrl, siteReady]);

  async function fetchAvailableDomains() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/domains/available", { headers });
    if (res.ok) {
      const data = await res.json();
      /* Dedupe by domain name (a domain can exist as both global and org-scoped) */
      const seen = new Set<string>();
      const unique = (data as any[]).filter((d) => {
        if (d.isActive === false) return false;
        if (seen.has(d.domain)) return false;
        seen.add(d.domain);
        return true;
      });
      setAvailableDomains(unique);
      const defaultDomain = unique.find((d: any) => d.isDefault);
      if (defaultDomain) setSelectedDomain(defaultDomain.domain);
      else if (unique.length > 0) setSelectedDomain(unique[0].domain);
    }
  }

  /* Auto-save (checks the response and surfaces failures). Returns true on success. */
  const saveData = useCallback(async (data: any, html: string): Promise<boolean> => {
    setSaving(true);
    setSaveStatus("saving");
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ data, html }),
      });
      if (!res.ok) {
        setSaveStatus("error");
        toast.error("No se pudieron guardar los cambios. Reintentando…");
        return false;
      }
      pendingSave.current = null;
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      toast.error("No se pudieron guardar los cambios. Revisá tu conexión.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [websiteId]);

  /* Debounced auto-save: collapse rapid edits into one PUT */
  const scheduleSave = useCallback((data: any, html: string) => {
    pendingSave.current = { data, html };
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pendingSave.current) saveData(pendingSave.current.data, pendingSave.current.html);
    }, 800);
  }, [saveData]);

  /* Warn before leaving with an unsaved/in-flight edit */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingSave.current || saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saving]);

  function downloadHtml() {
    if (!currentHtml) return;
    const blob = new Blob([currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${website?.name || "sitio"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* Push the latest edits to the already-published site (content only — no DNS
     changes). The published page renders live from `data`, and saveData's PUT
     also purges the CDN cache, so the live site reflects changes immediately. */
  async function handleUpdate() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const ok = await saveData(builderData, currentHtml);
    if (ok) toast.success("Sitio actualizado");
  }

  async function handlePublish() {
    setPublishing(true);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";

    const body = publishMode === "custom"
      ? { customDomain: customDomain.trim() }
      : { subdomain: subdomain.trim(), rootDomain: selectedDomain || undefined };

    const res = await fetch(`/api/websites/${websiteId}/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setPublishedUrl(data.url);
      if (data.website) setWebsite(data.website);
      setSiteReady(false);
      setCheckingStatus(true);
      setShowPublish(false);
      setShowSuccessModal(true);
      /* Auto-copy to clipboard */
      try {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (e) {
        /* ignore clipboard errors */
      }
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "No se pudo publicar el sitio. Intentá de nuevo.");
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Website no encontrado</p>
        <Button onClick={() => router.push("/dashboard/websites")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Builder header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" aria-label="Volver a sitios web" onClick={() => router.push("/dashboard/websites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">{website.name}</h1>
            <Badge
              variant={website.status === "published" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {website.status === "published" ? "Publicado" : "Borrador"}
            </Badge>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
              {saveStatus === "saving" && (
                <><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</>
              )}
              {saveStatus === "saved" && (
                <><Check className="h-3 w-3 text-emerald-500" /> Guardado</>
              )}
              {saveStatus === "error" && (
                <button
                  type="button"
                  onClick={() => pendingSave.current && saveData(pendingSave.current.data, pendingSave.current.html)}
                  className="flex items-center gap-1 text-destructive hover:underline"
                >
                  <CloudAlert className="h-3 w-3" /> Error — reintentar
                </button>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                device === "desktop"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setDevice("desktop")}
              aria-pressed={device === "desktop"}
              aria-label="Vista escritorio"
            >
              <Monitor className="h-3.5 w-3.5" />
              Escritorio
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                device === "mobile"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setDevice("mobile")}
              aria-pressed={device === "mobile"}
              aria-label="Vista móvil"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Móvil
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAI(true)}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generar con IA
          </Button>
          <Button size="sm" variant="outline" onClick={downloadHtml}>
            <Download className="mr-1.5 h-4 w-4" />
            Exportar
          </Button>
          {website.status === "published" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowPublish(true)}>
                <Globe className="mr-1.5 h-4 w-4" />
                Cambiar dominio
              </Button>
              <Button size="sm" onClick={handleUpdate} disabled={saving}>
                <RefreshCw className={`mr-1.5 h-4 w-4 ${saving ? "animate-spin" : ""}`} />
                {saving ? "Actualizando…" : "Actualizar"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setShowPublish(true)}>
              <Globe className="mr-1.5 h-4 w-4" />
              Publicar
            </Button>
          )}
        </div>
      </div>

      {/* Builder */}
      <div className="flex-1 overflow-hidden">
        <ParaluxBuilder
          initialData={builderData}
          onChange={(data: any, html: string) => {
            setBuilderData(data);
            setCurrentHtml(html);
            scheduleSave(data, html);
          }}
          device={device}
          onDeviceChange={setDevice}
          showAI={showAI}
          onShowAIChange={setShowAI}
          plan={plan}
        />
      </div>

      {/* Publish dialog */}
      <Dialog open={showPublish} onOpenChange={(open) => {
        setShowPublish(open);
        if (open) {
          /* Prefill with the current published subdomain/domain if any, so
             "Cambiar dominio" doesn't regenerate a different subdomain. */
          if (website.subdomain) setSubdomain(website.subdomain);
          else if (!subdomain) setSubdomain(generateSubdomain());
          if (plan === "free") {
            const def = availableDomains.find((d) => d.isDefault) || availableDomains[0];
            setSelectedDomain(def?.domain || "leadscout.lat");
          } else if (website.domain && website.subdomain) {
            const root = website.domain.replace(`${website.subdomain}.`, "");
            if (root) setSelectedDomain(root);
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{website.status === "published" ? "Cambiar dominio" : "Publicar Website"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex rounded-lg border border-zinc-200 p-1">
              <button
                onClick={() => setPublishMode("subdomain")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  publishMode === "subdomain" ? "bg-primary text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                Subdominio LeadScout
              </button>
              <button
                onClick={() => {
                  if (plan === "free") {
                    setShowUpgradeModal(true);
                    setShowPublish(false);
                    return;
                  }
                  setPublishMode("custom");
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  publishMode === "custom" ? "bg-primary text-white" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                Mi dominio propio
                {plan === "free" && <span className="ml-1 text-xs opacity-70">🔒 Pro</span>}
              </button>
            </div>

            {publishMode === "subdomain" ? (
              <>
                {/* Selector cuando hay más de un dominio disponible; si no, texto fijo. */}
                {availableDomains.length > 1 ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Dominio
                    </label>
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {availableDomains.map((d) => (
                        <option key={d.id} value={d.domain}>
                          {d.domain} {d.isDefault ? "(default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Dominio
                    </label>
                    <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                      {availableDomains[0]?.domain || selectedDomain || "leadscout.lat"}
                    </p>
                  </div>
                )}
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
                    <span className="text-sm text-zinc-500 shrink-0">.{selectedDomain || availableDomains[0]?.domain || "leadscout.lat"}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Solo letras, números y guiones. Ej: estudio-lumen
                  </p>
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Tu dominio
                </label>
                <input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                  placeholder="barberiaperez.com"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Ingresá tu dominio raíz. Se crearán los registros DNS automáticamente.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPublish(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handlePublish}
                disabled={publishing || (publishMode === "subdomain" ? !subdomain.trim() : !customDomain.trim())}
              >
                {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Publicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success modal — separate, on top of everything */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        setShowSuccessModal(open);
        if (!open) {
          setSiteReady(false);
          setCheckingStatus(false);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Globe className="h-5 w-5" />
              ¡Website publicado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {siteReady ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                <span>Tu sitio está en línea y listo para compartir.</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                <span>
                  Tu sitio ya está publicado. Podés abrirlo ahora
                  {checkingStatus && (
                    <span className="text-emerald-600/80"> — terminando de propagar, puede tardar 1–2 min</span>
                  )}
                  .
                </span>
              </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Link de tu sitio
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={publishedUrl || ""}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (publishedUrl) {
                      await navigator.clipboard.writeText(publishedUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                >
                  {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              {copied && (
                <p className="mt-1.5 text-xs text-emerald-600 font-medium">
                  ✓ Link copiado al portapapeles
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSiteReady(false);
                  setCheckingStatus(false);
                }}
              >
                Cerrar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (publishedUrl) window.open(publishedUrl, "_blank");
                }}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Abrir sitio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Dominios personalizados propios"
      />
    </div>
  );
}

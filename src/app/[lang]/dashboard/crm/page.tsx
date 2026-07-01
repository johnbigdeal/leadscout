"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES, formatMoney } from "@/lib/currencies";
import { BusinessCard } from "@/components/business-card";
import { GripVertical, Phone, MessageCircle, Globe, X, Trash2, User, Tag, Plus, ArrowUpRight, DollarSign, Crown, PhoneCall, Check, Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { FreeBadge } from "@/components/plan-badges";
import { RichText } from "@/components/trainings/RichText";
import { fetchTrainings } from "@/lib/trainings/client";
import { isLatinoOwned } from "@/lib/business-attributes";

type Business = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isWhatsapp: boolean | null;
  website: string | null;
  hasWebsite: boolean | null;
  category: string | null;
  rating: string | null;
  reviewsCount: number | null;
  rawJson?: unknown;
  seo?: { pagespeedPerf: number | null; pagespeedSeo: number | null; pagespeedA11y: number | null } | null;
  opportunityScore?: { score: number; reasons: string[] } | null;
  isLead?: boolean;
};

type Lead = {
  id: string;
  businessId: string;
  pipelineId: string | null;
  stage: string;
  tags: string[];
  categoryId: string | null;
  category: { id: string; name: string; color: string } | null;
  createdAt: string;
  business: Business | null;
};

type LeadCategory = {
  id: string;
  name: string;
  color: string;
};

type Activity = {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
};

const STAGES = ["new", "contacted", "qualified", "won", "lost"];

const STAGE_META: Record<string, { border: string; bg: string; dot: string; label: string }> = {
  new: { border: "border-t-primary/30", bg: "bg-primary/5", dot: "bg-primary", label: "text-primary" },
  contacted: { border: "border-t-amber-400/30", bg: "bg-amber-50", dot: "bg-amber-400", label: "text-amber-600" },
  qualified: { border: "border-t-violet-400/30", bg: "bg-violet-50", dot: "bg-violet-400", label: "text-violet-600" },
  won: { border: "border-t-emerald-400/30", bg: "bg-emerald-50", dot: "bg-emerald-400", label: "text-emerald-600" },
  lost: { border: "border-t-red-400/30", bg: "bg-red-50", dot: "bg-red-400", label: "text-red-600" },
};

function getStageMeta(stage: string) {
  return STAGE_META[stage] || { border: "border-t-zinc-300", bg: "bg-zinc-50", dot: "bg-zinc-400", label: "text-zinc-600" };
}

/* Título de la lección de la Academia que reemplaza al guion por defecto. */
const SCRIPT_LESSON_TITLE = "Scrip: Como llamar a un posible cliente";

/* Normaliza para comparar títulos sin acentos ni mayúsculas. */
function normalizeTitle(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/* Guion por defecto (fallback) si la lección aún no existe en Entrenamientos. */
const SALES_CALL_SCRIPT = `
<h3>1. Apertura y presentación</h3>
<p>"Hola, ¿hablo con <strong>[nombre]</strong>? Te habla <strong>[tu nombre]</strong> de <strong>[tu empresa]</strong>. ¿Te agarro en un buen momento para hablar un minuto?"</p>
<h3>2. Motivo de la llamada</h3>
<p>"Te contacto porque ayudamos a negocios como el tuyo a <strong>conseguir más clientes</strong> con presencia online. Vi tu negocio y creo que hay una oportunidad clara para vos."</p>
<h3>3. Preguntas de calificación</h3>
<ul>
  <li>"¿Cómo estás consiguiendo clientes hoy?"</li>
  <li>"¿Tenés página web o solo redes?"</li>
  <li>"¿Qué te gustaría mejorar en los próximos meses?"</li>
</ul>
<h3>4. Manejo de objeción</h3>
<p>Si dice <em>"no tengo tiempo / no me interesa"</em>: "Te entiendo, justamente por eso lo hacemos simple. ¿Te mando la info por WhatsApp y lo ves cuando puedas?"</p>
<h3>5. Cierre y próximos pasos</h3>
<p>"Perfecto. Agendemos <strong>15 minutos</strong> para mostrarte cómo quedaría. ¿Te viene mejor hoy a la tarde o mañana a la mañana?"</p>
<blockquote>Al terminar la llamada, tomá una nota del resultado y mové el lead a la etapa correspondiente.</blockquote>
`.trim();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

function SortableLeadCard({ lead, onClick, onQuickStage }: { lead: Lead; onClick: (lead: Lead) => void; onQuickStage: (leadId: string, stage: string) => void }) {
  const t = useTranslations("crm");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });
  const meta = getStageMeta(lead.stage);
  const score = lead.business?.opportunityScore?.score ?? 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-zinc-200 border-t-4 bg-white shadow-sm transition-shadow hover:shadow-md ${meta.border}`}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-zinc-300 hover:text-zinc-400 active:cursor-grabbing"
          aria-label="drag handle"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onClick(lead)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-zinc-900">
              {lead.business?.name ?? "—"}
            </h4>
            {score > 0 && (
              <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {score}
              </span>
            )}
          </div>
          {(lead.category || isLatinoOwned(lead.business?.rawJson)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {lead.category && (
                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: lead.category.color }}>
                  {lead.category.name}
                </span>
              )}
              {isLatinoOwned(lead.business?.rawJson) && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-700">
                  Negocio latino
                </Badge>
              )}
            </div>
          )}
          {(lead.business?.category || lead.business?.rating) && (
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              {lead.business?.category && <span>{lead.business.category}</span>}
              {lead.business?.rating && (
                <span className="text-amber-500">★ {Number(lead.business.rating).toFixed(1)}</span>
              )}
            </div>
          )}
          {lead.business?.phone && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-600">
              <Phone className="h-3 w-3 text-zinc-400" />
              <a
                href={`tel:${lead.business.phone}`}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="hover:text-zinc-900 hover:underline"
              >
                {lead.business.phone}
              </a>
              {lead.business.isWhatsapp && (
                <MessageCircle className="h-3 w-3 text-emerald-500" />
              )}
            </div>
          )}
          {lead.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {lead.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="border-zinc-200 bg-zinc-50 text-[10px] font-normal text-zinc-600">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </button>
      </div>
      <div className="flex items-center gap-1 border-t border-zinc-100 px-2 py-1.5">
        {STAGES.filter(s => s !== lead.stage).map(stage => (
          <button
            key={stage}
            onClick={(e) => { e.stopPropagation(); onQuickStage(lead.id, stage); }}
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize opacity-60 hover:opacity-100 transition-opacity ${
              STAGE_META[stage]?.label || "text-zinc-500"
            }`}
          >
            {t(stage as "new" | "contacted" | "qualified" | "won" | "lost")}
          </button>
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({ stage, leads, onLeadClick, onQuickStage }: { stage: string; leads: Lead[]; onLeadClick: (lead: Lead) => void; onQuickStage: (leadId: string, stage: string) => void }) {
  const t = useTranslations("crm");
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage}` });
  const meta = getStageMeta(stage);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50/80 transition-colors min-h-[250px] ${isOver ? "bg-accent/10 ring-2 ring-accent/30" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <h3 className={`text-sm font-semibold ${meta.label}`}>
            {t(stage as "new" | "contacted" | "qualified" | "won" | "lost")}
          </h3>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-semibold text-zinc-600">
          {leads.length}
        </span>
      </div>
      <div className="flex-1 space-y-2.5 p-3">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onClick={onLeadClick} onQuickStage={onQuickStage} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-8 text-center">
            <User className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-400">{t("noLeads")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

type LeadService = {
  id: string;
  leadId: string;
  serviceId: string;
  cost: string;
  recurrence: string;
  serviceName: string;
};

function LeadDetailDialog({
  lead, open, onOpenChange, onStageChange, onTagsChange, onAddNote, onDelete, onServiceChange, categories, onCategoryChange, pipelines, activePipelineId, onPipelineChange, onCreateWebsite, plan, onShowUpgrade,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange: (stage: string) => void;
  onTagsChange: (tags: string[]) => void;
  onAddNote: (note: string) => void;
  onDelete: () => void;
  onServiceChange: () => void;
  categories: LeadCategory[];
  onCategoryChange: (categoryId: string | null) => void;
  pipelines: Pipeline[];
  activePipelineId: string | null | undefined;
  onPipelineChange: (pipelineId: string | null) => void;
  onCreateWebsite?: (leadId: string, businessId?: string) => void;
  plan: string;
  onShowUpgrade: (feature: string) => void;
}) {
  const t = useTranslations("crm");
  const { currency, convertAmount } = useCurrency();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [noteText, setNoteText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [leadServices, setLeadServices] = useState<LeadService[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceCost, setServiceCost] = useState("");
  const [serviceCurrency, setServiceCurrency] = useState(currency || "USD");
  const [serviceRecurrence, setServiceRecurrence] = useState("one_time");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#0369A1");
  const [showScript, setShowScript] = useState(false);
  const [scriptHtml, setScriptHtml] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  const RECURRENCE_LABELS: Record<string, string> = {
    one_time: "Único",
    monthly: "Mensual",
    annual: "Anual",
    lifetime: "Vitalicio",
  };

  useEffect(() => {
    if (!lead) return;
    setNoteText("");
    setLeadServices([]);
    setShowScript(false);
    (async () => {
      const headers = await getAuthHeaders();
      const [actRes, svcRes, allSvcRes] = await Promise.all([
        fetch(`/api/leads/${lead.id}/activities`, { headers }),
        fetch(`/api/leads/${lead.id}/services`, { headers }),
        fetch(`/api/services`, { headers }),
      ]);
      if (actRes.ok) setActivities(await actRes.json());
      if (svcRes.ok) setLeadServices(await svcRes.json());
      if (allSvcRes.ok) setAllServices(await allSvcRes.json());
    })();
  }, [lead]);

  async function addServiceToLead() {
    if (!selectedServiceId || !lead) return;
    const svc = allServices.find(s => s.id === selectedServiceId);
    const cost = serviceCost || svc?.defaultCost || "0";
    const cur = serviceCurrency || svc?.currency || "USD";
    const recurrence = serviceRecurrence || svc?.recurrence || "one_time";
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${lead.id}/services`, {
      method: "POST", headers,
      body: JSON.stringify({ serviceId: selectedServiceId, cost, currency: cur, recurrence }),
    });
    if (res.ok) {
      const created = await res.json();
      setLeadServices(prev => [...prev, created]);
      setSelectedServiceId("");
      setServiceCost("");
      await fetch(`/api/leads/${lead.id}/activities`, {
        method: "POST", headers,
        body: JSON.stringify({ type: "service_added", body: `Servicio agregado: ${svc?.name} - ${formatMoney(Number(cost), cur)}` }),
      }).catch(() => {});
      onServiceChange();
    } else {
      const err = await res.text();
      console.error("Error al agregar servicio:", res.status, err);
      toast.error("No se pudo agregar el servicio. Intentá de nuevo.");
    }
  }

  async function removeServiceFromLead(serviceId: string) {
    if (!lead) return;
    const svc = leadServices.find(ls => ls.serviceId === serviceId);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${lead.id}/services`, {
      method: "DELETE", headers,
      body: JSON.stringify({ serviceId }),
    });
    if (res.ok) {
      setLeadServices(prev => prev.filter(s => s.serviceId !== serviceId));
      await fetch(`/api/leads/${lead.id}/activities`, {
        method: "POST", headers,
        body: JSON.stringify({ type: "service_removed", body: `Servicio eliminado: ${svc?.serviceName || serviceId}` }),
      }).catch(() => {});
      onServiceChange();
    } else {
      console.error("Error al eliminar servicio:", res.status, await res.text());
      toast.error("No se pudo eliminar el servicio. Intentá de nuevo.");
    }
  }

  if (!lead) return null;

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  async function submitNote() {
    if (!noteText.trim()) return;
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${lead!.id}/activities`, {
      method: "POST", headers,
      body: JSON.stringify({ type: "note", body: noteText }),
    });
    if (res.ok) {
      const newActivity = await res.json();
      setActivities((prev) => [newActivity, ...prev]);
      setNoteText("");
      onAddNote(noteText);
    }
  }

  async function submitTag() {
    if (!tagInput.trim()) return;
    const newTags = [...(lead!.tags || []), tagInput.trim()];
    setTagInput("");
    onTagsChange(newTags);
  }

  /* Muestra/oculta el guion de llamada. Al abrirlo por primera vez, busca la
     lección en la Academia; si no existe, usa el guion por defecto. */
  async function toggleScript() {
    if (showScript) {
      setShowScript(false);
      return;
    }
    setShowScript(true);
    if (scriptHtml !== null) return; // ya cargado
    setScriptLoading(true);
    try {
      const data = await fetchTrainings();
      const target = normalizeTitle(SCRIPT_LESSON_TITLE);
      const lessons = data.sections.flatMap((s) => s.lessons);
      const match = lessons.find((l) => {
        const t = normalizeTitle(l.title);
        return (t === target || t.includes("como llamar")) && l.content;
      });
      setScriptHtml(match?.content || SALES_CALL_SCRIPT);
    } catch {
      setScriptHtml(SALES_CALL_SCRIPT);
    } finally {
      setScriptLoading(false);
    }
  }

  /* "Terminar": mueve el lead a Contactado y colapsa el guion. */
  function finishScriptCall() {
    if (lead!.stage !== "contacted") onStageChange("contacted");
    setShowScript(false);
    toast.success("Lead movido a Contactado");
  }

  async function removeTag(tag: string) {
    onTagsChange((lead!.tags || []).filter((t) => t !== tag));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!top-[3%] !-translate-y-0 !max-h-[94vh] max-w-[calc(100%-1.5rem)] sm:max-w-2xl flex flex-col">
        <div className="flex flex-col h-full">
          <DialogHeader className="shrink-0 pr-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="font-display text-lg break-words leading-snug">{lead.business?.name ?? "—"}</DialogTitle>
                  <DialogDescription>{t("createdAt")}: {formatDate(lead.createdAt)}</DialogDescription>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={showScript ? "default" : "outline"}
                  onClick={toggleScript}
                >
                  <PhoneCall className="mr-1.5 h-4 w-4" />
                  {showScript ? "Ocultar script" : "Mostrar script"}
                </Button>
                {onCreateWebsite && lead?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateWebsite(lead.id, lead.businessId || undefined)}
                  >
                    <Globe className="mr-1.5 h-4 w-4" />
                    Crear Website
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto min-h-0 pr-1">
            {showScript && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                  <PhoneCall className="h-4 w-4" />
                  Script: Cómo llamar a un posible cliente
                </div>
                {scriptLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando script…
                  </div>
                ) : (
                  <RichText html={scriptHtml} className="prose prose-sm max-w-none text-zinc-700" />
                )}
                <div className="mt-4 flex justify-end border-t border-primary/15 pt-3">
                  <Button size="sm" onClick={finishScriptCall} disabled={lead.stage === "contacted"}>
                    <Check className="mr-1.5 h-4 w-4" />
                    {lead.stage === "contacted" ? "Ya está en Contactado" : "Terminar y mover a Contactado"}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <ArrowUpRight className="h-3 w-3" />
                {t("changeStage")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((stage) => {
                  const meta = getStageMeta(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => onStageChange(stage)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        lead.stage === stage
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {t(stage as "new" | "contacted" | "qualified" | "won" | "lost")}
                    </button>
                  );
                })}
              </div>
            </div>

            {pipelines.length > 0 && (
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <ArrowUpRight className="h-3 w-3" />
                  Pipeline
                </label>
                <select
                  value={lead.pipelineId || "__none__"}
                  onChange={e => onPipelineChange(e.target.value === "__none__" ? null : e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="__none__">Sin pipeline</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <DollarSign className="h-3 w-3" />
                Servicios
              </label>
              {leadServices.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {leadServices.map(ls => (
                    <div key={ls.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-zinc-800">{ls.serviceName}</p>
                          <span className="rounded bg-zinc-200 px-1 py-0 text-[10px] text-zinc-600">{RECURRENCE_LABELS[ls.recurrence] || ls.recurrence}</span>
                        </div>
                        <p className="text-xs text-zinc-500">{formatMoney(Number(ls.cost), (ls as any).currency || (ls as any).defaultCurrency || "USD")}</p>
                      </div>
                      <button onClick={() => removeServiceFromLead(ls.serviceId)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {allServices.length > 0 && (
                <div className="space-y-2">
                  <select
                    value={selectedServiceId}
                    onChange={e => {
                      setSelectedServiceId(e.target.value);
                      const svc = allServices.find(s => s.id === e.target.value);
                      setServiceCost(svc?.defaultCost || "");
                      setServiceCurrency(svc?.currency || currency || "USD");
                      setServiceRecurrence(svc?.recurrence || "one_time");
                    }}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Seleccionar servicio...</option>
                    {allServices.filter(s => !leadServices.find(ls => ls.serviceId === s.id)).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number" min="0" step="0.01" placeholder="Costo"
                      value={serviceCost}
                      onChange={e => setServiceCost(e.target.value)}
                      className="h-9 flex-1 text-sm"
                    />
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
                  <select
                    value={serviceRecurrence}
                    onChange={e => setServiceRecurrence(e.target.value)}
                    aria-label="Tipo de cobro"
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="one_time">Único</option>
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual</option>
                    <option value="lifetime">Vitalicio</option>
                  </select>
                  <Button size="sm" onClick={addServiceToLead} disabled={!selectedServiceId} className="w-full">
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar servicio
                  </Button>
                </div>
              )}
              {allServices.length === 0 && (
                <p className="text-xs text-zinc-400">Crea servicios en el panel de ventas para asignarlos aquí.</p>
              )}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <Tag className="h-3 w-3" />
                Categoría
              </label>
              {lead.category && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: lead.category.color }}>
                    {lead.category.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <select
                  value={lead.categoryId || ""}
                  onChange={e => onCategoryChange(e.target.value || null)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Sin categoría</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => {
                  if (plan === "free" && categories.length >= 3) {
                    onShowUpgrade("Categorías ilimitadas");
                    return;
                  }
                  setShowNewCategory(!showNewCategory);
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showNewCategory && (
                <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <Input
                    placeholder="Nombre de categoría"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={e => setNewCategoryColor(e.target.value)}
                      className="h-8 w-8 rounded border border-zinc-200"
                    />
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!newCategoryName.trim()}
                      onClick={async () => {
                        const headers = await getAuthHeaders();
                        headers["Content-Type"] = "application/json";
                        const res = await fetch("/api/lead-categories", {
                          method: "POST", headers,
                          body: JSON.stringify({ name: newCategoryName.trim(), color: newCategoryColor }),
                        });
                        if (res.ok) {
                          const cat = await res.json();
                          onCategoryChange(cat.id);
                          setShowNewCategory(false);
                          setNewCategoryName("");
                          setNewCategoryColor("#0369A1");
                        } else if (res.status === 403) {
                          setShowNewCategory(false);
                          onShowUpgrade("Categorías ilimitadas");
                        }
                      }}
                    >
                      Crear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <Tag className="h-3 w-3" />
                {t("tags")}
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(lead.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-primary/50 hover:text-primary">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex items-center">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTag(); } }}
                    placeholder={t("tagPlaceholder")}
                    className="h-8 w-36 text-sm"
                  />
                </div>
              </div>
            </div>

            {lead.business && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <BusinessCard business={lead.business} />
              </div>
            )}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <Plus className="h-3 w-3" />
                {t("notes")}
              </label>
              <div className="mb-3 flex gap-2">
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitNote(); } }}
                  placeholder={t("notePlaceholder")}
                  className="flex-1"
                />
                <Button size="sm" onClick={submitNote} disabled={!noteText.trim()}>
                  {t("saveNote")}
                </Button>
              </div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-400">{t("noActivities")}</p>
                ) : (
                  activities.map((a) => (
                    <div key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-zinc-200 text-[10px] font-normal capitalize text-zinc-500">
                          {a.type}
                        </Badge>
                        <span className="text-[10px] text-zinc-400">{formatDate(a.createdAt)}</span>
                      </div>
                      {a.body && <p className="mt-1 text-sm text-zinc-700">{a.body}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => { if (confirm(t("confirmDelete"))) onDelete(); }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("deleteLead")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Pipeline = {
  id: string;
  name: string;
  category: string | null;
  isDefault: boolean;
  stages: string[];
};

export default function CrmPage() {
  const router = useRouter();
  const t = useTranslations("crm");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addingLead, setAddingLead] = useState(false);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newPipelineCategory, setNewPipelineCategory] = useState("");
  const [plan, setPlan] = useState<string>("free");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("Pipelines ilimitados");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchPipelines = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/pipelines", { headers });
    if (res.ok) {
      const data = await res.json();
      setPipelines(data);
      if (data.length > 0 && !activePipeline) setActivePipeline(data[0]);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/lead-categories", { headers });
    if (res.ok) setCategories(await res.json());
  }, []);

  async function handleSetDefaultPipeline(pipelineId: string) {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/pipelines/${pipelineId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      setPipelines((prev) => prev.map((p) => ({ ...p, isDefault: p.id === pipelineId })));
      setActivePipeline((prev) => (prev ? { ...prev, isDefault: prev.id === pipelineId } : prev));
      toast.success("Pipeline marcado como predeterminado");
    } else {
      toast.error("No se pudo marcar como predeterminado. Intentá de nuevo.");
    }
  }

  const fetchLeads = useCallback(async (pipelineId?: string) => {
    setLoadError(false);
    try {
      const headers = await getAuthHeaders();
      const url = pipelineId ? `/api/leads?pipelineId=${pipelineId}` : "/api/leads";
      const res = await fetch(url, { headers });
      if (res.ok) {
        setLeads(await res.json());
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function fetchPlan() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/billing/plans", { headers });
    if (res.ok) {
      const data = await res.json();
      setPlan(data.currentPlan || "free");
    }
  }

  useEffect(() => { fetchPipelines(); fetchCategories(); fetchPlan(); }, []);
  useEffect(() => { fetchLeads(activePipeline?.id); }, [activePipeline, fetchLeads]);

  function getStageLeads(stage: string) {
    return leads.filter((l) => l.stage === stage);
  }

  function handleLeadClick(lead: Lead) {
    setSelectedLead(lead);
    setOpenDetail(true);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(leads.find((l) => l.id === event.active.id) ?? null);
    setOverColumn(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }
    const lead = leads.find((l) => l.id === over.id);
    if (lead) { setOverColumn(lead.stage); return; }
    const match = String(over.id).match(/^column-(.+)$/);
    if (match) { setOverColumn(match[1]); return; }
    setOverColumn(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const leadId = active.id as string;
    const activeLeadObj = leads.find((l) => l.id === leadId);
    if (!activeLeadObj) { setActiveLead(null); setOverColumn(null); return; }

    let newStage: string | null = null;

    if (over) {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) newStage = overLead.stage;
      else {
        const match = String(over.id).match(/^column-(.+)$/);
        if (match) newStage = match[1];
      }
    }

    if (!newStage && overColumn) {
      newStage = overColumn;
    }

    if (!newStage || newStage === activeLeadObj.stage) {
      setActiveLead(null);
      setOverColumn(null);
      return;
    }

    const prevStage = activeLeadObj.stage;
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    setActiveLead(null);
    setOverColumn(null);

    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${leadId}`, { method: "PATCH", headers, body: JSON.stringify({ stage: newStage }) });
    if (!res.ok) {
      console.error("PATCH failed:", res.status, await res.text());
      toast.error("No se pudo cambiar la etapa. Intentá de nuevo.");
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: prevStage } : l));
      return;
    }
    headers["Content-Type"] = "application/json";
    await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST", headers,
      body: JSON.stringify({ type: "stage_change", body: `Cambio de etapa: ${prevStage} → ${newStage}` }),
    }).catch(() => {});
    fetchLeads(activePipeline?.id);
  }

  async function handleStageChange(stage: string) {
    if (!selectedLead) return;
    const prevStage = selectedLead.stage;
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, stage } : l));
    setSelectedLead((prev) => prev ? { ...prev, stage } : null);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${selectedLead.id}`, { method: "PATCH", headers, body: JSON.stringify({ stage }) });
    if (!res.ok) {
      console.error("PATCH failed:", res.status, await res.text());
      toast.error("No se pudo cambiar la etapa. Intentá de nuevo.");
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, stage: prevStage } : l));
      setSelectedLead((prev) => prev ? { ...prev, stage: prevStage } : null);
      return;
    }
    headers["Content-Type"] = "application/json";
    await fetch(`/api/leads/${selectedLead.id}/activities`, {
      method: "POST", headers,
      body: JSON.stringify({ type: "stage_change", body: `Cambio de etapa: ${prevStage} → ${stage}` }),
    }).catch(() => {});
    fetchLeads(activePipeline?.id);
  }

  async function handleTagsChange(tags: string[]) {
    if (!selectedLead) return;
    if (plan === "free" && tags.length > 3) {
      setUpgradeFeature("Etiquetas ilimitadas");
      setShowUpgradeModal(true);
      return;
    }
    setSelectedLead((prev) => prev ? { ...prev, tags } : null);
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, tags } : l));
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${selectedLead.id}`, { method: "PATCH", headers, body: JSON.stringify({ tags }) });
    if (res.status === 403) {
      setUpgradeFeature("Etiquetas ilimitadas");
      setShowUpgradeModal(true);
      /* Revert local state */
      fetchLeads(activePipeline?.id);
    }
  }

  async function handleCategoryChange(categoryId: string | null) {
    if (!selectedLead) return;
    const cat = categories.find(c => c.id === categoryId);
    setSelectedLead((prev) => prev ? { ...prev, categoryId: categoryId || null, category: cat || null } : null);
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, categoryId: categoryId || null, category: cat || null } : l));
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/leads/${selectedLead.id}`, { method: "PATCH", headers, body: JSON.stringify({ categoryId }) });
    fetchCategories();
  }

  async function handleQuickStage(leadId: string, stage: string) {
    const prevLeads = [...leads];
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage } : l));
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${leadId}`, { method: "PATCH", headers, body: JSON.stringify({ stage }) });
    if (!res.ok) {
      console.error("PATCH failed:", res.status, await res.text());
      toast.error("No se pudo cambiar la etapa. Intentá de nuevo.");
      setLeads(prevLeads);
      return;
    }
    headers["Content-Type"] = "application/json";
    await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST", headers,
      body: JSON.stringify({ type: "stage_change", body: `Cambio rápido de etapa → ${stage}` }),
    }).catch(() => {});
    fetchLeads(activePipeline?.id);
  }

  async function handlePipelineChange(pipelineId: string | null) {
    if (!selectedLead) return;
    const prevPipelineId = selectedLead.pipelineId;
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, pipelineId: pipelineId ?? null } : l));
    setSelectedLead((prev) => prev ? { ...prev, pipelineId: pipelineId ?? null, stage: "new" } : null);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/leads/${selectedLead.id}`, { method: "PATCH", headers, body: JSON.stringify({ pipelineId, stage: "new" }) });
    if (!res.ok) {
      console.error("PATCH pipeline failed:", res.status, await res.text());
      toast.error("No se pudo cambiar el pipeline. Intentá de nuevo.");
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, pipelineId: prevPipelineId } : l));
      setSelectedLead((prev) => prev ? { ...prev, pipelineId: prevPipelineId } : null);
      return;
    }
    fetchLeads(activePipeline?.id);
  }

  async function handleDeleteLead() {
    if (!selectedLead) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/leads/${selectedLead.id}`, { method: "DELETE", headers });
    if (!res.ok) {
      toast.error("No se pudo eliminar el prospecto. Intentá de nuevo.");
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
    setOpenDetail(false);
    setSelectedLead(null);
    toast.success("Prospecto eliminado");
  }

  async function handleCreateWebsite(leadId: string, businessId?: string) {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/websites", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `Website ${selectedLead?.business?.name || "Nuevo"}`,
        leadId,
        businessId,
      }),
    });
    if (res.ok) {
      const website = await res.json();
      router.push(`/dashboard/builder/${website.id}`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "No se pudo crear el sitio web. Intentá de nuevo.");
    }
  }

  const stages = activePipeline?.stages || STAGES;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dragHint")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activePipeline?.id || "__all__"}
            onChange={(e) => {
              if (e.target.value === "__all__") {
                setActivePipeline(null);
              } else {
                const p = pipelines.find((pl) => pl.id === e.target.value);
                if (p) setActivePipeline(p);
              }
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="__all__">Todos los prospectos</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isDefault ? "★ " : ""}{p.category ? `(${p.category})` : ""}
              </option>
            ))}
          </select>
          {activePipeline && !activePipeline.isDefault && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSetDefaultPipeline(activePipeline.id)}
              title="Marcar como predeterminado"
            >
              Marcar como predeterminado
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => {
            if (plan === "free" && pipelines.length >= 1) {
              setUpgradeFeature("Pipelines ilimitados");
              setShowUpgradeModal(true);
              return;
            }
            setShowCreatePipeline(true);
          }} title="Crear pipeline" aria-label="Crear pipeline">
            <Plus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {leads.length} {leads.length === 1 ? "prospecto" : "prospectos"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-3 h-5 w-24 animate-pulse rounded bg-zinc-200" />
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">No pudimos cargar tus prospectos.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => { setIsLoading(true); fetchLeads(activePipeline?.id); }}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <KanbanColumn key={stage} stage={stage} leads={getStageLeads(stage)} onLeadClick={handleLeadClick} onQuickStage={handleQuickStage} />
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
                <p className="font-semibold text-zinc-900">{activeLead.business?.name ?? "—"}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <LeadDetailDialog
        lead={selectedLead}
        open={openDetail}
        onOpenChange={setOpenDetail}
        onStageChange={handleStageChange}
        onTagsChange={handleTagsChange}
        onAddNote={() => {}}
        onDelete={handleDeleteLead}
        onServiceChange={() => fetchLeads(activePipeline?.id)}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        pipelines={pipelines}
        activePipelineId={activePipeline?.id}
        onPipelineChange={handlePipelineChange}
        onCreateWebsite={handleCreateWebsite}
        plan={plan}
        onShowUpgrade={(feature) => { setUpgradeFeature(feature); setShowUpgradeModal(true); }}
      />

      <Dialog open={showCreatePipeline} onOpenChange={setShowCreatePipeline}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {plan === "free" && pipelines.length >= 1 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 mb-1">
                  <FreeBadge>Free</FreeBadge>
                  <span className="font-semibold">Límite alcanzado (1/1)</span>
                </div>
                <p>Upgrade a Pro para crear pipelines ilimitados.</p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Nombre</label>
              <Input
                placeholder="Ej: Ventas Inbound"
                value={newPipelineName}
                onChange={e => setNewPipelineName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Categoría (opcional)</label>
              <Input
                placeholder="Ej: Comercial"
                value={newPipelineCategory}
                onChange={e => setNewPipelineCategory(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!newPipelineName.trim() || (plan === "free" && pipelines.length >= 1)}
              onClick={async () => {
                const headers = await getAuthHeaders();
                headers["Content-Type"] = "application/json";
                const res = await fetch("/api/pipelines", {
                  method: "POST", headers,
                  body: JSON.stringify({ name: newPipelineName.trim(), category: newPipelineCategory.trim() || null }),
                });
                if (res.ok) {
                  const p = await res.json();
                  setPipelines(prev => [...prev, p]);
                  setActivePipeline(p);
                  setShowCreatePipeline(false);
                  setNewPipelineName("");
                  setNewPipelineCategory("");
                } else {
                  const err = await res.json();
                  if (res.status === 403) {
                    setShowCreatePipeline(false);
                    setUpgradeFeature("Pipelines ilimitados");
                    setShowUpgradeModal(true);
                  } else {
                    toast.error(err.error || "No se pudo crear el pipeline. Intentá de nuevo.");
                  }
                }
              }}
            >
              Crear pipeline
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature={upgradeFeature} />
    </div>
  );
}

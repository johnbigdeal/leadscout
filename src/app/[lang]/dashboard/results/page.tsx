"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Phone, Globe, MapPin, Plus, Clock, Filter, X, Search, MessageCircle, Map, Mail, Download, ChevronLeft, ChevronRight, Crosshair, SlidersHorizontal, History } from "lucide-react";
import { BusinessCard, type Business } from "@/components/business-card";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-10.425c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

type SearchHistoryItem = {
  id: string; keywords: string; location: string; status: string; createdAt: string; businessCount: number;
};

type Filters = {
  minScore: number; hasWebsite: "all" | "yes" | "no"; hasPhone: boolean; hasWhatsapp: boolean;
  inCrm: "all" | "yes" | "no"; nameQuery: string;
};

type PipelineOption = { id: string; name: string; stages: string[] };
type CategoryOption = { id: string; name: string; color: string };

const defaultFilters: Filters = { minScore: 0, hasWebsite: "all", hasPhone: false, hasWhatsapp: false, inCrm: "all", nameQuery: "" };
const PER_PAGE_OPTIONS = [25, 50];

function getSocial(biz: Business, platform: string): string | null {
  return biz.socialProfiles?.find(s => s.platform === platform)?.url ?? null;
}

function exportCsv(businesses: Business[]) {
  const headers = ["Nombre", "Telefono", "Email", "Sitio Web", "Instagram", "LinkedIn", "Google Maps", "Direccion", "Categoria", "Calificacion", "Resenas", "Puntaje", "WhatsApp"];
  const rows = businesses.map(b => {
    const ig = getSocial(b, "instagram") ?? "";
    const li = getSocial(b, "linkedin") ?? "";
    const maps = b.placeId ? `https://www.google.com/maps/place/?q=place_id:${b.placeId}` : "";
    return [
      b.name ?? "", b.phone ?? "", b.email ?? "", b.website ?? "", ig, li, maps,
      b.address ?? "", b.category ?? "", b.rating ?? "", String(b.reviewsCount ?? ""),
      String(b.opportunityScore?.score ?? ""), b.isWhatsapp ? "Si" : "No",
    ];
  });
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leadscout_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsPage() {
  const t = useTranslations("search");
  const router = useRouter();
  const [results, setResults] = useState<Business[]>([]);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selected, setSelected] = useState<Business | null>(null);
  const [leadIds, setLeadIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(0);
  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addPipelineId, setAddPipelineId] = useState<string>("");
  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const initialLoadRef = useRef(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.minScore > 0) n++;
    if (filters.hasWebsite !== "all") n++;
    if (filters.hasPhone) n++;
    if (filters.hasWhatsapp) n++;
    if (filters.inCrm !== "all") n++;
    if (filters.nameQuery) n++;
    return n;
  }, [filters]);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    return headers;
  }

  const fetchResults = useCallback(async (id: string) => {
    setLoading(true);
    setSelectedIds(new Set());
    setCurrentPage(0);
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/searches/${id}/results`, { headers });
    if (res.ok) setResults(await res.json());
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/searches/list", { headers });
    if (res.ok) setHistory(await res.json());
  }, []);

  const fetchLeads = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/leads", { headers });
    if (res.ok) setLeadIds(new Set((await res.json()).map((l: { businessId: string }) => l.businessId)));
  }, []);

  const fetchPipelinesAndCategories = useCallback(async () => {
    const headers = await getAuthHeaders();
    const [pRes, cRes] = await Promise.all([
      fetch("/api/pipelines", { headers }),
      fetch("/api/lead-categories", { headers }),
    ]);
    if (pRes.ok) {
      const pData = await pRes.json();
      setPipelines(pData);
      if (pData.length > 0) setAddPipelineId(pData[0].id);
    }
    if (cRes.ok) setCategories(await cRes.json());
  }, []);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    fetchPipelinesAndCategories();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("searchId");
    if (id) { setSearchId(id); fetchResults(id); fetchLeads(); }
    else { setShowHistory(true); fetchHistory(); }
  }, []);

  async function handleAddToCrm(businessIds: string | string[], opts?: { pipelineId?: string; categoryId?: string }) {
    const ids = Array.isArray(businessIds) ? businessIds : [businessIds];
    if (ids.length === 0) return;
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const body: Record<string, unknown> = { businessIds: ids };
    if (opts?.pipelineId) body.pipelineId = opts.pipelineId;
    if (opts?.categoryId) body.categoryId = opts.categoryId;
    await fetch("/api/leads", { method: "POST", headers, body: JSON.stringify(body) });
    setLeadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    if (!Array.isArray(businessIds) && selected?.id === businessIds) {
      setSelected((prev) => prev ? { ...prev, isLead: true } : null);
    }
  }

  function openAddDialog(ids?: string[]) {
    if (ids && ids.length > 0) {
      setBatchIds(ids);
    } else {
      setBatchIds(Array.from(selectedIds).filter((id) => !leadIds.has(id)));
    }
    setShowAddDialog(true);
  }

  async function confirmBatchAdd() {
    setIsAdding(true);
    await handleAddToCrm(batchIds, { pipelineId: addPipelineId, categoryId: addCategoryId || undefined });
    setIsAdding(false);
    setShowAddDialog(false);
    setSelectedIds(new Set());
    setBatchIds([]);
  }

  function openCard(biz: Business & { id: string }) {
    setSelected({ ...biz, isLead: leadIds.has(biz.id) });
  }

  function loadSearch(id: string) {
    window.history.replaceState(null, "", `/dashboard/results?searchId=${id}`);
    setSearchId(id);
    setShowHistory(false);
    setFilters(defaultFilters);
    setCurrentPage(0);
    setSelectedIds(new Set());
    fetchResults(id);
    fetchLeads();
  }

  function newSearch() { router.push("/dashboard/search"); }

  const filtered = useMemo(() => {
    return results
      .filter((biz) => {
        const score = biz.opportunityScore?.score ?? 0;
        if (score < filters.minScore) return false;
        if (filters.hasWebsite === "yes" && !biz.hasWebsite) return false;
        if (filters.hasWebsite === "no" && biz.hasWebsite) return false;
        if (filters.hasPhone && !biz.phone) return false;
        if (filters.hasWhatsapp && !biz.isWhatsapp) return false;
        const inCrm = leadIds.has(biz.id);
        if (filters.inCrm === "yes" && !inCrm) return false;
        if (filters.inCrm === "no" && inCrm) return false;
        if (filters.nameQuery) {
          const q = filters.nameQuery.toLowerCase();
          if (!(biz.name || "").toLowerCase().includes(q) && !(biz.category || "").toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.opportunityScore?.score ?? 0) - (a.opportunityScore?.score ?? 0));
  }, [results, filters, leadIds]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice(currentPage * perPage, (currentPage + 1) * perPage);
  const allOnPageSelected = pageItems.length > 0 && pageItems.every(b => selectedIds.has(b.id));

  function toggleSelectAll() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageItems.forEach(b => allOnPageSelected ? next.delete(b.id) : next.add(b.id));
      return next;
    });
  }
  function toggleSelect(id: string) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function handleExport() {
    const sel = filtered.filter(b => selectedIds.has(b.id));
    exportCsv(sel.length > 0 ? sel : filtered);
  }
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">
            {searchId ? t("results") : t("history")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchId ? t("subtitle") : t("selectSearch")}
          </p>
        </div>
        <div className="flex gap-2">
          {searchId && (
            <Button variant="outline" size="sm" onClick={() => { setShowHistory(true); fetchHistory(); }}>
              <History className="mr-1.5 h-4 w-4" />
              {t("history")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={newSearch}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("backToSearch")}
          </Button>
        </div>
      </div>

      {showHistory && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <History className="h-12 w-12 text-zinc-300" />
              <p className="text-muted-foreground">{t("noHistory")}</p>
              <Button onClick={newSearch} size="sm" className="mt-2">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("backToSearch")}
              </Button>
            </div>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                onClick={() => loadSearch(h.id)}
                className="group flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-accent/30 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 group-hover:text-accent transition-colors">
                    {h.keywords} — {h.location}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{formatDate(h.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge className={h.status === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-600"}>
                    {h.status === "done" ? t("statusDone") : h.status}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    {h.businessCount} {t("businesses")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-accent transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {searchId && !showHistory && (
        <>
          {!loading && results.length > 0 && (
            <div className="mb-4 rounded-xl border border-zinc-200 bg-white">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  {t("filters")}
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary text-xs">{activeFilterCount}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setFilters(defaultFilters); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                      {t("clearFilters")}
                    </button>
                  )}
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showFilters ? "rotate-90" : ""}`} />
                </div>
              </button>
              {showFilters && (
                <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-4 py-3">
                  <div className="relative min-w-[180px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="text" placeholder={t("searchName")} value={filters.nameQuery}
                      onChange={(e) => updateFilter("nameQuery", e.target.value)} className="pl-8 h-9 text-sm" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("minScore")}</span>
                    <select value={filters.minScore} onChange={(e) => updateFilter("minScore", Number(e.target.value))}
                      className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs outline-none focus:border-primary">
                      <option value={0}>{t("all")}</option>
                      <option value={10}>10+</option>
                      <option value={20}>20+</option>
                      <option value={30}>30+</option>
                      <option value={40}>40+</option>
                      <option value={50}>50+</option>
                      <option value={60}>60+</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("website")}</span>
                    <select value={filters.hasWebsite} onChange={(e) => updateFilter("hasWebsite", e.target.value as Filters["hasWebsite"])}
                      className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs outline-none focus:border-primary">
                      <option value="all">{t("all")}</option>
                      <option value="yes">{t("hasWebsite")}</option>
                      <option value="no">{t("noWebsiteOnly")}</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={filters.hasPhone} onCheckedChange={(c) => updateFilter("hasPhone", c)} />
                    {t("hasPhone")}
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={filters.hasWhatsapp} onCheckedChange={(c) => updateFilter("hasWhatsapp", c)} />
                    {t("hasWhatsapp")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">CRM</span>
                    <select value={filters.inCrm} onChange={(e) => updateFilter("inCrm", e.target.value as Filters["inCrm"])}
                      className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs outline-none focus:border-primary">
                      <option value="all">{t("all")}</option>
                      <option value="yes">{t("inCrmOnly")}</option>
                      <option value="no">{t("notInCrm")}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("showingResults").replace("{count}", String(filtered.length)).replace("{total}", String(results.length))}
              </p>
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-sm font-medium text-foreground">{selectedIds.size} {t("selected")}</span>
                    <Button size="sm" onClick={() => openAddDialog()} className="h-8">
                      <Plus className="mr-1.5 h-4 w-4" />
                      Agregar seleccionados al CRM
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} className="h-8">
                  <Download className="mr-1.5 h-4 w-4" />
                  {t("export")}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Cargando resultados...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search className="h-12 w-12 text-zinc-300" />
              <p className="text-muted-foreground">{t("noResults")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead className="w-10">
                        <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                      <TableHead className="w-14 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("score")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("phone")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("email")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("website")}</TableHead>
                      <TableHead className="w-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("googleMaps")}</TableHead>
                      <TableHead className="w-16 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("social")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("address")}</TableHead>
                      <TableHead className="w-28"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((biz) => {
                      const ig = getSocial(biz, "instagram");
                      const li = getSocial(biz, "linkedin");
                      const score = biz.opportunityScore?.score ?? 0;
                      const highlight = selectedIds.has(biz.id);

                      return (
                        <TableRow key={biz.id}
                          className={`cursor-pointer transition-colors ${highlight ? "bg-accent/5" : "hover:bg-zinc-50"}`}
                          onClick={() => openCard(biz)}>
                          <TableCell className="p-3" onClick={(e) => { e.stopPropagation(); toggleSelect(biz.id); }}>
                            <Checkbox checked={highlight} onCheckedChange={() => toggleSelect(biz.id)} />
                          </TableCell>
                          <TableCell className="p-3">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                              score >= 50 ? "bg-emerald-50 text-emerald-700" :
                              score >= 30 ? "bg-amber-50 text-amber-700" :
                              score > 0 ? "bg-zinc-50 text-zinc-600" :
                              "bg-zinc-100 text-zinc-400"
                            }`}>
                              {score || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 font-medium text-foreground">
                            <span className="block max-w-[180px] truncate">{biz.name}</span>
                            {biz.category && <span className="text-xs text-muted-foreground">{biz.category}</span>}
                          </TableCell>
                          <TableCell className="p-3">
                            {biz.phone ? (
                              <span className="flex items-center gap-1 text-sm text-foreground/80">
                                <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">{biz.phone}</span>
                                {biz.isWhatsapp && <MessageCircle className="h-3 w-3 shrink-0 text-emerald-500" />}
                              </span>
                            ) : <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="p-3">
                            {biz.email ? (
                              <a href={`mailto:${biz.email}`} onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-sm text-accent hover:text-accent/80">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="max-w-[120px] truncate">{biz.email}</span>
                              </a>
                            ) : <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="p-3">
                            {biz.website ? (
                              <a href={biz.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-sm text-accent hover:text-accent/80">
                                <Globe className="h-3 w-3 shrink-0" />
                                <span className="max-w-[120px] truncate">{biz.website.replace(/^https?:\/\//, "")}</span>
                              </a>
                            ) : <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="p-3">
                            {biz.placeId ? (
                              <a href={`https://www.google.com/maps/place/?q=place_id:${biz.placeId}`}
                                target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                title={t("viewOnMaps")} className="flex items-center text-accent hover:text-accent/80">
                                <Map className="h-3.5 w-3.5" />
                              </a>
                            ) : <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="flex items-center gap-1">
                              {ig ? (
                                <a href={ig} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  title="Instagram" className="text-pink-500 hover:text-pink-600">
                                  <InstagramIcon className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                              {li ? (
                                <a href={li} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  title="LinkedIn" className="text-blue-700 hover:text-blue-800">
                                  <LinkedInIcon className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                              {!ig && !li && <span className="text-zinc-300">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 max-w-[180px]">
                            {biz.address ? (
                              <span className="flex items-center gap-1 text-sm text-foreground/60">
                                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="truncate">{biz.address}</span>
                              </span>
                            ) : <span className="text-zinc-300">—</span>}
                          </TableCell>
                          <TableCell className="p-3">
                            {!leadIds.has(biz.id) ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5"
                                onClick={(e) => { e.stopPropagation(); openAddDialog([biz.id]); }}>
                                <Plus className="mr-1 h-3 w-3" />
                                {t("addToCrm")}
                              </Button>
                            ) : (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                                {t("addedToCrm")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("perPage")}</span>
                  <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(0); }}
                    className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs outline-none focus:border-primary">
                    {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-xs">{t("page")} {currentPage + 1} {t("of")} {totalPages || 1}</span>
                  <Button variant="outline" size="sm" disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="font-display text-lg">{t("contactInfo")}</DialogTitle>
          </DialogHeader>
          {selected && <BusinessCard business={selected} onAddToCrm={(id) => handleAddToCrm(id)} />}
        </DialogContent>
      </Dialog>

      {/* Batch add to CRM dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar al CRM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Vas a agregar <strong>{batchIds.length}</strong> negocio{batchIds.length !== 1 ? "s" : ""} al CRM.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Pipeline
              </label>
              <select
                value={addPipelineId}
                onChange={(e) => setAddPipelineId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Categoría (opcional)
              </label>
              <select
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)} disabled={isAdding}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={confirmBatchAdd} disabled={isAdding || batchIds.length === 0}>
                {isAdding ? "Agregando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

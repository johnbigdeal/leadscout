"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Pencil, Trash2, Video, FileText, File as FileIcon,
  Lock, ChevronDown, ChevronRight, ArrowUp, ArrowDown, ExternalLink,
} from "lucide-react";
import { RichText } from "@/components/trainings/RichText";
import { VideoEmbed } from "@/components/trainings/VideoEmbed";
import { SectionFormDialog } from "@/components/trainings/SectionFormDialog";
import { LessonFormDialog } from "@/components/trainings/LessonFormDialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import {
  fetchTrainings, deleteSection, deleteLesson, updateSection, updateLesson,
  type Section, type Lesson, type TrainingsResponse,
} from "@/lib/trainings/client";

function lessonIcon(type: string) {
  if (type === "video") return <Video className="h-3.5 w-3.5" />;
  if (type === "pdf") return <FileIcon className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export default function TrainingsPage() {
  const [data, setData] = useState<TrainingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Lesson | null>(null);

  const [sectionDialog, setSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [lessonDialog, setLessonDialog] = useState(false);
  const [lessonSectionId, setLessonSectionId] = useState<string>("");
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchTrainings();
      setData(res);
      setExpanded((prev) => (prev.size ? prev : new Set(res.sections.filter((s) => !s.locked).map((s) => s.id))));
    } catch {
      toast.error("No se pudieron cargar los entrenamientos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canEdit = data?.canEdit ?? false;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openNewSection() { setEditingSection(null); setSectionDialog(true); }
  function openEditSection(s: Section) { setEditingSection(s); setSectionDialog(true); }
  function openNewLesson(sectionId: string) { setLessonSectionId(sectionId); setEditingLesson(null); setLessonDialog(true); }
  function openEditLesson(sectionId: string, l: Lesson) { setLessonSectionId(sectionId); setEditingLesson(l); setLessonDialog(true); }

  async function removeSection(s: Section) {
    if (!confirm(`¿Eliminar la sección "${s.title}" y sus lecciones?`)) return;
    try { await deleteSection(s.id); toast.success("Sección eliminada"); if (selected && s.lessons.some((l) => l.id === selected.id)) setSelected(null); load(); }
    catch { toast.error("Error al eliminar."); }
  }
  async function removeLesson(l: Lesson) {
    if (!confirm(`¿Eliminar la lección "${l.title}"?`)) return;
    try { await deleteLesson(l.id); toast.success("Lección eliminada"); if (selected?.id === l.id) setSelected(null); load(); }
    catch { toast.error("Error al eliminar."); }
  }

  async function moveSection(idx: number, dir: -1 | 1) {
    if (!data) return;
    const list = data.sections;
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    try { await Promise.all([updateSection(a.id, { order: b.order }), updateSection(b.id, { order: a.order })]); load(); }
    catch { toast.error("Error al reordenar."); }
  }
  async function moveLesson(section: Section, idx: number, dir: -1 | 1) {
    const list = section.lessons;
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    try { await Promise.all([updateLesson(a.id, { order: b.order }), updateLesson(b.id, { order: a.order })]); load(); }
    catch { toast.error("Error al reordenar."); }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl tracking-tight text-foreground">Entrenamientos</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Aprende a sacarle el máximo a LeadScout</p>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openNewSection}><Plus className="mr-1.5 h-4 w-4" />Nueva sección</Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-20 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Cargando...
        </div>
      ) : !data || data.sections.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <GraduationCap className="h-10 w-10 text-zinc-300" />
          <p className="text-muted-foreground">Todavía no hay entrenamientos.</p>
          {canEdit && <Button size="sm" variant="outline" className="mt-2" onClick={openNewSection}>Crear la primera sección</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Panel izquierdo: secciones + lecciones */}
          <div className="space-y-3">
            {data.sections.map((s, si) => (
              <div key={s.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => (s.locked ? setUpgrade(true) : toggle(s.id))}
                  >
                    {s.locked ? <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                      : expanded.has(s.id) ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />}
                    <span className="flex-1 text-sm font-semibold text-foreground">{s.title}</span>
                    <Badge variant="outline" className={s.accessLevel === "pro"
                      ? "border-amber-200 bg-amber-50 text-amber-700 text-[10px]"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]"}>
                      {s.accessLevel === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </button>
                  {canEdit && (
                    <div className="flex items-center gap-0.5">
                      <button title="Subir" className="rounded p-1 text-zinc-400 hover:text-zinc-700" onClick={() => moveSection(si, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button title="Bajar" className="rounded p-1 text-zinc-400 hover:text-zinc-700" onClick={() => moveSection(si, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button title="Editar" className="rounded p-1 text-zinc-400 hover:text-primary" onClick={() => openEditSection(s)}><Pencil className="h-3.5 w-3.5" /></button>
                      <button title="Eliminar" className="rounded p-1 text-zinc-400 hover:text-red-600" onClick={() => removeSection(s)}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>

                {s.locked ? (
                  <div className="border-t border-zinc-100 px-3 py-3 text-xs text-zinc-500">
                    {s.lessonCount} lección{s.lessonCount !== 1 ? "es" : ""} · <button className="text-primary hover:underline" onClick={() => setUpgrade(true)}>Desbloquear con Pro</button>
                  </div>
                ) : expanded.has(s.id) && (
                  <div className="border-t border-zinc-100">
                    {s.lessons.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-zinc-400">Sin lecciones todavía.</p>
                    ) : s.lessons.map((l, li) => (
                      <div key={l.id} className={`flex items-center gap-2 px-3 py-2 ${selected?.id === l.id ? "bg-primary/5" : "hover:bg-zinc-50"}`}>
                        <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setSelected(l)}>
                          <span className="text-zinc-400">{lessonIcon(l.type)}</span>
                          <span className={`text-sm ${selected?.id === l.id ? "font-medium text-primary" : "text-zinc-700"}`}>{l.title}</span>
                        </button>
                        {canEdit && (
                          <div className="flex items-center gap-0.5">
                            <button title="Subir" className="rounded p-1 text-zinc-400 hover:text-zinc-700" onClick={() => moveLesson(s, li, -1)}><ArrowUp className="h-3 w-3" /></button>
                            <button title="Bajar" className="rounded p-1 text-zinc-400 hover:text-zinc-700" onClick={() => moveLesson(s, li, 1)}><ArrowDown className="h-3 w-3" /></button>
                            <button title="Editar" className="rounded p-1 text-zinc-400 hover:text-primary" onClick={() => openEditLesson(s.id, l)}><Pencil className="h-3 w-3" /></button>
                            <button title="Eliminar" className="rounded p-1 text-zinc-400 hover:text-red-600" onClick={() => removeLesson(l)}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <button className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5" onClick={() => openNewLesson(s.id)}>
                        <Plus className="h-3.5 w-3.5" />Agregar lección
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Panel derecho: visor */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 lg:p-6">
            {!selected ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <GraduationCap className="h-10 w-10 text-zinc-200" />
                <p className="text-sm">Seleccioná una lección para empezar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-display text-xl text-foreground">{selected.title}</h2>
                {selected.type === "video" && selected.embedUrl && (
                  <VideoEmbed embedUrl={selected.embedUrl} aspectRatio={selected.aspectRatio} />
                )}
                {selected.type === "pdf" && selected.fileUrl && (
                  <div className="space-y-2">
                    <iframe src={selected.fileUrl} className="h-[70vh] w-full rounded-lg border border-zinc-200" title={selected.title} />
                    <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" />Abrir / descargar PDF
                    </a>
                  </div>
                )}
                <RichText html={selected.content} />
              </div>
            )}
          </div>
        </div>
      )}

      <SectionFormDialog
        key={editingSection?.id ?? "new-section"}
        open={sectionDialog}
        onOpenChange={setSectionDialog}
        section={editingSection}
        onSaved={load}
      />
      <LessonFormDialog
        key={editingLesson?.id ?? `new-lesson-${lessonSectionId}`}
        open={lessonDialog}
        onOpenChange={setLessonDialog}
        sectionId={lessonSectionId}
        lesson={editingLesson}
        onSaved={load}
      />
      <UpgradeModal open={upgrade} onClose={() => setUpgrade(false)} feature="Este entrenamiento" />
    </div>
  );
}

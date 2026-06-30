"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { createLesson, updateLesson, uploadFile, type Lesson } from "@/lib/trainings/client";
import { parseEmbed } from "@/lib/trainings/embed";

type LessonType = "video" | "text" | "pdf";

export function LessonFormDialog({
  open, onOpenChange, sectionId, lesson, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sectionId: string;
  lesson?: Lesson | null;
  onSaved: () => void;
}) {
  const editing = !!lesson;
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [type, setType] = useState<LessonType>((lesson?.type as LessonType) ?? "video");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [embedInput, setEmbedInput] = useState(lesson?.embedUrl ?? "");
  const [fileUrl, setFileUrl] = useState(lesson?.fileUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFileUrl(url);
      toast.success("Archivo subido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!title.trim() || saving) return;
    if (type === "video" && !embedInput.trim()) { toast.error("Pegá el iframe o la URL del video"); return; }
    if (type === "pdf" && !fileUrl) { toast.error("Subí un PDF"); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { sectionId, title: title.trim(), type, content };
      if (type === "video") {
        const { embedUrl, aspectRatio } = parseEmbed(embedInput);
        if (!embedUrl) { toast.error("No se pudo leer la URL del video"); setSaving(false); return; }
        payload.embedUrl = embedUrl;
        // conserva el aspect ratio previo si el input era solo URL (sin aspect-ratio)
        payload.aspectRatio = /aspect-ratio/i.test(embedInput) ? aspectRatio : (lesson?.aspectRatio || aspectRatio);
      }
      if (type === "pdf") payload.fileUrl = fileUrl;

      if (editing) await updateLesson(lesson!.id, payload);
      else await createLesson(payload);

      toast.success(editing ? "Lección actualizada" : "Lección creada");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lección" : "Nueva lección"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Cómo buscar leads" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LessonType)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="video">Video</option>
              <option value="text">Texto</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          {type === "video" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Iframe o URL del video</label>
              <textarea
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
                placeholder='Pegá el <iframe ...> de KOMMODO o la URL del embed'
                rows={4}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {type === "pdf" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Documento PDF</label>
              <input type="file" accept="application/pdf" onChange={handleFile} className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-primary" />
              {uploading && <p className="mt-1 text-xs text-zinc-500">Subiendo...</p>}
              {fileUrl && !uploading && <p className="mt-1 text-xs text-emerald-600 truncate">Archivo cargado ✓</p>}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {type === "text" ? "Contenido" : "Descripción (opcional)"}
            </label>
            <RichTextEditor value={content} onChange={setContent} placeholder="Escribe aquí..." />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1" onClick={save} disabled={saving || !title.trim()}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

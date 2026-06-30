"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { createSection, updateSection, type Section } from "@/lib/trainings/client";

export function SectionFormDialog({
  open, onOpenChange, section, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  section?: Section | null;
  onSaved: () => void;
}) {
  const editing = !!section;
  const [title, setTitle] = useState(section?.title ?? "");
  const [accessLevel, setAccessLevel] = useState(section?.accessLevel ?? "free");
  const [description, setDescription] = useState(section?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateSection(section!.id, { title: title.trim(), accessLevel, description });
      } else {
        await createSection({ title: title.trim(), accessLevel, description });
      }
      toast.success(editing ? "Sección actualizada" : "Sección creada");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar sección" : "Nueva sección"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Primeros pasos" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Acceso</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as "free" | "pro")}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="free">Free (todos)</option>
              <option value="pro">Pro (solo plan Pro)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Descripción (opcional)</label>
            <RichTextEditor value={description} onChange={setDescription} placeholder="Descripción de la sección" />
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

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createIdea, type Idea } from "@/lib/roadmap/client";
import { IDEA_TITLE_MAX, IDEA_DESCRIPTION_MAX } from "@/lib/roadmap/constants";

export function AddIdeaModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (idea: Idea) => void;
}) {
  const t = useTranslations("roadmap");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const idea = await createIdea({ title: title.trim(), description: description.trim() });
      toast.success(t("createdSuccess"));
      onCreated(idea);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("createError"));
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("modalTitle")}</DialogTitle>
          <DialogDescription>{t("modalDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="idea-title" className="text-sm font-medium text-zinc-700">
              {t("fieldTitle")}
            </label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              maxLength={IDEA_TITLE_MAX}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="idea-description" className="text-sm font-medium text-zinc-700">
              {t("fieldDescription")}
            </label>
            <textarea
              id="idea-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fieldDescriptionPlaceholder")}
              maxLength={IDEA_DESCRIPTION_MAX}
              rows={4}
              className="flex min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!title.trim() || submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

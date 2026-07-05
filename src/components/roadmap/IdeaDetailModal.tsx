"use client";

import { useTranslations } from "next-intl";
import { ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RoadmapStatus } from "@/lib/roadmap/constants";
import type { Idea } from "@/lib/roadmap/client";

/* Punto de color por estado (espejo de COLUMN_DOT del board). */
const STATUS_DOT: Record<RoadmapStatus, string> = {
  proposed: "bg-accent",
  considering: "bg-amber-400",
  in_progress: "bg-emerald-400",
};

/**
 * Modal de solo lectura para ver el contenido completo de una idea (título y
 * descripción sin truncar). Permite votar desde adentro reutilizando onVote.
 * Abierto cuando `idea` no es null; el board mantiene la idea en sync con la
 * lista para que el contador de votos se actualice en vivo.
 */
export function IdeaDetailModal({
  idea,
  onOpenChange,
  onVote,
}: {
  idea: Idea | null;
  onOpenChange: (open: boolean) => void;
  onVote: (idea: Idea) => void;
}) {
  const t = useTranslations("roadmap");

  return (
    <Dialog open={idea !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {idea && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[idea.status]}`} />
                {t(idea.status)}
              </div>
              <DialogTitle className="text-base leading-snug">{idea.title}</DialogTitle>
            </DialogHeader>

            {idea.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {idea.description}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 italic">{t("noDescription")}</p>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <span className="text-xs text-zinc-400">
                {t("by")} {idea.authorName}
              </span>
              <button
                type="button"
                onClick={() => onVote(idea)}
                aria-pressed={idea.hasVoted}
                aria-label={idea.hasVoted ? t("voted") : t("vote")}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  idea.hasVoted
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-zinc-200 text-zinc-600 hover:border-accent/50 hover:text-accent"
                }`}
              >
                <ChevronUp className="size-4" />
                <span className="tabular-nums">{idea.voteCount}</span>
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

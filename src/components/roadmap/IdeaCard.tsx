"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { ChevronUp, GripVertical, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ROADMAP_STATUSES, type RoadmapStatus } from "@/lib/roadmap/constants";
import type { Idea } from "@/lib/roadmap/client";

/* Color del borde superior por estado (espejo del patrón STAGE_META del CRM). */
const STATUS_BORDER: Record<RoadmapStatus, string> = {
  proposed: "border-t-accent/40",
  considering: "border-t-amber-400/50",
  in_progress: "border-t-emerald-400/50",
  completed: "border-t-blue-400/50",
};

export function IdeaCard({
  idea,
  isAdmin,
  onVote,
  onOpenDetail,
  onChangeStatus,
  onDelete,
}: {
  idea: Idea;
  isAdmin: boolean;
  onVote: (idea: Idea) => void;
  onOpenDetail: (idea: Idea) => void;
  onChangeStatus: (idea: Idea, status: RoadmapStatus) => void;
  onDelete: (idea: Idea) => void;
}) {
  const t = useTranslations("roadmap");
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: idea.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-t-4 border-zinc-200 bg-white p-3.5 shadow-sm ${STATUS_BORDER[idea.status]}`}
    >
      <div className="flex items-start gap-3">
        {/* Botón de voto */}
        <button
          type="button"
          onClick={() => onVote(idea)}
          aria-pressed={idea.hasVoted}
          aria-label={idea.hasVoted ? t("voted") : t("vote")}
          className={`flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 transition-colors ${
            idea.hasVoted
              ? "border-accent bg-accent/10 text-accent"
              : "border-zinc-200 text-zinc-500 hover:border-accent/50 hover:text-accent"
          }`}
        >
          <ChevronUp className="size-4" />
          <span className="text-sm font-bold tabular-nums">{idea.voteCount}</span>
        </button>

        {/* Contenido — clicable para abrir el detalle completo */}
        <div
          className="group min-w-0 flex-1 cursor-pointer text-left"
          role="button"
          tabIndex={0}
          aria-label={t("viewDetails")}
          onClick={() => onOpenDetail(idea)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenDetail(idea);
            }
          }}
        >
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors group-hover:text-accent">
            {idea.title}
          </h3>
          {idea.description && (
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-zinc-500">
              {idea.description}
            </p>
          )}
          <p className="mt-2 text-[0.7rem] text-zinc-400">
            {t("by")} {idea.authorName}
          </p>
        </div>

        {/* Controles de admin */}
        {isAdmin && (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
              aria-label="Arrastrar"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label={t("changeStatus")}
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={idea.status}
                  onValueChange={(v) => onChangeStatus(idea, v as RoadmapStatus)}
                >
                  {ROADMAP_STATUSES.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {t(s)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(idea)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  {t("deleteIdea")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Loader2, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IdeaCard } from "@/components/roadmap/IdeaCard";
import { AddIdeaModal } from "@/components/roadmap/AddIdeaModal";
import { IdeaDetailModal } from "@/components/roadmap/IdeaDetailModal";
import { ROADMAP_STATUSES, type RoadmapStatus } from "@/lib/roadmap/constants";
import {
  fetchIdeas,
  voteIdea,
  unvoteIdea,
  updateIdeaStatus,
  deleteIdea,
  type Idea,
} from "@/lib/roadmap/client";

/* Punto del encabezado de columna, por estado. */
const COLUMN_DOT: Record<RoadmapStatus, string> = {
  proposed: "bg-accent",
  considering: "bg-amber-400",
  in_progress: "bg-emerald-400",
  completed: "bg-blue-500",
};

function LoginPromptModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("roadmap");
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("loginTitle")}</DialogTitle>
          <DialogDescription>{t("loginDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loginCancel")}
          </Button>
          <Button onClick={() => router.push("/auth/sign-in")}>{t("loginCta")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KanbanColumn({
  status,
  ideas,
  isAdmin,
  onVote,
  onOpenDetail,
  onChangeStatus,
  onDelete,
}: {
  status: RoadmapStatus;
  ideas: Idea[];
  isAdmin: boolean;
  onVote: (idea: Idea) => void;
  onOpenDetail: (idea: Idea) => void;
  onChangeStatus: (idea: Idea, status: RoadmapStatus) => void;
  onDelete: (idea: Idea) => void;
}) {
  const t = useTranslations("roadmap");
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <div className="flex w-full shrink-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50/80 sm:w-80">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
          <h2 className="text-sm font-semibold text-zinc-700">{t(status)}</h2>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-200 px-1.5 text-xs font-semibold text-zinc-600">
          {ideas.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 p-3 transition-colors ${isOver ? "bg-accent/5" : ""}`}
      >
        <SortableContext items={ideas.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {ideas.length === 0 ? (
            <p className="px-1 py-8 text-center text-xs text-zinc-400">{t("emptyColumn")}</p>
          ) : (
            ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                isAdmin={isAdmin}
                onVote={onVote}
                onOpenDetail={onOpenDetail}
                onChangeStatus={onChangeStatus}
                onDelete={onDelete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function RoadmapBoard({
  currentUserId,
  isAdmin,
}: {
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const t = useTranslations("roadmap");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeIdea, setActiveIdea] = useState<Idea | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  /* Idea del detalle, derivada de la lista para que los votos se vean en vivo. */
  const detailIdea = detailId ? ideas.find((i) => i.id === detailId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setIdeas(await fetchIdeas());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function requireLogin(): boolean {
    if (!currentUserId) {
      setDetailId(null);
      setLoginOpen(true);
      return false;
    }
    return true;
  }

  /* Votar / quitar voto con actualización optimista y rollback. */
  async function handleVote(idea: Idea) {
    if (!requireLogin()) return;
    const willVote = !idea.hasVoted;
    const prev = ideas;
    setIdeas((list) =>
      list.map((i) =>
        i.id === idea.id
          ? { ...i, hasVoted: willVote, voteCount: i.voteCount + (willVote ? 1 : -1) }
          : i,
      ),
    );
    try {
      const res = willVote ? await voteIdea(idea.id) : await unvoteIdea(idea.id);
      setIdeas((list) =>
        list.map((i) =>
          i.id === idea.id
            ? { ...i, voteCount: res.voteCount, status: res.status, hasVoted: res.hasVoted }
            : i,
        ),
      );
    } catch {
      toast.error(t("voteError"));
      setIdeas(prev);
    }
  }

  /* Cambio de estado (admin) vía dropdown. */
  async function handleChangeStatus(idea: Idea, status: RoadmapStatus) {
    if (status === idea.status) return;
    const prev = ideas;
    setIdeas((list) => list.map((i) => (i.id === idea.id ? { ...i, status } : i)));
    try {
      await updateIdeaStatus(idea.id, status);
    } catch {
      toast.error(t("statusError"));
      setIdeas(prev);
    }
  }

  /* Eliminar idea (admin). */
  async function handleDelete(idea: Idea) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const prev = ideas;
    setIdeas((list) => list.filter((i) => i.id !== idea.id));
    try {
      await deleteIdea(idea.id);
      toast.success(t("deleteSuccess"));
    } catch {
      toast.error(t("deleteError"));
      setIdeas(prev);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveIdea(ideas.find((i) => i.id === event.active.id) ?? null);
  }

  /* Drag-and-drop (admin, escritorio): mover idea a otra columna. */
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveIdea(null);
    if (!over) return;

    const idea = ideas.find((i) => i.id === active.id);
    if (!idea) return;

    let newStatus: RoadmapStatus | null = null;
    const overIdea = ideas.find((i) => i.id === over.id);
    if (overIdea) newStatus = overIdea.status;
    else {
      const match = String(over.id).match(/^column-(.+)$/);
      if (match && ROADMAP_STATUSES.includes(match[1] as RoadmapStatus)) {
        newStatus = match[1] as RoadmapStatus;
      }
    }

    if (!newStatus || newStatus === idea.status) return;
    await handleChangeStatus(idea, newStatus);
  }

  function handleAddClick() {
    if (!requireLogin()) return;
    setAddOpen(true);
  }

  const byStatus = (status: RoadmapStatus) => ideas.filter((i) => i.status === status);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
            <Lightbulb className="size-6 text-accent" />
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">{t("subtitle")}</p>
        </div>
        <Button onClick={handleAddClick} className="shrink-0">
          <Plus className="size-4" />
          {t("addIdea")}
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-sm text-zinc-500">{t("loadError")}</p>
          <Button variant="outline" onClick={load}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 gap-4 sm:flex sm:overflow-x-auto sm:pb-4">
            {ROADMAP_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                ideas={byStatus(status)}
                isAdmin={isAdmin}
                onVote={handleVote}
                onOpenDetail={(idea) => setDetailId(idea.id)}
                onChangeStatus={handleChangeStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>
          <DragOverlay>
            {activeIdea && (
              <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xl">
                <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
                  {activeIdea.title}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AddIdeaModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(idea) => setIdeas((list) => [idea, ...list])}
      />
      <LoginPromptModal open={loginOpen} onOpenChange={setLoginOpen} />
      <IdeaDetailModal
        idea={detailIdea}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onVote={handleVote}
      />
    </div>
  );
}

/* =========================================================================
   ROADMAP — constantes compartidas (fuente única de verdad)
   Usadas por la validación en las API routes y por las columnas de la UI.
   ========================================================================= */

/** Estados/columnas del roadmap, en orden de progreso. */
export const ROADMAP_STATUSES = ["proposed", "considering", "in_progress", "completed"] as const;

export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export function isRoadmapStatus(v: unknown): v is RoadmapStatus {
  return typeof v === "string" && (ROADMAP_STATUSES as readonly string[]).includes(v);
}

/** Votos necesarios para que una idea "proposed" pase a "considering". */
export const VOTE_PROMOTE_THRESHOLD = 10;

/** Límites de longitud para crear ideas. */
export const IDEA_TITLE_MAX = 120;
export const IDEA_DESCRIPTION_MAX = 1000;

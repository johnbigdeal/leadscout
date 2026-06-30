/**
 * Match de un negocio a un pipeline según su categoría.
 * Usado tanto en el frontend (results page) como en el backend (POST /api/leads)
 * para tener una sola fuente de verdad sobre cómo se enruta un negocio.
 */

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export type PipelineLite = {
  id: string;
  name: string;
  category: string | null;
  isDefault?: boolean;
};

/**
 * Devuelve el primer pipeline cuyo `category` o `name` coincida (sin distinguir
 * mayúsculas/espacios) con la categoría del negocio. `null` si no hay match.
 */
export function matchPipeline(
  bizCategory: string | null | undefined,
  pipelines: PipelineLite[],
): PipelineLite | null {
  const c = norm(bizCategory);
  if (!c) return null;
  return pipelines.find((p) => norm(p.category) === c || norm(p.name) === c) ?? null;
}

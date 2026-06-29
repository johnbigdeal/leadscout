/**
 * Señal de oportunidad de reputación a partir del rating y la cantidad de
 * reseñas de Google que ya capturamos (businesses.rating / reviewsCount).
 * Devuelve un texto corto de venta cuando el negocio es buen candidato
 * (sin reseñas, pocas reseñas, o rating mejorable), o null si su reputación
 * es sólida. Alineado con el opportunity score (rating 3.0–4.2, <15 reseñas).
 */
export type ReviewsInsight = { label: string; tone: "warn" } | null;

export function reviewsInsight(
  rating?: number | string | null,
  count?: number | null,
): ReviewsInsight {
  const r = rating === null || rating === undefined || rating === "" ? null : Number(rating);
  const n = count === null || count === undefined ? null : Number(count);

  if (n === null || n === 0) {
    return { label: "Sin reseñas — oportunidad de reputación", tone: "warn" };
  }
  if (n < 15) {
    return { label: `Solo ${n} reseña${n === 1 ? "" : "s"} — oportunidad`, tone: "warn" };
  }
  if (r !== null && !Number.isNaN(r) && r >= 3.0 && r <= 4.2) {
    return { label: `Rating ${r.toFixed(1)} — margen de mejora`, tone: "warn" };
  }
  return null;
}

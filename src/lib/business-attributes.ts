/**
 * Atributos de identidad del negocio derivados del scraping de Google Maps.
 *
 * El actor de Apify `compass/crawler-google-places` devuelve estos atributos
 * dentro de `additionalInfo`, un objeto cuyos valores son arrays de
 * `{ [etiqueta]: boolean }`. Ejemplo:
 *
 *   additionalInfo: {
 *     "From the business": [
 *       { "Identifies as Latino-owned": true },
 *       { "Identifies as women-owned": false }
 *     ],
 *     ...
 *   }
 *
 * El JSON completo del scraping se guarda en `businesses.rawJson`, así que esto
 * funciona retroactivamente sobre leads ya scrapeados, sin tocar la DB.
 */

export type IdentityBadge = {
  key: string;
  label: string;
  /** Clases Tailwind para el badge (border/bg/text). */
  className: string;
};

type IdentityConfig = IdentityBadge & {
  /** Token de identidad a buscar en la etiqueta (ES/EN). */
  regex: RegExp;
  /** Si true, la etiqueta además debe indicar propiedad/identificación (evita
   *  falsos positivos como "Baños para mujeres" o "Estacionamiento accesible"). */
  requireOwnership: boolean;
};

/** La etiqueta describe propiedad/identidad del negocio, no una amenidad. */
function isOwnershipLabel(label: string): boolean {
  return /owned|identif|propiet|propiedad|lidera|dirigid/i.test(label);
}

/* Etiquetas de Google Maps ("From the business" / "Información de la empresa"). */
const IDENTITY_ATTRIBUTES: IdentityConfig[] = [
  { key: "latino", label: "Negocio latino", regex: /latin/i, requireOwnership: false, className: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "women", label: "Liderado por mujeres", regex: /women|mujer|femenin/i, requireOwnership: true, className: "border-rose-200 bg-rose-50 text-rose-700" },
  { key: "veteran", label: "Negocio de veteranos", regex: /veteran/i, requireOwnership: false, className: "border-sky-200 bg-sky-50 text-sky-700" },
  { key: "lgbtq", label: "LGBTQ+ friendly", regex: /lgbtq/i, requireOwnership: false, className: "border-violet-200 bg-violet-50 text-violet-700" },
  { key: "black", label: "Negocio afrodescendiente", regex: /black|afro/i, requireOwnership: true, className: "border-stone-300 bg-stone-100 text-stone-700" },
  { key: "asian", label: "Negocio asiático", regex: /asian|asiátic/i, requireOwnership: true, className: "border-teal-200 bg-teal-50 text-teal-700" },
  { key: "disabled", label: "Propiedad de personas con discapacidad", regex: /disabled|discapacidad/i, requireOwnership: true, className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
];

/** Recorre las etiquetas activas (value === true) de `additionalInfo`. */
function forEachActiveLabel(rawJson: unknown, fn: (label: string) => void): void {
  if (!rawJson || typeof rawJson !== "object") return;
  const info = (rawJson as Record<string, unknown>).additionalInfo;
  if (!info || typeof info !== "object") return;

  // Los grupos pueden venir como objeto { grupo: entradas[] } o directamente como array.
  const groups = Array.isArray(info) ? info : Object.values(info);
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const entry of group) {
      if (!entry || typeof entry !== "object") continue;
      for (const [label, value] of Object.entries(entry as Record<string, unknown>)) {
        if (value === true) fn(label);
      }
    }
  }
}

/**
 * Devuelve los badges de identidad presentes en el negocio (latino, mujeres,
 * veteranos, LGBTQ+, etc.), leyendo `additionalInfo` del scraping.
 */
export function getIdentityBadges(rawJson: unknown): IdentityBadge[] {
  const found = new Map<string, IdentityBadge>();
  forEachActiveLabel(rawJson, (label) => {
    const ownership = isOwnershipLabel(label);
    for (const attr of IDENTITY_ATTRIBUTES) {
      if (found.has(attr.key)) continue;
      if (attr.requireOwnership && !ownership) continue;
      if (attr.regex.test(label)) {
        found.set(attr.key, { key: attr.key, label: attr.label, className: attr.className });
      }
    }
  });
  // Orden estable según IDENTITY_ATTRIBUTES.
  return IDENTITY_ATTRIBUTES.filter((a) => found.has(a.key)).map((a) => found.get(a.key)!);
}

/** ¿El negocio se identifica como de propietarios latinos? (atajo). */
export function isLatinoOwned(rawJson: unknown): boolean {
  return getIdentityBadges(rawJson).some((b) => b.key === "latino");
}

/**
 * ¿La ficha de Google del negocio está SIN reclamar? El actor de Apify devuelve
 * `claimThisBusiness: true` cuando Google ofrece "¿Es tuyo este negocio?" — es
 * decir, el dueño no gestiona la ficha (señal fuerte de oportunidad). El campo es
 * top-level del item, no vive dentro de `additionalInfo`.
 */
export function isGmbUnclaimed(rawJson: unknown): boolean {
  if (!rawJson || typeof rawJson !== "object") return false;
  return (rawJson as Record<string, unknown>).claimThisBusiness === true;
}

/** Badge "Google sin reclamar" (o null) — mismo shape que getIdentityBadges. */
export function getGmbUnclaimedBadge(rawJson: unknown): IdentityBadge | null {
  return isGmbUnclaimed(rawJson)
    ? { key: "gmb-unclaimed", label: "Google sin reclamar", className: "border-orange-200 bg-orange-50 text-orange-700" }
    : null;
}

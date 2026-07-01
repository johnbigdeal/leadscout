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

/** Recorre `additionalInfo` y devuelve true si alguna etiqueta activa matchea el regex. */
function hasActiveAttribute(rawJson: unknown, labelRegex: RegExp): boolean {
  if (!rawJson || typeof rawJson !== "object") return false;
  const info = (rawJson as Record<string, unknown>).additionalInfo;
  if (!info || typeof info !== "object") return false;

  // Los grupos pueden venir como objeto { grupo: entradas[] } o directamente como array.
  const groups = Array.isArray(info) ? info : Object.values(info);

  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const entry of group) {
      if (!entry || typeof entry !== "object") continue;
      for (const [label, value] of Object.entries(entry as Record<string, unknown>)) {
        if (value === true && labelRegex.test(label)) return true;
      }
    }
  }
  return false;
}

/**
 * ¿El negocio se identifica como de propietarios latinos?
 * Cubre etiquetas en inglés ("Identifies as Latino-owned") y español
 * ("Se identifica como empresa latina") porque ambas contienen "latin".
 * Solo escanea `additionalInfo`, así que la categoría (p. ej. "Latin American
 * restaurant") no genera falsos positivos.
 */
export function isLatinoOwned(rawJson: unknown): boolean {
  return hasActiveAttribute(rawJson, /latin/i);
}

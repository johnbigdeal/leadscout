/**
 * Normaliza el embed de un video. El admin puede pegar el <iframe> completo de
 * KOMMODO (o cualquier proveedor) o una URL pelada. Guardamos solo el `src` y el
 * aspect-ratio → renderizamos un <iframe> controlado (evita inyectar HTML crudo).
 */
export function parseEmbed(input: string): { embedUrl: string | null; aspectRatio: string } {
  const raw = (input ?? "").trim();
  if (!raw) return { embedUrl: null, aspectRatio: "16 / 9" };

  let embedUrl: string | null = null;
  let aspectRatio = "16 / 9";

  // src="..." dentro de un iframe pegado
  const srcMatch = raw.match(/src\s*=\s*["']([^"']+)["']/i);
  if (srcMatch) {
    embedUrl = srcMatch[1];
  } else if (/^https?:\/\//i.test(raw)) {
    embedUrl = raw;
  }

  // aspect-ratio del style, ej: aspect-ratio:3340 / 2160
  const arMatch = raw.match(/aspect-ratio\s*:\s*([0-9.]+\s*\/\s*[0-9.]+|[0-9.]+)/i);
  if (arMatch) {
    aspectRatio = arMatch[1].replace(/\s+/g, " ").trim();
  }

  return { embedUrl, aspectRatio };
}

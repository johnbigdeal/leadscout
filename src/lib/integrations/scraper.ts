export type ScrapedContact = {
  email: string | null;
  instagram: string | null;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const INSTAGRAM_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.\-\/]+/gi;

const BLOCKED_EMAIL_DOMAINS = ["sentry.io", "wixpress.com", "example.com", "domain.com", "yourdomain"];

function isSpamEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".gif")) return true;
  if (lower.includes("noreply") || lower.includes("no-reply")) return true;
  for (const d of BLOCKED_EMAIL_DOMAINS) {
    if (lower.includes(d)) return true;
  }
  return false;
}

function normalizeUrl(url: string): string {
  let u = url.replace(/&amp;/g, "&").trim();
  if (u.endsWith("/")) u = u.slice(0, -1);
  return u;
}

/* Rutas de contacto comunes (es/en) a probar si la home no da email. */
const CONTACT_PATHS = ["/contacto", "/contact", "/contactanos", "/contact-us", "/nosotros", "/about"];
const MAX_EXTRA_PAGES = 3;

/* Descarga el HTML de una URL con timeout; devuelve null ante error/timeout. */
async function fetchHtml(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadScoutBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.text()).slice(0, 500_000);
  } catch {
    return null;
  }
}

/* De-ofusca emails: entidades/porcentaje y patrones "(at)"/"[dot]"/" arroba ". */
function deobfuscate(html: string): string {
  return html
    .replace(/&#0*64;|&#x0*40;|%40|&commat;/gi, "@")
    .replace(/&#0*46;|&#x0*2e;/gi, ".")
    .replace(/\s*[[(]\s*(?:at|arroba)\s*[\])]\s*/gi, "@")
    .replace(/\s*[[(]\s*(?:dot|punto)\s*[\])]\s*/gi, ".");
}

/* Extrae el primer email válido de un HTML: prioriza mailto:, luego regex sobre
   el HTML de-ofuscado, filtrando spam/no-reply/imágenes. */
function extractEmailFromHtml(html: string): string | null {
  // 1) mailto: (alta señal — es un email real puesto por el dueño)
  const mailtoMatches = html.matchAll(/mailto:([^"'?\s>]+)/gi);
  for (const m of mailtoMatches) {
    let addr = m[1].trim();
    try {
      addr = decodeURIComponent(addr);
    } catch {
      /* URL mal formada: usar el valor crudo */
    }
    const ok = EMAIL_REGEX.test(addr) && !isSpamEmail(addr);
    EMAIL_REGEX.lastIndex = 0;
    if (ok) return addr;
  }

  // 2) regex genérico sobre el HTML de-ofuscado
  const emailMatches = deobfuscate(html).match(EMAIL_REGEX) || [];
  for (const e of emailMatches) {
    if (!isSpamEmail(e)) return e;
  }
  return null;
}

export async function scrapeWebsiteContact(websiteUrl: string): Promise<ScrapedContact> {
  const result: ScrapedContact = { email: null, instagram: null };

  const homeHtml = await fetchHtml(websiteUrl);
  if (!homeHtml) return result;

  // Email desde la home
  result.email = extractEmailFromHtml(homeHtml);

  // Instagram desde la home (sin cambios de comportamiento)
  const igMatches = homeHtml.match(INSTAGRAM_REGEX) || [];
  for (const u of igMatches) {
    const norm = normalizeUrl(u);
    if (!norm.includes("/p/") && !norm.includes("/explore")) {
      result.instagram = norm;
      break;
    }
  }

  // Si la home no dio email, probar páginas de contacto comunes (early-exit)
  if (!result.email) {
    let origin: string;
    try {
      origin = new URL(websiteUrl).origin;
    } catch {
      return result;
    }
    let tried = 0;
    for (const path of CONTACT_PATHS) {
      if (result.email || tried >= MAX_EXTRA_PAGES) break;
      tried++;
      const pageHtml = await fetchHtml(origin + path);
      if (pageHtml) result.email = extractEmailFromHtml(pageHtml);
    }
  }

  return result;
}
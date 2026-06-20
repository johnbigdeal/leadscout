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

export async function scrapeWebsiteContact(websiteUrl: string): Promise<ScrapedContact> {
  const result: ScrapedContact = { email: null, instagram: null };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LeadScoutBot/1.0)",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return result;

    const html = await res.text();
    const htmlStr = html.slice(0, 500_000);

    // Extract email
    const emailMatches = htmlStr.match(EMAIL_REGEX) || [];
    for (const e of emailMatches) {
      if (!isSpamEmail(e)) {
        result.email = e;
        break;
      }
    }

    // Extract Instagram
    const igMatches = htmlStr.match(INSTAGRAM_REGEX) || [];
    for (const u of igMatches) {
      const norm = normalizeUrl(u);
      if (!norm.includes("/p/") && !norm.includes("/explore")) {
        result.instagram = norm;
        break;
      }
    }

  } catch {
    // Timeout or fetch error — silently return empty
  }

  return result;
}
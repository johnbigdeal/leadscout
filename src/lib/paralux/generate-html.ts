/* =========================================================================
   PARALUX HTML GENERATOR
   Builds the full standalone landing page HTML from data object.
   ========================================================================= */

/* ---------- small helpers ---------- */
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const onlyDigits = (s = "") => String(s).replace(/[^\d]/g, "");

/* image value may be a legacy string or an object with attribution */
const imgUrl = (img: any): string => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.url || "";
};

const imgAttribution = (img: any) => {
  if (!img || typeof img === "string") return null;
  if (!img.author && !img.authorUrl) return null;
  const url = (img.url || "").toLowerCase();
  if (!url.includes("images.unsplash.com") && !url.includes("unsplash.com")) return null;
  return {
    author: img.author || "Unsplash",
    authorUrl: img.authorUrl || "https://unsplash.com/?utm_source=leadscout&utm_medium=referral",
    unsplashUrl: img.unsplashUrl || "https://unsplash.com/?utm_source=leadscout&utm_medium=referral",
  };
};

const attributionHTML = (img: any, extraClass = ""): string => {
  const attr = imgAttribution(img);
  if (!attr) return "";
  return `<div class="attribution ${extraClass}">Photo by <a href="${esc(attr.authorUrl)}" target="_blank" rel="noopener">${esc(attr.author)}</a> on <a href="${esc(attr.unsplashUrl)}" target="_blank" rel="noopener">Unsplash</a></div>`;
};

const collectAttributions = (images: any[]) => {
  const seen = new Set<string>();
  return images
    .map(imgAttribution)
    .filter(Boolean)
    .filter((attr: any) => {
      if (seen.has(attr.author)) return false;
      seen.add(attr.author);
      return true;
    }) as Array<{ author: string; authorUrl: string; unsplashUrl: string }>;
};

const footerAttributionHTML = (attrs: Array<{ author: string; authorUrl: string; unsplashUrl: string }>): string => {
  if (attrs.length === 0) return "";
  const photographers = attrs
    .map((a) => `<a href="${esc(a.authorUrl)}" target="_blank" rel="noopener">${esc(a.author)}</a>`)
    .join(", ");
  return `<div class="footer-attribution">Photos by ${photographers} on <a href="${esc(attrs[0].unsplashUrl)}" target="_blank" rel="noopener">Unsplash</a></div>`;
};

const waLink = (num: string, msg: string) => {
  const n = onlyDigits(num);
  const t = encodeURIComponent(msg || "");
  return n ? `https://wa.me/${n}${t ? `?text=${t}` : ""}` : "#";
};

const telLink = (num: string) => {
  const n = onlyDigits(num);
  return n ? `tel:${n}` : "#";
};

/* Genera franjas horarias "HH:MM" entre start y end cada `interval` minutos. */
const buildTimeSlots = (start = "09:00", end = "18:00", interval = 30): string[] => {
  const toMin = (t: string) => {
    const [h, m] = String(t).split(":").map((x) => parseInt(x, 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };
  const step = Math.max(5, interval || 30);
  const s = toMin(start);
  const e = toMin(end);
  const out: string[] = [];
  for (let t = s; t <= e && out.length < 96; t += step) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
};

/* ---------- fixed UI strings (i18n) ---------- */
const STRINGS = {
  es: {
    htmlLang: "es",
    navInicio: "Inicio", navNosotros: "Nosotros", navServicios: "Servicios",
    navProyectos: "Proyectos", navContacto: "Contacto", navReservar: "Reservar",
    navCta: "Reservar",
    ebQuienes: "Quiénes somos", ebHacemos: "Lo que hacemos",
    ebTrabajo: "Trabajo seleccionado", ebResenas: "Reseñas en Google", ebSeguinos: "Seguinos",
    ebEmpezamos: "¿Empezamos?", ebReservar: "Reservá tu turno",
    servicios: "Servicios", proyectos: "Proyectos", projectAlt: "Proyecto",
    reviewsTitleFallback: "Lo que dicen nuestros clientes",
    reviewsCta: "Dejá tu reseña en Google",
    socialTitleFallback: "Conectá con nosotros",
    websiteLabel: "Sitio web", socialLinkFallback: "Enlace",
    heroCtaWa: "Hablar por WhatsApp", contactCtaWa: "Escribir por WhatsApp",
    ctaTitleFallback: "Cuéntanos sobre tu proyecto",
    ctaSubtextFallback: "Respondemos rápido. Escríbenos y agendemos una conversación.",
    contactoFallback: "Contáctanos", enviarCorreo: "Enviar correo",
    /* ─ reservas ─ */
    bookingTitleFallback: "Reservá tu turno",
    bookingSubtextFallback: "Elegí día, horario y servicio. Te confirmamos por WhatsApp.",
    bookingBtnFallback: "Reservar por WhatsApp",
    bookingLabelDate: "Fecha", bookingLabelTime: "Horario",
    bookingLabelService: "Servicio", bookingLabelName: "Tu nombre",
    bookingLabelNote: "Nota (opcional)",
    bookingServicePh: "Elegí un servicio",
    bookingNamePh: "Nombre y apellido",
    bookingNotePh: "Contanos algo más sobre tu reserva…",
    bookingNoSlots: "No hay horarios configurados.",
    bookingClosedDay: "Ese día no atendemos. Elegí otra fecha.",
    bookingMissing: "Completá fecha, horario, servicio y tu nombre.",
    bookingNoNumber: "Este sitio aún no tiene WhatsApp configurado.",
    bookingMsgIntro: "¡Hola! Quiero reservar un turno 👇",
    bookingMsgDate: "Fecha", bookingMsgTime: "Horario",
    bookingMsgService: "Servicio", bookingMsgName: "Nombre", bookingMsgNote: "Nota",
    weekdays: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
  },
  en: {
    htmlLang: "en",
    navInicio: "Home", navNosotros: "About", navServicios: "Services",
    navProyectos: "Projects", navContacto: "Contact", navReservar: "Book",
    navCta: "Book now",
    ebQuienes: "About us", ebHacemos: "What we do",
    ebTrabajo: "Selected work", ebResenas: "Google reviews", ebSeguinos: "Follow us",
    ebEmpezamos: "Let's start", ebReservar: "Book your slot",
    servicios: "Services", proyectos: "Projects", projectAlt: "Project",
    reviewsTitleFallback: "What our clients say",
    reviewsCta: "Leave your review on Google",
    socialTitleFallback: "Connect with us",
    websiteLabel: "Website", socialLinkFallback: "Link",
    heroCtaWa: "Chat on WhatsApp", contactCtaWa: "Message on WhatsApp",
    ctaTitleFallback: "Tell us about your project",
    ctaSubtextFallback: "We reply fast. Send us a message and let's talk.",
    contactoFallback: "Contact us", enviarCorreo: "Send email",
    /* ─ booking ─ */
    bookingTitleFallback: "Book your slot",
    bookingSubtextFallback: "Pick a day, time and service. We'll confirm on WhatsApp.",
    bookingBtnFallback: "Book on WhatsApp",
    bookingLabelDate: "Date", bookingLabelTime: "Time",
    bookingLabelService: "Service", bookingLabelName: "Your name",
    bookingLabelNote: "Note (optional)",
    bookingServicePh: "Choose a service",
    bookingNamePh: "Full name",
    bookingNotePh: "Tell us more about your booking…",
    bookingNoSlots: "No time slots configured.",
    bookingClosedDay: "We're closed that day. Pick another date.",
    bookingMissing: "Please fill in date, time, service and your name.",
    bookingNoNumber: "This site has no WhatsApp configured yet.",
    bookingMsgIntro: "Hi! I'd like to book a slot 👇",
    bookingMsgDate: "Date", bookingMsgTime: "Time",
    bookingMsgService: "Service", bookingMsgName: "Name", bookingMsgNote: "Note",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
} as const;

/* ---------- style presets ---------- */
const PRESETS = {
  modern: {
    label: "Modern",
    display: "Space Grotesk",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap",
    light: { bg: "#FFFFFF", surface: "#F5F5F7", text: "#0E0E12", muted: "#5B5B66", line: "#E6E6EB" },
    dark: { bg: "#0C0C10", surface: "#141419", text: "#F3F3F6", muted: "#9A9AA6", line: "#23232B" },
  },
  editorial: {
    label: "Editorial",
    display: "Fraunces",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500&display=swap",
    light: { bg: "#FBFAF7", surface: "#F2EFE9", text: "#1A1612", muted: "#6B6357", line: "#E6E0D5" },
    dark: { bg: "#14110D", surface: "#1D1812", text: "#F4EFE7", muted: "#A89C8A", line: "#2A2418" },
  },
  bold: {
    label: "Bold",
    display: "Bricolage Grotesque",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500&display=swap",
    light: { bg: "#FFFFFF", surface: "#F4F4F4", text: "#08080A", muted: "#55555E", line: "#E4E4E8" },
    dark: { bg: "#08080A", surface: "#121214", text: "#FAFAFA", muted: "#9C9CA6", line: "#202024" },
  },
  clasico: {
    label: "Clásico",
    display: "Playfair Display",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@500;600;700&display=swap",
    light: { bg: "#FFFFFF", surface: "#F6F4F0", text: "#1A1714", muted: "#6B6358", line: "#E8E2D8" },
    dark: { bg: "#13110E", surface: "#1C1915", text: "#F5F1EA", muted: "#A89E90", line: "#2A251E" },
  },
  geometrico: {
    label: "Geométrico",
    display: "Poppins",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap",
    light: { bg: "#FFFFFF", surface: "#F4F5F7", text: "#10131A", muted: "#5A6172", line: "#E4E7EC" },
    dark: { bg: "#0B0D12", surface: "#14171F", text: "#F2F4F8", muted: "#969DAE", line: "#222732" },
  },
  corporativo: {
    label: "Corporativo",
    display: "Montserrat",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@500;600;700&display=swap",
    light: { bg: "#FFFFFF", surface: "#F3F5F6", text: "#0F1417", muted: "#566066", line: "#E3E8EA" },
    dark: { bg: "#0A0E10", surface: "#13181B", text: "#F1F5F6", muted: "#929CA1", line: "#212A2E" },
  },
  lectura: {
    label: "Lectura",
    display: "Lora",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Lora:wght@500;600;700&display=swap",
    light: { bg: "#FCFBF9", surface: "#F1EEE9", text: "#1F1B16", muted: "#6F665B", line: "#E6E0D6" },
    dark: { bg: "#14110D", surface: "#1D1913", text: "#F3EFE8", muted: "#A89E90", line: "#29231B" },
  },
  lujo: {
    label: "Lujo",
    display: "DM Serif Display",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500&display=swap",
    light: { bg: "#FFFFFF", surface: "#F5F3F1", text: "#161311", muted: "#6A625C", line: "#E7E1DC" },
    dark: { bg: "#100E0D", surface: "#191614", text: "#F4F0EC", muted: "#A79E96", line: "#26211D" },
  },
  tech: {
    label: "Tech",
    display: "Sora",
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700&display=swap",
    light: { bg: "#FFFFFF", surface: "#F4F5F8", text: "#0D1017", muted: "#586173", line: "#E3E6EE" },
    dark: { bg: "#090B10", surface: "#12151C", text: "#F1F3F8", muted: "#949CAD", line: "#1F2430" },
  },
};

/* =========================================================================
   THE ENGINE
   ========================================================================= */
export function generateHTML(
  d: Record<string, any>,
  opts: { showBadge?: boolean; allowCustomCode?: boolean } = {},
) {
  /* "Hecho con LeadScout" badge. Shown by default; the serving route forces it
     on for Free plans and lets Pro users hide it via data.hideBadge. */
  const showBadge = opts.showBadge !== false;

  /* Código HTML custom (head/body/footer). Solo se inyecta si el llamador lo
     habilita (plan Pro, resuelto server-side en el route). Se interpola crudo,
     SIN esc(): es HTML del propio usuario para su sitio. */
  const allowCustomCode = opts.allowCustomCode === true;
  const customHead = allowCustomCode ? (d.customHead || "") : "";
  const customBody = allowCustomCode ? (d.customBody || "") : "";
  const customFooter = allowCustomCode ? (d.customFooter || "") : "";
  const lang: "es" | "en" = d.lang === "en" ? "en" : "es";
  const S = STRINGS[lang];
  const p = PRESETS[(d.preset as keyof typeof PRESETS) || "modern"];
  const c = d.dark ? p.dark : p.light;
  const wa = waLink(d.whatsappNumber || "", d.whatsappMessage || "");
  const hasWA = d.whatsappEnabled !== false && onlyDigits(d.whatsappNumber || "").length > 0;
  /* Prominent header phone: opens WhatsApp when configured, falls back to a call. */
  const phoneHref = hasWA ? wa : telLink(d.phone || "");
  const phoneHTML = d.phone
    ? `<a class="nav-phone" href="${phoneHref}"${hasWA ? ' target="_blank" rel="noopener"' : ""}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z"/></svg><span>${esc(d.phone)}</span></a>`
    : "";
  const waPosition = d.whatsappPosition || "right";
  const waSize = d.whatsappSize || "normal";

  const services = (d.services || []).filter((s: any) => s.title || s.desc);
  const gallery = (d.gallery || []).filter(Boolean);
  const unsplashAttributions = collectAttributions([d.heroImage, d.aboutImage, d.stmtImage, ...gallery]);

  /* Social-share metadata (Open Graph / Twitter) */
  const ogTitle = esc(d.businessName || "Mi negocio");
  const ogDesc = esc(d.tagline || d.heroSubtext || "");
  const ogImage = esc(imgUrl(d.heroImage) || imgUrl(d.aboutImage));

  const navLinks = [
    `<a href="#inicio">${S.navInicio}</a>`,
    `<a href="#nosotros">${S.navNosotros}</a>`,
    services.length ? `<a href="#servicios">${S.navServicios}</a>` : "",
    gallery.length ? `<a href="#galeria">${S.navProyectos}</a>` : "",
    `<a href="#contacto">${S.navContacto}</a>`,
  ]
    .filter(Boolean)
    .join("");

  const servicesHTML = services.length
    ? `<section id="servicios" class="section">
        <div class="wrap">
          <p class="eyebrow reveal">${S.ebHacemos}</p>
          <h2 class="reveal">${esc(d.servicesTitle || S.servicios)}</h2>
          <div class="grid">
            ${services
              .map(
                (s: any, i: number) => `
              <article class="card reveal" style="transition-delay:${i * 80}ms">
                <span class="num">${String(i + 1).padStart(2, "0")}</span>
                <h3>${esc(s.title || "")}</h3>
                <p>${esc(s.desc || "")}</p>
              </article>`,
              )
              .join("")}
          </div>
        </div>
      </section>`
    : "";

  const galleryHTML = gallery.length
    ? `<section id="galeria" class="section section--tight">
        <div class="wrap">
          <p class="eyebrow reveal">${S.ebTrabajo}</p>
          <h2 class="reveal">${esc(d.galleryTitle || S.proyectos)}</h2>
        </div>
        <div class="gallery">
          ${gallery
            .map(
              (img: any, i: number) => `
            <figure class="g-item reveal" style="transition-delay:${(i % 3) * 90}ms">
              <img src="${esc(imgUrl(img))}" alt="${S.projectAlt} ${i + 1}" loading="lazy"/>
              ${attributionHTML(img, "attribution--gallery")}
            </figure>`,
            )
            .join("")}
        </div>
      </section>`
    : "";

  const stmtHTML = d.stmtText
    ? `<section class="stmt" style="background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url('${esc(imgUrl(d.stmtImage))}')">
        <div class="wrap">
          <p class="stmt-text reveal">${esc(d.stmtText)}</p>
        </div>
        ${attributionHTML(d.stmtImage, "attribution--stmt")}
      </section>`
    : "";

  const socials = [
    d.instagram ? `<a href="${esc(d.instagram)}" target="_blank" rel="noopener">Instagram</a>` : "",
    d.facebook ? `<a href="${esc(d.facebook)}" target="_blank" rel="noopener">Facebook</a>` : "",
    d.website ? `<a href="${esc(d.website)}" target="_blank" rel="noopener">Web</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  /* ─── Google Reviews section ─── */
  const reviews = (d.googleReviews || []).filter((r: any) => r.text || r.author);
  const starRow = (rating: number, inline = false) => {
    const full = Math.max(0, Math.min(5, Math.round(rating || 5)));
    let s = "";
    for (let i = 0; i < 5; i++) {
      s += `<span class="star${i < full ? " on" : ""}" style="animation-delay:${i * 120}ms">★</span>`;
    }
    return `<span class="stars${inline ? " stars--inline" : ""}">${s}</span>`;
  };
  const reviewsHTML = reviews.length || d.googleReviewUrl
    ? `<section id="resenas" class="section reviews">
        <div class="wrap">
          <p class="eyebrow reveal">${S.ebResenas}</p>
          <h2 class="reveal">${esc(d.googleReviewsTitle || S.reviewsTitleFallback)}</h2>
          ${reviews.length ? `<div class="reviews-grid">
            ${reviews.map((r: any, i: number) => `
            <article class="review reveal" style="transition-delay:${(i % 3) * 90}ms">
              ${starRow(r.rating)}
              <p class="review-text">${esc(r.text || "")}</p>
              <p class="review-author">${esc(r.author || "")}</p>
            </article>`).join("")}
          </div>` : ""}
          ${d.googleReviewUrl ? `<div class="reveal review-cta" style="transition-delay:120ms">
            <a class="btn btn--review" href="${esc(d.googleReviewUrl)}" target="_blank" rel="noopener">${starRow(5, true)} ${S.reviewsCta} →</a>
          </div>` : ""}
        </div>
      </section>`
    : "";

  /* ─── Social media section ─── */
  const SOCIAL_ICONS: Record<string, string> = {
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38C1.35 2.68.93 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13.67.66 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.7 5.7 0 002.13-1.38 5.7 5.7 0 001.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.7 5.7 0 00-1.38-2.13A5.7 5.7 0 0019.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.41-10.85a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M24 12a12 12 0 10-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0024 12z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.87 11.87 0 01-1.587-5.946C.16 5.335 5.494 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.728-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><path d="M23.5 6.2a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 00.5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3.02 3.02 0 002.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 002.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.8zM9.6 15.6V8.4l6.27 3.6-6.27 3.6z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/></svg>',
    website: '<svg viewBox="0 0 24 24"><path d="M12 0a12 12 0 100 24 12 12 0 000-24zm7.93 7h-3.2a15.6 15.6 0 00-1.34-3.46A8.03 8.03 0 0119.93 7zM12 2.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM2.26 14a7.9 7.9 0 010-4h3.67a16.5 16.5 0 000 4H2.26zm.81 2h3.2c.34 1.23.8 2.4 1.34 3.46A8.03 8.03 0 013.07 16zm3.2-9H3.07a8.03 8.03 0 014.54-3.46A15.6 15.6 0 006.27 7zM12 21.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 16H9.66a14.4 14.4 0 010-4h4.68a14.4 14.4 0 010 4zm.32 3.46c.54-1.06 1-2.23 1.34-3.46h3.2a8.03 8.03 0 01-4.54 3.46zM18.07 14a16.5 16.5 0 000-4h3.67a7.9 7.9 0 010 4h-3.67z"/></svg>',
  };
  const SOCIAL_LABELS: Record<string, string> = {
    instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp", tiktok: "TikTok",
    youtube: "YouTube", linkedin: "LinkedIn", x: "X", website: S.websiteLabel,
  };
  /* Normaliza entradas parciales (usuario/handle/dominio suelto) a URLs válidas,
     para que "escribí mi Instagram" funcione sin pegar el link completo. Devuelve
     "" para valores basura ("#", protocolo suelto, handle vacío) así no se
     renderizan botones rotos. */
  const normalizeSocialUrl = (type: string, raw: string): string => {
    const val = (raw || "").trim();
    /* Descarta placeholders/basura: vacío, solo "#", "/", "@", "-", etc. */
    if (!val || !/[a-z0-9]/i.test(val)) return "";
    if (/^https?:\/\//i.test(val)) {
      /* URL completa pero sin nada después del protocolo → basura. */
      return /^https?:\/\/[a-z0-9]/i.test(val) ? val : "";
    }
    if (type === "whatsapp") {
      const digits = onlyDigits(val);
      return digits ? `https://wa.me/${digits}` : "";
    }
    const handle = val.replace(/^@/, "").replace(/^\/+/, "").replace(/^#+/, "").trim();
    if (!handle || !/[a-z0-9]/i.test(handle)) return "";
    switch (type) {
      case "instagram": return `https://instagram.com/${handle}`;
      case "tiktok": return `https://tiktok.com/@${handle}`;
      case "x": return `https://x.com/${handle}`;
      case "facebook": return `https://${val.includes(".") ? val : `facebook.com/${handle}`}`;
      case "youtube": return `https://${val.includes(".") ? val : `youtube.com/@${handle}`}`;
      case "linkedin": return `https://${val.includes(".") ? val : `linkedin.com/in/${handle}`}`;
      default: return `https://${val}`;
    }
  };

  /* La sección de botones se maneja desde d.socialLinks. Los campos sueltos de la
     pestaña Contacto (instagram/facebook/website) siguen en el footer. Normaliza y
     descarta URLs basura; dedup por URL final. */
  const seenSocial = new Set<string>();
  const socialLinks = ((d.socialLinks || []) as Array<{ type: string; url: string }>)
    .map((s) => ({ type: s.type, url: normalizeSocialUrl(s.type, s.url) }))
    .filter((s) => {
      if (!s.url) return false;
      const key = `${s.type}|${s.url}`;
      if (seenSocial.has(key)) return false;
      seenSocial.add(key);
      return true;
    });
  const socialHTML = socialLinks.length
    ? `<section id="redes" class="section social">
        <div class="wrap">
          <p class="eyebrow reveal">${S.ebSeguinos}</p>
          <h2 class="reveal">${esc(d.socialTitle || S.socialTitleFallback)}</h2>
          <div class="social-row reveal" style="transition-delay:80ms">
            ${socialLinks.map((s: any) => {
              const label = SOCIAL_LABELS[s.type] || S.socialLinkFallback;
              const icon = SOCIAL_ICONS[s.type] || SOCIAL_ICONS.website;
              return `<a class="social-btn" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(label)}">${icon}<span>${esc(label)}</span></a>`;
            }).join("")}
          </div>
        </div>
      </section>`
    : "";

  /* ─── Booking / reservas section ─── */
  const bookingServices = (d.bookingServices || []).filter((s: any) => s && s.name);
  const bookingDays: number[] = Array.isArray(d.bookingDays) ? d.bookingDays : [1, 2, 3, 4, 5];
  const bookingSlots = buildTimeSlots(d.bookingHoursStart, d.bookingHoursEnd, d.bookingInterval);
  const bookingNumber = onlyDigits(d.whatsappNumber || "");
  const bookingOn = d.bookingEnabled === true && bookingServices.length > 0;
  const bookingNavLink = bookingOn ? `<a href="#reservar">${S.navReservar}</a>` : "";
  const bookingHTML = bookingOn
    ? `<section id="reservar" class="section booking">
        <div class="wrap">
          <p class="eyebrow reveal">${S.ebReservar}</p>
          <h2 class="reveal">${esc(d.bookingTitle || S.bookingTitleFallback)}</h2>
          <p class="booking-lede reveal" style="transition-delay:80ms">${esc(d.bookingSubtext || S.bookingSubtextFallback)}</p>
          <form class="booking-form reveal" style="transition-delay:140ms" novalidate>
            <div class="booking-field">
              <label for="bk-date">${S.bookingLabelDate}</label>
              <input type="date" id="bk-date" name="date" required>
            </div>
            <div class="booking-field">
              <label for="bk-service">${S.bookingLabelService}</label>
              <select id="bk-service" name="service" required>
                <option value="" disabled selected>${esc(S.bookingServicePh)}</option>
                ${bookingServices
                  .map((s: any) => {
                    const meta = [s.duration ? `${s.duration} min` : "", s.price ? String(s.price) : ""]
                      .filter(Boolean)
                      .join(" · ");
                    const label = meta ? `${s.name} — ${meta}` : s.name;
                    return `<option value="${esc(s.name)}" data-label="${esc(label)}">${esc(label)}</option>`;
                  })
                  .join("")}
              </select>
            </div>
            <div class="booking-field booking-field--full">
              <label>${S.bookingLabelTime}</label>
              ${bookingSlots.length
                ? `<div class="booking-slots" role="radiogroup" aria-label="${S.bookingLabelTime}">
                    ${bookingSlots.map((t) => `<button type="button" class="slot" data-time="${t}" role="radio" aria-checked="false">${t}</button>`).join("")}
                  </div>
                  <input type="hidden" id="bk-time" name="time" value="">`
                : `<p class="booking-note-msg">${S.bookingNoSlots}</p>`}
            </div>
            <div class="booking-field">
              <label for="bk-name">${S.bookingLabelName}</label>
              <input type="text" id="bk-name" name="name" placeholder="${esc(S.bookingNamePh)}" required>
            </div>
            <div class="booking-field booking-field--full">
              <label for="bk-note">${S.bookingLabelNote}</label>
              <textarea id="bk-note" name="note" rows="3" placeholder="${esc(S.bookingNotePh)}"></textarea>
            </div>
            <div class="booking-field booking-field--full">
              <p class="booking-msg" id="bk-msg" role="alert"></p>
              <button type="submit" class="btn booking-submit">${esc(d.bookingButtonText || S.bookingBtnFallback)} →</button>
            </div>
          </form>
        </div>
      </section>`
    : "";

  const css = `
  :root{
    --bg:${c.bg};--surface:${c.surface};--text:${c.text};--muted:${c.muted};
    --line:${c.line};--accent:${d.accent};--accent-ink:#fff;--maxw:1120px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;
    line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 28px}
  h1,h2,h3{font-family:'${p.display}',serif;font-weight:600;line-height:1.05;letter-spacing:-.02em}
  h1{font-size:clamp(2.6rem,7vw,5.2rem)}
  h2{font-size:clamp(1.9rem,4vw,3rem);margin-bottom:36px}
  h3{font-size:1.25rem;letter-spacing:-.01em}
  a{color:inherit;text-decoration:none}
  .eyebrow{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);
    font-weight:600;margin-bottom:14px}

  /* nav */
  .nav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;
    justify-content:space-between;padding:18px 28px;transition:.4s;mix-blend-mode:normal}
  .nav.scrolled{background:color-mix(in srgb,var(--bg) 86%,transparent);
    backdrop-filter:blur(14px);border-bottom:1px solid var(--line);padding:12px 28px}
  .brand{font-family:'${p.display}',serif;font-weight:700;font-size:1.05rem;letter-spacing:.04em;color:#fff}
  .nav.scrolled .brand{color:var(--text)}
  .nav-links{display:flex;gap:30px;align-items:center}
  .nav-links a{font-size:.86rem;color:rgba(255,255,255,.82);font-weight:500;transition:.2s}
  .nav.scrolled .nav-links a{color:var(--muted)}
  .nav-links a:hover{color:#fff}.nav.scrolled .nav-links a:hover{color:var(--accent)}
  .nav-cta{position:relative;padding:9px 18px;border:1px solid rgba(255,255,255,.4);border-radius:100px;color:#fff;font-size:.82rem;font-weight:600;overflow:hidden;transition:color .25s,background .25s,border-color .25s,transform .25s;animation:ctaBob 2.6s ease-in-out infinite}
  .nav-cta::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:linear-gradient(110deg,transparent 20%,color-mix(in srgb,var(--accent) 32%,transparent) 50%,transparent 80%);background-size:220% 100%;animation:ctaShine 2.6s linear infinite}
  .nav-cta:hover{color:#fff;background:var(--accent);border-color:var(--accent);transform:translateY(-2px) scale(1.04);box-shadow:0 8px 22px color-mix(in srgb,var(--accent) 45%,transparent)}
  .nav.scrolled .nav-cta{border-color:var(--accent);color:var(--accent)}
  /* En estado scrolled el color base es accent; al hover debe volver blanco
     (sube especificidad para ganarle a .nav.scrolled .nav-cta). */
  .nav.scrolled .nav-cta:hover{color:#fff}
  @keyframes ctaBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
  @keyframes ctaShine{0%{background-position:120% 0}100%{background-position:-120% 0}}
  .nav-actions{display:flex;align-items:center;gap:18px}
  .nav-phone{display:inline-flex;align-items:center;gap:7px;color:#fff;font-weight:700;font-size:.92rem;white-space:nowrap}
  .nav-phone svg{opacity:.9;flex:none}
  .nav.scrolled .nav-phone{color:var(--accent)}
  @media(max-width:760px){.nav-links{display:none}}

  /* hero */
  .hero{position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden}
  .hero-bg{position:absolute;inset:-12% 0;background-size:cover;background-position:center;will-change:transform;z-index:0}
  .hero-overlay{position:absolute;inset:0;z-index:1;
    background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.5) 55%,rgba(0,0,0,.72) 100%)}
  .attribution{position:absolute;z-index:5;font-size:11px;color:rgba(255,255,255,.82);background:rgba(0,0,0,.5);padding:5px 9px;border-radius:4px;backdrop-filter:blur(4px);opacity:0;transition:opacity .25s ease;pointer-events:none}
  .attribution a{color:#fff;text-decoration:underline;pointer-events:auto}
  .attribution a:hover{color:#fff}
  .hero:hover .attribution--hero,.about-img:hover .attribution--about,.stmt:hover .attribution--stmt,.g-item:hover .attribution--gallery{opacity:1}
  .attribution--hero{bottom:18px;right:18px}
  .attribution--about{bottom:10px;left:10px}
  .attribution--stmt{bottom:18px;left:50%;transform:translateX(-50%)}
  .attribution--gallery{bottom:8px;left:8px;right:8px;text-align:center;font-size:10px;background:rgba(0,0,0,.55)}
  .hero-inner{position:relative;z-index:2;max-width:var(--maxw);margin:0 auto;padding:0 28px;width:100%;color:#fff}
  .hero h1{color:#fff;max-width:14ch}
  .hero .eyebrow{color:#fff;opacity:.92}
  .lede{font-size:clamp(1.05rem,1.7vw,1.3rem);max-width:46ch;margin:26px 0 38px;color:rgba(255,255,255,.9);font-weight:400}
  .btn{display:inline-flex;align-items:center;gap:10px;background:var(--accent);color:var(--accent-ink);
    padding:15px 30px;border-radius:100px;font-weight:600;font-size:.95rem;transition:.25s;border:none;cursor:pointer}
  .btn:hover{transform:translateY(-2px);box-shadow:0 14px 34px color-mix(in srgb,var(--accent) 45%,transparent)}
  .btn--ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}
  .scroll-cue{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);z-index:2;
    width:24px;height:40px;border:2px solid rgba(255,255,255,.5);border-radius:14px}
  .scroll-cue::after{content:"";position:absolute;top:7px;left:50%;transform:translateX(-50%);
    width:4px;height:8px;border-radius:4px;background:#fff;animation:cue 1.6s infinite}
  @keyframes cue{0%{opacity:1;top:7px}70%{opacity:0;top:20px}100%{opacity:0}}

  /* sections */
  .section{padding:120px 0}
  .section--tight{padding:120px 0 90px}
  .about-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:64px;align-items:center}
  .about-grid p{color:var(--muted);font-size:1.05rem;max-width:52ch}
  .about-img{position:relative;aspect-ratio:4/5;border-radius:6px;overflow:hidden;background:var(--surface)}
  .about-img img{width:100%;height:100%;object-fit:cover}
  @media(max-width:820px){.about-grid{grid-template-columns:1fr;gap:40px}.about-img{aspect-ratio:16/10}}

  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .card{padding:40px 32px;border:1px solid var(--line);border-radius:6px;background:var(--surface);transition:.3s}
  .card:hover{border-color:var(--accent);transform:translateY(-4px)}
  .card .num{font-family:'${p.display}',serif;font-size:.85rem;color:var(--accent);font-weight:600;letter-spacing:.05em}
  .card h3{margin:18px 0 12px}.card p{color:var(--muted);font-size:.96rem}
  @media(max-width:820px){.grid{grid-template-columns:1fr}}

  /* statement (parallax) */
  .stmt{padding:160px 0;background-size:cover;background-position:center;background-attachment:fixed;text-align:center}
  .stmt-text{font-family:'${p.display}',serif;font-size:clamp(1.6rem,3.4vw,2.7rem);color:#fff;
    max-width:22ch;margin:0 auto;line-height:1.2;font-weight:500}
  @media(max-width:820px){.stmt{background-attachment:scroll;padding:110px 0}}

  /* gallery */
  .gallery{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;padding:0 8px;max-width:1400px;margin:48px auto 0}
  .g-item{position:relative;flex:1 1 300px;max-width:calc(33.333% - 6px);aspect-ratio:4/5;overflow:hidden;border-radius:4px;background:var(--surface)}
  .g-item img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
  .g-item:hover img{transform:scale(1.06)}
  @media(max-width:820px){.g-item{max-width:calc(50% - 4px)}}

  /* final cta */
  .cta{padding:140px 0;text-align:center;border-top:1px solid var(--line)}
  .cta h2{margin-bottom:18px}.cta p{color:var(--muted);max-width:48ch;margin:0 auto 34px}

  /* footer */
  footer{border-top:1px solid var(--line);padding:56px 0 64px}
  .foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:28px;align-items:flex-end}
  .foot-brand{font-family:'${p.display}',serif;font-weight:700;font-size:1.3rem}
  .foot small{display:block;color:var(--muted);margin-top:8px;font-size:.86rem}
  .foot small a{color:inherit;text-decoration:none}.foot small a:hover{color:var(--accent);text-decoration:underline}
  .foot-links{display:flex;gap:22px;flex-wrap:wrap}
  .foot-links a{color:var(--muted);font-size:.88rem;transition:.2s}.foot-links a:hover{color:var(--accent)}
  .footer-attribution{width:100%;margin-top:22px;font-size:.78rem;color:var(--muted)}
  .footer-attribution a{color:var(--muted);text-decoration:underline}.footer-attribution a:hover{color:var(--accent)}
  .ls-badge-wrap{margin-top:36px;padding-top:24px;border-top:1px solid var(--line);display:flex;justify-content:center}
  .ls-badge{display:inline-flex;align-items:center;gap:8px;font-size:.82rem;color:var(--muted);text-decoration:none;opacity:.85;transition:opacity .2s,color .2s}
  .ls-badge:hover{opacity:1;color:var(--text)}
  .ls-badge img{display:block;height:18px;width:auto}
  .ls-badge strong{font-weight:700;color:var(--text)}

  /* whatsapp fab */
  .wa{position:fixed;bottom:22px;z-index:80;border-radius:50%;
    background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(37,211,102,.45);
    transition:.25s;animation:pulse 2.4s infinite}
  .wa--right{right:22px}
  .wa--left{left:22px}
  .wa--center{left:50%;transform:translateX(-50%)}
  .wa--normal{width:60px;height:60px}
  .wa--normal svg{width:30px;height:30px}
  .wa--large{width:72px;height:72px}
  .wa--large svg{width:36px;height:36px}
  .wa:hover{transform:scale(1.08)}
  .wa--center:hover{transform:translateX(-50%) scale(1.08)}
  .wa svg{fill:#fff}
  @keyframes pulse{0%{box-shadow:0 10px 30px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.5)}
    70%{box-shadow:0 10px 30px rgba(37,211,102,.45),0 0 0 16px rgba(37,211,102,0)}
    100%{box-shadow:0 10px 30px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,0)}}

  /* reveal animation */
  .reveal{opacity:0;transform:translateY(26px);
    transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}
  .reveal.in{opacity:1;transform:none}
  @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}
    .hero-bg{transform:none!important}.stmt{background-attachment:scroll}}

  /* reviews */
  .reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:6px}
  .review{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:26px}
  .review-text{color:var(--text);margin:12px 0 16px;font-size:1rem}
  .review-author{color:var(--muted);font-size:.86rem;font-weight:600}
  .stars{display:inline-flex;gap:3px;font-size:1.18rem;line-height:1}
  .stars .star{color:#d9d9e0}
  .stars .star.on{color:#FFC107;animation:twinkle 1.8s ease-in-out infinite}
  @keyframes twinkle{0%,100%{transform:scale(1);filter:drop-shadow(0 0 0 rgba(255,193,7,0))}
    50%{transform:scale(1.22);filter:drop-shadow(0 0 6px rgba(255,193,7,.75))}}
  .stars--inline{font-size:1rem;margin-right:6px}
  .stars--inline .star.on{color:#fff}
  .review-cta{text-align:center;margin-top:40px}
  .btn--review{display:inline-flex;align-items:center;gap:8px}

  /* social */
  .social-row{display:flex;flex-wrap:wrap;gap:14px;margin-top:6px}
  .social-btn{display:inline-flex;align-items:center;gap:10px;padding:13px 22px;border-radius:999px;
    background:var(--accent);color:var(--accent-ink);font-weight:600;font-size:.92rem;
    box-shadow:0 6px 18px rgba(0,0,0,.14);transition:transform .2s ease,box-shadow .2s ease}
  .social-btn:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(0,0,0,.2)}
  .social-btn svg{width:18px;height:18px;fill:currentColor}
  @media(max-width:820px){.reviews-grid{grid-template-columns:1fr}}
  @media(prefers-reduced-motion:reduce){.stars .star.on{animation:none}}

  /* booking / reservas */
  .booking .wrap{text-align:center}
  .booking .booking-lede{color:var(--muted);max-width:52ch;margin:-18px auto 40px;font-size:1.05rem}
  .booking-form{display:grid;grid-template-columns:1fr 1fr;gap:20px 24px;max-width:760px;text-align:left;
    margin-left:auto;margin-right:auto;
    background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:32px}
  .booking-field{display:flex;flex-direction:column;gap:9px;min-width:0}
  .booking-field--full{grid-column:1 / -1}
  .booking-field label{font-size:.74rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
  .booking-field input,.booking-field select,.booking-field textarea{width:100%;background:var(--bg);
    color:var(--text);border:1px solid var(--line);border-radius:11px;padding:13px 14px;font-size:.95rem;
    font-family:inherit;transition:border-color .18s,box-shadow .18s;resize:vertical}
  .booking-field textarea{min-height:84px;line-height:1.5}
  .booking-field input:focus,.booking-field select:focus,.booking-field textarea:focus{outline:none;
    border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
  .booking-slots{display:flex;flex-wrap:wrap;gap:9px}
  .slot{background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:100px;
    padding:9px 16px;font-size:.9rem;font-weight:500;font-family:inherit;cursor:pointer;transition:.18s}
  .slot:hover{border-color:var(--accent)}
  .slot.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
  .booking-msg{min-height:1.2em;font-size:.9rem;color:#e0483b;margin-bottom:2px}
  .booking-msg.ok{color:var(--accent)}
  .booking-note-msg{color:var(--muted);font-size:.9rem}
  .booking-submit{margin-top:4px}
  @media(max-width:640px){.booking-form{grid-template-columns:1fr;padding:24px}}
  `;

  /* Booking client logic — armado del mensaje y apertura de wa.me.
     Los valores dinámicos se inyectan con JSON.stringify para escapar comillas.
     Se usa \\n para emitir un salto de línea literal dentro del string JS. */
  const bookingJS = bookingOn
    ? `(function(){` +
      `var f=document.querySelector('.booking-form');if(!f){return;}` +
      `var days=${JSON.stringify(bookingDays)};` +
      `var num=${JSON.stringify(bookingNumber)};` +
      `var M=${JSON.stringify({
        closed: S.bookingClosedDay,
        missing: S.bookingMissing,
        noNum: S.bookingNoNumber,
        intro: S.bookingMsgIntro,
        date: S.bookingMsgDate,
        time: S.bookingMsgTime,
        service: S.bookingMsgService,
        name: S.bookingMsgName,
        note: S.bookingMsgNote,
      })};` +
      `var dateEl=document.getElementById('bk-date');` +
      `var timeEl=document.getElementById('bk-time');` +
      `var msgEl=document.getElementById('bk-msg');` +
      `function clearMsg(){if(msgEl){msgEl.classList.remove('ok');msgEl.textContent='';}}` +
      `function err(t){if(msgEl){msgEl.classList.remove('ok');msgEl.textContent=t;}}` +
      `if(dateEl){var t=new Date();dateEl.min=t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);}` +
      `var slots=f.querySelectorAll('.slot');` +
      `slots.forEach(function(s){s.addEventListener('click',function(){` +
      `slots.forEach(function(x){x.classList.remove('on');x.setAttribute('aria-checked','false');});` +
      `s.classList.add('on');s.setAttribute('aria-checked','true');` +
      `if(timeEl){timeEl.value=s.getAttribute('data-time');}clearMsg();});});` +
      `if(dateEl){dateEl.addEventListener('change',function(){` +
      `if(!dateEl.value){return;}var p=dateEl.value.split('-');` +
      `var dd=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));` +
      `if(days.indexOf(dd.getDay())===-1){err(M.closed);dateEl.value='';}else{clearMsg();}});}` +
      `f.addEventListener('submit',function(e){e.preventDefault();` +
      `var date=dateEl?dateEl.value:'';var time=timeEl?timeEl.value:'';` +
      `var svcEl=f.querySelector('[name=service]');var svc='';` +
      `if(svcEl){var so=svcEl.options[svcEl.selectedIndex];svc=(so&&so.getAttribute('data-label'))||svcEl.value||'';}` +
      `var nm=(f.querySelector('[name=name]')||{}).value||'';` +
      `var note=(f.querySelector('[name=note]')||{}).value||'';` +
      `if(!date||!time||!svc||!nm.trim()){err(M.missing);return;}` +
      `if(!num){err(M.noNum);return;}` +
      `var pr=date.split('-');var dstr=pr.length===3?pr[2]+'/'+pr[1]+'/'+pr[0]:date;` +
      `var L=[M.intro,'',M.date+': '+dstr,M.time+': '+time,M.service+': '+svc,M.name+': '+nm.trim()];` +
      `if(note.trim()){L.push(M.note+': '+note.trim());}` +
      `clearMsg();var url='https://wa.me/'+num+'?text='+encodeURIComponent(L.join('\\n'));` +
      `var w=window.open(url,'_blank');` +
      `if(!w){var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}});` +
      `})();`
    : "";

  const js =
    "document.addEventListener('DOMContentLoaded',function(){" +
    bookingJS +
    "var nav=document.querySelector('.nav');" +
    "var bg=document.querySelector('.hero-bg');" +
    "function onScroll(){var y=window.pageYOffset||document.documentElement.scrollTop;" +
    "if(nav){nav.classList.toggle('scrolled',y>60);}" +
    "if(bg){bg.style.transform='translate3d(0,'+(y*0.4)+'px,0)';}}" +
    "window.addEventListener('scroll',onScroll,{passive:true});onScroll();" +
    "var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;" +
    "var els=document.querySelectorAll('.reveal');" +
    "if(reduce){els.forEach(function(el){el.classList.add('in');});return;}" +
    "var io=new IntersectionObserver(function(es){es.forEach(function(e){" +
    "if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});}," +
    "{threshold:0.12,rootMargin:'0px 0px -8% 0px'});" +
    "els.forEach(function(el){io.observe(el);});" +
    "document.querySelectorAll('a[href^=\"#\"]').forEach(function(a){" +
    "a.addEventListener('click',function(e){" +
    "e.preventDefault();" +
    "var t=document.querySelector(this.getAttribute('href'));" +
    "if(t){t.scrollIntoView({behavior:'smooth',block:'start'});}" +
    "});});" +
    "});";

  /* Self-contained badge: the mark is loaded from leadscout.lat so it renders
     on custom domains too. Uses the light knockout mark on dark sites. */
  const lsBadgeHTML = showBadge
    ? `<div class="ls-badge-wrap"><a class="ls-badge" href="https://leadscout.lat/?utm_source=cliente&utm_medium=badge&utm_campaign=hecho_con_leadscout" target="_blank" rel="noopener"><img src="https://leadscout.lat/brand/leadscout-mark${d.dark ? "-light" : ""}.png" alt="LeadScout" height="18" width="16" loading="lazy"><span>Hecho con <strong>LeadScout</strong></span></a></div>`
    : "";

  const waSVG =
    '<svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.494 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.728-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>';

  return `<!doctype html>
<html lang="${S.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.businessName || "Mi negocio")}</title>
<meta name="description" content="${esc(d.tagline || "")}">
<meta property="og:type" content="website">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDesc}">
${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${p.fontsHref}" rel="stylesheet">
<style>${css}</style>
${customHead}
</head>
<body>
${customBody}
<header class="nav">
  <span class="brand">${esc(d.logoText || d.businessName || "MARCA")}</span>
  <div class="nav-actions">${phoneHTML}<nav class="nav-links">${navLinks}${bookingNavLink}${hasWA ? `<a class="nav-cta" href="${wa}" target="_blank" rel="noopener">${S.navCta}</a>` : ""}</nav></div>
</header>

<section id="inicio" class="hero">
  <div class="hero-bg" style="background-image:url('${esc(imgUrl(d.heroImage))}')"></div>
  <div class="hero-overlay"></div>
  ${attributionHTML(d.heroImage, "attribution--hero")}
  <div class="hero-inner">
    <p class="eyebrow reveal">${esc(d.tagline || "")}</p>
    <h1 class="reveal" style="transition-delay:80ms">${esc(d.heroHeadline || "")}</h1>
    <p class="lede reveal" style="transition-delay:160ms">${esc(d.heroSubtext || "")}</p>
    <div class="reveal" style="transition-delay:240ms">
      ${bookingOn ? `<a class="btn" href="#reservar">${esc(d.ctaText || S.bookingBtnFallback)} →</a>` : hasWA ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">${esc(d.ctaText || S.heroCtaWa)} →</a>` : `<a class="btn" href="#contacto">${esc(d.ctaText || S.contactoFallback)} →</a>`}
    </div>
  </div>
  <div class="scroll-cue"></div>
</section>

<section id="nosotros" class="section">
  <div class="wrap">
    <div class="about-grid">
      <div>
        <p class="eyebrow reveal">${S.ebQuienes}</p>
        <h2 class="reveal">${esc(d.aboutTitle || "")}</h2>
        <p class="reveal" style="transition-delay:80ms">${esc(d.aboutText || "")}</p>
      </div>
      ${d.aboutImage ? `<div class="about-img reveal" style="transition-delay:120ms"><img src="${esc(imgUrl(d.aboutImage))}" alt="${S.navNosotros}" loading="lazy">${attributionHTML(d.aboutImage, "attribution--about")}</div>` : ""}
    </div>
  </div>
</section>

${stmtHTML}
${servicesHTML}
${galleryHTML}
${reviewsHTML}
${bookingHTML}
${socialHTML}

<section id="contacto" class="cta">
  <div class="wrap">
    <p class="eyebrow reveal">${S.ebEmpezamos}</p>
    <h2 class="reveal">${esc(d.ctaTitle || S.ctaTitleFallback)}</h2>
    <p class="reveal" style="transition-delay:80ms">${esc(d.ctaSubtext || S.ctaSubtextFallback)}</p>
    <div class="reveal" style="transition-delay:140ms">
      ${hasWA ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">${esc(d.contactCtaText || d.ctaText || S.contactCtaWa)} →</a>` : d.email ? `<a class="btn" href="mailto:${esc(d.email)}">${S.enviarCorreo} →</a>` : ""}
    </div>
  </div>
</section>

<footer>
  <div class="wrap foot">
    <div>
      <div class="foot-brand">${esc(d.logoText || d.businessName || "MARCA")}</div>
      <small>${[
        d.location ? esc(d.location) : "",
        d.phone ? `<a href="${telLink(d.phone)}">${esc(d.phone)}</a>` : "",
        d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : "",
      ].filter(Boolean).join("  ·  ")}</small>
    </div>
    <div class="foot-links">${socials}</div>
    ${footerAttributionHTML(unsplashAttributions)}
  </div>
  ${customFooter}
  ${lsBadgeHTML}
</footer>

${hasWA ? `<a class="wa wa--${waPosition} wa--${waSize}" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${waSVG}</a>` : ""}
<script>${js}</script>
</body>
</html>`;
}

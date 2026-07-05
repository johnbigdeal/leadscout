/* =========================================================================
   BIOLINK HTML GENERATOR
   Construye el HTML completo y auto-contenido de un sitio "link in bio"
   estilo Linktree a partir de un objeto de datos. Server-side, función pura:
   solo arma strings, sin dependencias externas (salvo Google Fonts).
   ========================================================================= */

/* ---------- helper de escape (copia local del de Paralux) ----------
   Escapa TODO texto que venga del usuario (nombre, bio, títulos, labels)
   para evitar romper el HTML o inyectar markup no deseado. */
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* Escape específico para valores dentro de atributos (href, style, etc.).
   Reutiliza esc(): comillas y ángulos ya quedan cubiertos. */
const escAttr = (s = "") => esc(s);

/* =========================================================================
   DICCIONARIO DE ÍCONOS (SVG inline, viewBox 0 0 24 24)
   Todos usan currentColor para heredar el color del contexto.
   ========================================================================= */
const ICONS: Record<string, string> = {
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.494 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.728-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2C0 8.09 0 12 0 12s0 3.91.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.91 24 12 24 12s0-3.91-.5-5.8zM9.6 15.6V8.4l6.27 3.6-6.27 3.6z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.29L17.61 20.65z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
};

/* Devuelve el SVG del icon key pedido; si no existe, cae en "link". */
const iconSVG = (key = "link") => ICONS[key] || ICONS.link;

/* =========================================================================
   FUENTES
   ========================================================================= */
type FontKey = "system" | "inter" | "poppins" | "montserrat" | "serif" | "mono";

/* Nombre de familia CSS por fuente. */
const FONT_STACK: Record<FontKey, string> = {
  system: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  inter: "'Inter',system-ui,sans-serif",
  poppins: "'Poppins',system-ui,sans-serif",
  montserrat: "'Montserrat',system-ui,sans-serif",
  serif: "Georgia,'Times New Roman',serif",
  mono: "ui-monospace,'SF Mono',Menlo,monospace",
};

/* Google Fonts href por fuente (solo para las que lo necesitan). */
const FONT_HREF: Partial<Record<FontKey, string>> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
};

/* =========================================================================
   UTILIDADES DE COLOR / TEXTO
   ========================================================================= */

/* Convierte un hex (#rrggbb o #rgb) a "r,g,b"; devuelve null si no es válido. */
const hexToRgb = (hex = ""): string | null => {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
};

/* rgba() a partir de un hex + alpha; si el hex es inválido cae a un gris. */
const rgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  return rgb ? `rgba(${rgb},${alpha})` : `rgba(127,127,127,${alpha})`;
};

/* Iniciales del nombre para el avatar sin imagen (máx. 2 letras). */
const initials = (name = ""): string => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* =========================================================================
   MAPEO DE REDES SOCIALES → icon + label accesible
   El orden fija cómo se muestran los íconos.
   ========================================================================= */
const SOCIAL_META: Array<{ key: string; icon: string; label: string }> = [
  { key: "instagram", icon: "instagram", label: "Instagram" },
  { key: "facebook", icon: "facebook", label: "Facebook" },
  { key: "whatsapp", icon: "whatsapp", label: "WhatsApp" },
  { key: "tiktok", icon: "tiktok", label: "TikTok" },
  { key: "youtube", icon: "youtube", label: "YouTube" },
  { key: "linkedin", icon: "linkedin", label: "LinkedIn" },
  { key: "x", icon: "x", label: "X" },
  { key: "website", icon: "globe", label: "Sitio web" },
  { key: "email", icon: "mail", label: "Email" },
];

/* =========================================================================
   LA FUNCIÓN
   ========================================================================= */
export function generateBiolinkHTML(
  d: Record<string, any>,
  opts: { showBadge?: boolean; allowCustomCode?: boolean; allowVerified?: boolean; websiteId?: string } = {},
): string {
  /* Insignia "Hecho con LeadScout": visible por defecto (igual que Paralux). */
  const showBadge = opts.showBadge !== false;

  /* Badge verificado (✓ azul junto al nombre): solo si el llamador lo habilita
     (plan Pro, resuelto server-side) y el usuario lo activó. */
  const verified = opts.allowVerified === true && d.verified === true;

  /* Id del sitio (para el beacon de conteo de clics). "" en el preview del builder. */
  const websiteId = typeof opts.websiteId === "string" ? opts.websiteId : "";

  /* Código HTML custom (head/body/footer). Solo se inyecta si el llamador lo
     habilita (plan Pro). Se interpola CRUDO, sin esc(): es HTML del usuario. */
  const allowCustomCode = opts.allowCustomCode === true;
  const customHead = allowCustomCode ? (d.customHead || "") : "";
  const customBody = allowCustomCode ? (d.customBody || "") : "";
  const customFooter = allowCustomCode ? (d.customFooter || "") : "";

  /* ---------- defaults sensatos (todo campo puede faltar) ---------- */
  const businessName = String(d.businessName ?? "Mi negocio") || "Mi negocio";
  const bio = String(d.bio ?? "");
  const avatar = String(d.avatar ?? "");
  const dark = d.dark === true;

  const bgType: "solid" | "gradient" | "animated" =
    d.bgType === "gradient" || d.bgType === "animated" ? d.bgType : "solid";
  const bgColor1 = String(d.bgColor1 ?? "#f4f4f5") || "#f4f4f5";
  const bgColor2 = String(d.bgColor2 ?? "#e4e4e7") || "#e4e4e7";
  const bgAngle = Number.isFinite(Number(d.bgAngle)) ? Number(d.bgAngle) : 135;

  const accent = String(d.accent ?? "#111827") || "#111827";
  const textColor = String(d.textColor ?? "#111827") || "#111827";
  const buttonTextColor = String(d.buttonTextColor ?? "#ffffff") || "#ffffff";

  const buttonStyle: "fill" | "outline" | "glass" | "soft" =
    d.buttonStyle === "outline" || d.buttonStyle === "glass" || d.buttonStyle === "soft"
      ? d.buttonStyle
      : "fill";
  const buttonRadius = Number.isFinite(Number(d.buttonRadius)) ? Number(d.buttonRadius) : 14;

  const font: FontKey = (["system", "inter", "poppins", "montserrat", "serif", "mono"] as FontKey[]).includes(
    d.font,
  )
    ? d.font
    : "system";

  const links: Array<Record<string, any>> = Array.isArray(d.links) ? d.links : [];
  const socials: Record<string, any> = d.socials && typeof d.socials === "object" ? d.socials : {};

  /* ---------- fondo de la página según bgType ---------- */
  let pageBg: string;
  if (bgType === "gradient" || bgType === "animated") {
    pageBg = `linear-gradient(${bgAngle}deg, ${escAttr(bgColor1)}, ${escAttr(bgColor2)})`;
  } else {
    pageBg = escAttr(bgColor1);
  }

  /* ---------- avatar (imagen o iniciales sobre accent) ---------- */
  const avatarHTML = avatar
    ? `<img class="bl-avatar" src="${escAttr(avatar)}" alt="${esc(businessName)}" loading="lazy" width="112" height="112">`
    : `<div class="bl-avatar bl-avatar--initials" aria-hidden="true">${esc(initials(businessName))}</div>`;

  /* ---------- botones-enlace (uno por link, en orden) ---------- */
  const linksHTML = links
    .map((l, i) => {
      const url = String(l?.url ?? "").trim();
      const title = String(l?.title ?? "").trim();
      if (!url && !title) return "";
      const icon = iconSVG(String(l?.icon ?? "link"));
      /* delay escalonado para la animación de entrada */
      const delay = 80 + i * 70;
      return `<a class="bl-link" href="${escAttr(url || "#")}" target="_blank" rel="noopener" data-lid="${escAttr(String(l.id ?? ""))}" style="animation-delay:${delay}ms"><span class="bl-link-ico">${icon}</span><span class="bl-link-txt">${esc(title || url)}</span><span class="bl-link-ico bl-link-ico--end" aria-hidden="true">${iconSVG("link")}</span></a>`;
    })
    .join("\n      ");

  /* ---------- fila de redes sociales ---------- */
  const socialsHTML = SOCIAL_META.map((s) => {
    const raw = String(socials?.[s.key] ?? "").trim();
    if (!raw) return "";
    /* email usa el mailto tal cual venga; el resto abre en pestaña nueva */
    const isEmail = s.key === "email";
    const target = isEmail ? "" : ' target="_blank" rel="noopener"';
    return `<a class="bl-social" href="${escAttr(raw)}"${target} aria-label="${esc(s.label)}" title="${esc(s.label)}">${iconSVG(s.icon)}</a>`;
  })
    .filter(Boolean)
    .join("\n        ");

  const socialsBlock = socialsHTML
    ? `<nav class="bl-socials" aria-label="Redes sociales">\n        ${socialsHTML}\n      </nav>`
    : "";

  /* ---------- meta og/twitter ---------- */
  const ogTitle = esc(businessName);
  const ogDesc = esc(bio);
  const ogImage = avatar ? escAttr(avatar) : "";

  /* ---------- fuente (Google Font si aplica) ---------- */
  const fontHref = FONT_HREF[font];
  const fontLinkHTML = fontHref
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontHref}" rel="stylesheet">`
    : "";

  /* ---------- estilos por variante de botón ---------- */
  let buttonCSS = "";
  if (buttonStyle === "fill") {
    buttonCSS = `.bl-link{background:${escAttr(accent)};color:${escAttr(buttonTextColor)};border:1px solid transparent;}`;
  } else if (buttonStyle === "outline") {
    buttonCSS = `.bl-link{background:transparent;color:${escAttr(accent)};border:2px solid ${escAttr(accent)};}`;
  } else if (buttonStyle === "glass") {
    buttonCSS = `.bl-link{background:${rgba(dark ? "#ffffff" : "#000000", dark ? 0.14 : 0.06)};color:${escAttr(textColor)};border:1px solid ${rgba(dark ? "#ffffff" : "#000000", 0.18)};-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);}`;
  } else {
    /* soft */
    buttonCSS = `.bl-link{background:${dark ? rgba("#ffffff", 0.08) : "#ffffff"};color:${escAttr(textColor)};border:1px solid ${rgba(dark ? "#ffffff" : "#000000", 0.06)};box-shadow:0 4px 16px rgba(0,0,0,${dark ? 0.35 : 0.1});}`;
  }

  /* Color de foco/acento derivado para outlines de accesibilidad. */
  const focusRing = rgba(accent, 0.55);

  /* Fondo animado: keyframes que mueven el background-position suavemente. */
  const animatedCSS =
    bgType === "animated"
      ? `body{background-size:200% 200%;animation:bl-bg-move 14s ease infinite;}
@keyframes bl-bg-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@media (prefers-reduced-motion:reduce){body{animation:none;}}`
      : "";

  /* =========================================================================
     CSS
     ========================================================================= */
  const css = `
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  font-family:${FONT_STACK[font]};
  min-height:100vh;min-height:100dvh;
  background:${pageBg};
  color:${escAttr(textColor)};
  display:flex;flex-direction:column;align-items:center;
  padding:48px 20px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
${animatedCSS}
.bl-card{
  width:100%;max-width:480px;margin:auto;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  gap:6px;
}
.bl-avatar{
  width:112px;height:112px;border-radius:50%;
  object-fit:cover;display:block;
  border:3px solid ${rgba(dark ? "#ffffff" : "#000000", dark ? 0.18 : 0.08)};
  box-shadow:0 8px 28px rgba(0,0,0,${dark ? 0.4 : 0.16});
  animation:bl-in .6s ease both;
}
.bl-avatar--initials{
  display:flex;align-items:center;justify-content:center;
  background:${escAttr(accent)};color:${escAttr(buttonTextColor)};
  font-size:40px;font-weight:700;letter-spacing:.5px;
}
.bl-name{
  margin-top:16px;font-size:24px;font-weight:700;
  color:${escAttr(textColor)};
  animation:bl-in .6s ease .05s both;
}
.bl-verified{display:inline-block;vertical-align:-3px;margin-left:4px;}
.bl-bio{
  margin-top:8px;font-size:15px;max-width:34ch;
  color:${escAttr(textColor)};opacity:.82;
  animation:bl-in .6s ease .1s both;
}
.bl-links{
  width:100%;margin-top:28px;
  display:flex;flex-direction:column;gap:14px;
}
.bl-link{
  display:flex;align-items:center;gap:12px;
  width:100%;min-height:56px;padding:14px 18px;
  border-radius:${buttonRadius}px;
  font-size:16px;font-weight:600;text-decoration:none;
  cursor:pointer;
  transition:transform .22s ease,box-shadow .22s ease,filter .22s ease,background .22s ease;
  animation:bl-in .5s ease both;
}
${buttonCSS}
.bl-link:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.03);box-shadow:0 10px 26px rgba(0,0,0,${dark ? 0.42 : 0.18});}
.bl-link:active{transform:translateY(0) scale(.99);}
.bl-link-ico{display:inline-flex;flex:0 0 auto;width:22px;height:22px;}
.bl-link-ico svg{width:100%;height:100%;display:block;}
.bl-link-txt{flex:1 1 auto;text-align:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bl-link-ico--end{opacity:0;width:22px;} /* espaciador para centrar el texto */
.bl-socials{
  margin-top:26px;
  display:flex;flex-wrap:wrap;justify-content:center;gap:14px;
  animation:bl-in .6s ease .2s both;
}
.bl-social{
  display:inline-flex;align-items:center;justify-content:center;
  width:44px;height:44px;border-radius:50%;
  color:${escAttr(textColor)};text-decoration:none;
  background:${rgba(dark ? "#ffffff" : "#000000", dark ? 0.1 : 0.05)};
  transition:transform .22s ease,background .22s ease,color .22s ease;
}
.bl-social svg{width:20px;height:20px;display:block;}
.bl-social:hover{transform:translateY(-2px);background:${escAttr(accent)};color:${escAttr(buttonTextColor)};}
a:focus-visible,.bl-link:focus-visible,.bl-social:focus-visible{
  outline:3px solid ${focusRing};outline-offset:3px;
}
@keyframes bl-in{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@media (prefers-reduced-motion:reduce){
  .bl-card *,.bl-avatar{animation:none !important;}
  .bl-link:hover,.bl-social:hover{transform:none;}
}
/* ---- Insignia LeadScout ---- */
.ls-badge-wrap{margin-top:36px;display:flex;justify-content:center;animation:bl-in .6s ease .3s both;}
.ls-badge{
  display:inline-flex;align-items:center;gap:7px;
  padding:7px 12px;border-radius:999px;text-decoration:none;
  font-size:13px;font-weight:500;
  color:${escAttr(textColor)};
  background:${rgba(dark ? "#ffffff" : "#000000", dark ? 0.1 : 0.05)};
  border:1px solid ${rgba(dark ? "#ffffff" : "#000000", 0.1)};
  transition:transform .2s ease,background .2s ease;
}
.ls-badge:hover{transform:translateY(-1px);background:${rgba(dark ? "#ffffff" : "#000000", dark ? 0.16 : 0.09)};}
.ls-badge img{display:block;}
.ls-badge strong{font-weight:700;}
`.trim();

  /* =========================================================================
     Insignia "Hecho con LeadScout" (mismo patrón que Paralux)
     ========================================================================= */
  const lsBadgeHTML = showBadge
    ? `<div class="ls-badge-wrap"><a class="ls-badge" href="https://leadscout.lat/?utm_source=cliente&utm_medium=badge&utm_campaign=hecho_con_leadscout" target="_blank" rel="noopener"><img src="https://leadscout.lat/brand/leadscout-mark${dark ? "-light" : ""}.png" alt="LeadScout" height="18" width="16" loading="lazy"><span>Hecho con <strong>LeadScout</strong></span></a></div>`
    : "";

  /* =========================================================================
     JS mínimo inline: mejora progresiva del foco por teclado.
     ========================================================================= */
  const clickTracker = websiteId
    ? "var __w=" + JSON.stringify(websiteId) + ";" +
      "document.addEventListener('click',function(e){" +
      "var a=e.target.closest&&e.target.closest('.bl-link[data-lid]');if(!a)return;" +
      "var lid=a.getAttribute('data-lid');if(!lid)return;" +
      "var body=JSON.stringify({w:__w,l:lid});" +
      "try{if(navigator.sendBeacon){navigator.sendBeacon('/api/biolink/click',new Blob([body],{type:'application/json'}));}" +
      "else{fetch('/api/biolink/click',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true});}}catch(err){}" +
      "});"
    : "";

  const js =
    "document.addEventListener('keydown',function(e){if(e.key==='Tab'){document.body.classList.add('bl-kb');}});" +
    "document.addEventListener('mousedown',function(){document.body.classList.remove('bl-kb');});" +
    clickTracker;

  /* =========================================================================
     DOCUMENTO
     ========================================================================= */
  return `<!doctype html>
<html lang="es"${dark ? ' data-theme="dark"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(businessName)}</title>
<meta name="description" content="${ogDesc}">
<meta name="theme-color" content="${escAttr(bgColor1)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}
<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDesc}">
${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}
${fontLinkHTML}
<style>${css}</style>
${customHead}
</head>
<body>
${customBody}
<main class="bl-card">
  ${avatarHTML}
  <h1 class="bl-name">${esc(businessName)}${verified ? ` <svg class="bl-verified" viewBox="0 0 24 24" width="20" height="20" role="img" aria-label="Verificado"><path fill="#1d9bf0" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-3.998-3.998-3.998-.494 0-.965.084-1.4.238C14.94 2.465 13.57 1.59 11.99 1.59S9.038 2.465 8.39 3.74c-.435-.154-.906-.238-1.4-.238-2.208 0-3.998 1.79-3.998 3.998 0 .495.084.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.58.875 2.95 2.147 3.6-.154.435-.238.906-.238 1.4 0 2.21 1.79 3.998 3.998 3.998.494 0 .965-.084 1.4-.238.65 1.272 2.02 2.147 3.6 2.147s2.95-.875 3.6-2.147c.435.154.906.238 1.4.238 2.208 0 3.998-1.79 3.998-3.998 0-.494-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"/><path fill="#fff" d="M9.8 15.9l-3-3 1.4-1.4 1.6 1.6 4.2-4.2 1.4 1.4z"/></svg>` : ""}</h1>
  ${bio ? `<p class="bl-bio">${esc(bio)}</p>` : ""}
  ${linksHTML ? `<div class="bl-links">\n      ${linksHTML}\n    </div>` : ""}
  ${socialsBlock}
  ${customFooter}
  ${lsBadgeHTML}
</main>
<script>${js}</script>
</body>
</html>`;
}

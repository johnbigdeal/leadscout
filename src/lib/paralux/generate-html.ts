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

const waLink = (num: string, msg: string) => {
  const n = onlyDigits(num);
  const t = encodeURIComponent(msg || "");
  return n ? `https://wa.me/${n}${t ? `?text=${t}` : ""}` : "#";
};

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
};

/* =========================================================================
   THE ENGINE
   ========================================================================= */
export function generateHTML(d: Record<string, any>) {
  const p = PRESETS[(d.preset as keyof typeof PRESETS) || "modern"];
  const c = d.dark ? p.dark : p.light;
  const wa = waLink(d.whatsappNumber || "", d.whatsappMessage || "");
  const hasWA = onlyDigits(d.whatsappNumber || "").length > 0;

  const services = (d.services || []).filter((s: any) => s.title || s.desc);
  const gallery = (d.gallery || []).filter(Boolean);

  const navLinks = [
    services.length ? '<a href="#servicios">Servicios</a>' : "",
    '<a href="#nosotros">Nosotros</a>',
    gallery.length ? '<a href="#galeria">Proyectos</a>' : "",
    '<a href="#contacto">Contacto</a>',
  ]
    .filter(Boolean)
    .join("");

  const servicesHTML = services.length
    ? `<section id="servicios" class="section">
        <div class="wrap">
          <p class="eyebrow reveal">Lo que hacemos</p>
          <h2 class="reveal">${esc(d.servicesTitle || "Servicios")}</h2>
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
          <p class="eyebrow reveal">Trabajo seleccionado</p>
          <h2 class="reveal">${esc(d.galleryTitle || "Proyectos")}</h2>
        </div>
        <div class="gallery">
          ${gallery
            .map(
              (src: string, i: number) => `
            <figure class="g-item reveal" style="transition-delay:${(i % 3) * 90}ms">
              <img src="${esc(src)}" alt="Proyecto ${i + 1}" loading="lazy"/>
            </figure>`,
            )
            .join("")}
        </div>
      </section>`
    : "";

  const stmtHTML = d.stmtText
    ? `<section class="stmt" style="background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url('${esc(d.stmtImage || "")}')">
        <div class="wrap">
          <p class="stmt-text reveal">${esc(d.stmtText)}</p>
        </div>
      </section>`
    : "";

  const socials = [
    d.instagram ? `<a href="${esc(d.instagram)}" target="_blank" rel="noopener">Instagram</a>` : "",
    d.facebook ? `<a href="${esc(d.facebook)}" target="_blank" rel="noopener">Facebook</a>` : "",
    d.website ? `<a href="${esc(d.website)}" target="_blank" rel="noopener">Web</a>` : "",
  ]
    .filter(Boolean)
    .join("");

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
  .nav-cta{padding:9px 18px;border:1px solid rgba(255,255,255,.4);border-radius:100px;color:#fff;font-size:.82rem}
  .nav.scrolled .nav-cta{border-color:var(--accent);color:var(--accent)}
  @media(max-width:760px){.nav-links{display:none}}

  /* hero */
  .hero{position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden}
  .hero-bg{position:absolute;inset:-12% 0;background-size:cover;background-position:center;will-change:transform;z-index:0}
  .hero-overlay{position:absolute;inset:0;z-index:1;
    background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.5) 55%,rgba(0,0,0,.72) 100%)}
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
  .about-img{aspect-ratio:4/5;border-radius:6px;overflow:hidden;background:var(--surface)}
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
  .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 8px;max-width:1400px;margin:48px auto 0}
  .g-item{aspect-ratio:4/5;overflow:hidden;border-radius:4px;background:var(--surface)}
  .g-item img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.8,.2,1)}
  .g-item:hover img{transform:scale(1.06)}
  @media(max-width:820px){.gallery{grid-template-columns:repeat(2,1fr)}}

  /* final cta */
  .cta{padding:140px 0;text-align:center;border-top:1px solid var(--line)}
  .cta h2{margin-bottom:18px}.cta p{color:var(--muted);max-width:48ch;margin:0 auto 34px}

  /* footer */
  footer{border-top:1px solid var(--line);padding:56px 0 64px}
  .foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:28px;align-items:flex-end}
  .foot-brand{font-family:'${p.display}',serif;font-weight:700;font-size:1.3rem}
  .foot small{display:block;color:var(--muted);margin-top:8px;font-size:.86rem}
  .foot-links{display:flex;gap:22px;flex-wrap:wrap}
  .foot-links a{color:var(--muted);font-size:.88rem;transition:.2s}.foot-links a:hover{color:var(--accent)}

  /* whatsapp fab */
  .wa{position:fixed;right:22px;bottom:22px;z-index:80;width:60px;height:60px;border-radius:50%;
    background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(37,211,102,.45);
    transition:.25s;animation:pulse 2.4s infinite}
  .wa:hover{transform:scale(1.08)}
  .wa svg{width:30px;height:30px;fill:#fff}
  @keyframes pulse{0%{box-shadow:0 10px 30px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.5)}
    70%{box-shadow:0 10px 30px rgba(37,211,102,.45),0 0 0 16px rgba(37,211,102,0)}
    100%{box-shadow:0 10px 30px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,0)}}

  /* reveal animation */
  .reveal{opacity:0;transform:translateY(26px);
    transition:opacity .9s cubic-bezier(.2,.8,.2,1),transform .9s cubic-bezier(.2,.8,.2,1)}
  .reveal.in{opacity:1;transform:none}
  @media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}
    .hero-bg{transform:none!important}.stmt{background-attachment:scroll}}
  `;

  const js =
    "document.addEventListener('DOMContentLoaded',function(){" +
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
    "els.forEach(function(el){io.observe(el);});});";

  const waSVG =
    '<svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.494 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.728-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.businessName || "Mi negocio")}</title>
<meta name="description" content="${esc(d.tagline || "")}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${p.fontsHref}" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header class="nav">
  <span class="brand">${esc(d.logoText || d.businessName || "MARCA")}</span>
  <nav class="nav-links">${navLinks}${hasWA ? `<a class="nav-cta" href="${wa}" target="_blank" rel="noopener">Cotizar</a>` : ""}</nav>
</header>

<section class="hero">
  <div class="hero-bg" style="background-image:url('${esc(d.heroImage || "")}')"></div>
  <div class="hero-overlay"></div>
  <div class="hero-inner">
    <p class="eyebrow reveal">${esc(d.tagline || "")}</p>
    <h1 class="reveal" style="transition-delay:80ms">${esc(d.heroHeadline || "")}</h1>
    <p class="lede reveal" style="transition-delay:160ms">${esc(d.heroSubtext || "")}</p>
    <div class="reveal" style="transition-delay:240ms">
      ${hasWA ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">${esc(d.ctaText || "Hablar por WhatsApp")} →</a>` : `<a class="btn" href="#contacto">${esc(d.ctaText || "Contáctanos")} →</a>`}
    </div>
  </div>
  <div class="scroll-cue"></div>
</section>

<section id="nosotros" class="section">
  <div class="wrap">
    <div class="about-grid">
      <div>
        <p class="eyebrow reveal">Quiénes somos</p>
        <h2 class="reveal">${esc(d.aboutTitle || "")}</h2>
        <p class="reveal" style="transition-delay:80ms">${esc(d.aboutText || "")}</p>
      </div>
      ${d.aboutImage ? `<div class="about-img reveal" style="transition-delay:120ms"><img src="${esc(d.aboutImage)}" alt="Nosotros" loading="lazy"></div>` : ""}
    </div>
  </div>
</section>

${stmtHTML}
${servicesHTML}
${galleryHTML}

<section id="contacto" class="cta">
  <div class="wrap">
    <p class="eyebrow reveal">¿Empezamos?</p>
    <h2 class="reveal">${esc(d.ctaTitle || "Cuéntanos sobre tu proyecto")}</h2>
    <p class="reveal" style="transition-delay:80ms">${esc(d.ctaSubtext || "Respondemos rápido. Escríbenos y agendemos una conversación.")}</p>
    <div class="reveal" style="transition-delay:140ms">
      ${hasWA ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">${esc(d.ctaText || "Escribir por WhatsApp")} →</a>` : d.email ? `<a class="btn" href="mailto:${esc(d.email)}">Enviar correo →</a>` : ""}
    </div>
  </div>
</section>

<footer>
  <div class="wrap foot">
    <div>
      <div class="foot-brand">${esc(d.logoText || d.businessName || "MARCA")}</div>
      <small>${esc([d.location, d.phone, d.email].filter(Boolean).join("  ·  "))}</small>
    </div>
    <div class="foot-links">${socials}</div>
  </div>
</footer>

${hasWA ? `<a class="wa" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${waSVG}</a>` : ""}
<script>${js}</script>
</body>
</html>`;
}

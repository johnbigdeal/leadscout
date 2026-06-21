import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles, Download, Monitor, Smartphone, MessageCircle, Plus,
  Trash2, Check, Copy, Loader2, X, Layers, Palette, Type, FileText, Phone
} from "lucide-react";
import { generateHTML } from "@/lib/paralux/generate-html";

/* =========================================================================
   PARALUX — Parallax landing builder
   - Left: content/style/contact form
   - Right: live preview (isolated iframe, real scroll + parallax)
   - "Generar con IA": calls Claude to draft minimalist marketing copy
   - "Exportar": standalone index.html ready for Vercel (parallax + WhatsApp)
   ========================================================================= */

/* ---------- style presets (for UI selection) ---------- */
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

const ACCENTS = ["#3B3BF5", "#1F6F6B", "#C2410C", "#7C3AED", "#0F172A", "#B5835A", "#DB2777", "#15803D"];

/* =========================================================================
   DEFAULT CONTENT (a tasteful sample so the preview looks good immediately)
   ========================================================================= */
const DEFAULT = {
  businessName: "Estudio Lumen",
  logoText: "LUMEN",
  tagline: "Arquitectura & Interiorismo",
  heroHeadline: "Espacios que respiran luz",
  heroSubtext: "Diseñamos interiores serenos y atemporales donde cada material y cada detalle tiene un propósito.",
  ctaText: "Hablar por WhatsApp",
  heroImage: "https://picsum.photos/seed/lumenhero/1800/1100",
  aboutTitle: "Diseño con intención",
  aboutText: "Somos un estudio enfocado en crear ambientes que equilibran función y emoción. Trabajamos de cerca con cada cliente, cuidando la proporción, la luz natural y la calidez de los materiales para que el resultado se sienta, antes de verse.",
  aboutImage: "https://picsum.photos/seed/lumenabout/1000/1250",
  stmtText: "El buen diseño es invisible: se siente antes de verse.",
  stmtImage: "https://picsum.photos/seed/lumenstmt/1800/1000",
  servicesTitle: "Cómo trabajamos",
  services: [
    { title: "Interiorismo", desc: "Proyectos integrales de interior, desde el concepto hasta el último detalle de ejecución." },
    { title: "Arquitectura", desc: "Diseño y desarrollo arquitectónico con foco en la luz, el espacio y la materialidad." },
    { title: "Consultoría", desc: "Acompañamiento y dirección creativa para tu obra, remodelación o nuevo espacio." },
  ],
  galleryTitle: "Proyectos recientes",
  gallery: [
    "https://picsum.photos/seed/lumeng1/900/1100",
    "https://picsum.photos/seed/lumeng2/900/1100",
    "https://picsum.photos/seed/lumeng3/900/1100",
    "https://picsum.photos/seed/lumeng4/900/1100",
    "https://picsum.photos/seed/lumeng5/900/1100",
    "https://picsum.photos/seed/lumeng6/900/1100",
  ],
  ctaTitle: "Cuéntanos sobre tu proyecto",
  ctaSubtext: "Respondemos rápido. Escríbenos y agendemos una conversación sin compromiso.",
  whatsappNumber: "521234567890",
  whatsappMessage: "Hola Estudio Lumen, vi su sitio y me gustaría una cotización.",
  email: "hola@estudiolumen.com",
  phone: "+52 123 456 7890",
  location: "Ciudad de México",
  instagram: "https://instagram.com/",
  facebook: "",
  website: "",
  preset: "modern",
  dark: false,
  accent: "#3B3BF5",
};

/* =========================================================================
   BUILDER UI
   ========================================================================= */
const BUILDER_CSS = `
:root{
  --ink:#141319;--ink-2:#1B1A22;--ink-3:#26252F;--line:#302E3B;
  --paper:#F6F5F2;--hi:#F4F3F7;--lo:#9B98A8;--accent:#4B4BFF;--ok:#2BB673;
}
.px-app{position:fixed;inset:0;display:flex;flex-direction:column;background:var(--ink);
  color:var(--hi);font-family:'Inter',system-ui,sans-serif;overflow:hidden}
.px-app *{box-sizing:border-box}
.px-top{height:56px;flex:0 0 56px;display:flex;align-items:center;justify-content:space-between;
  padding:0 18px;border-bottom:1px solid var(--line);background:var(--ink-2)}
.px-logo{display:flex;align-items:center;gap:9px;font-family:'Space Grotesk',sans-serif;
  font-weight:700;font-size:1.05rem;letter-spacing:.01em}
.px-logo .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.px-logo small{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--lo);
  letter-spacing:.12em;text-transform:uppercase;font-weight:500}
.px-seg{display:flex;background:var(--ink);border:1px solid var(--line);border-radius:9px;padding:3px}
.px-seg button{display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--lo);
  padding:6px 12px;border-radius:6px;font-size:.8rem;font-weight:500;cursor:pointer;font-family:inherit}
.px-seg button.on{background:var(--ink-3);color:var(--hi)}
.px-actions{display:flex;gap:10px}
.px-btn{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--ink-3);
  color:var(--hi);padding:8px 15px;border-radius:9px;font-size:.84rem;font-weight:600;cursor:pointer;
  font-family:inherit;transition:.15s}
.px-btn:hover{border-color:#46434f;background:#2d2c37}
.px-btn--ai{background:var(--accent);border-color:var(--accent);color:#fff}
.px-btn--ai:hover{background:#5a5aff;border-color:#5a5aff}
.px-btn--ok{background:var(--ok);border-color:var(--ok);color:#06210f}
.px-btn:disabled{opacity:.55;cursor:not-allowed}

.px-body{flex:1;display:flex;min-height:0}
.px-panel{width:392px;flex:0 0 392px;background:var(--ink-2);border-right:1px solid var(--line);
  display:flex;flex-direction:column;min-height:0}
.px-tabs{display:flex;gap:2px;padding:10px 12px 0;flex-wrap:wrap}
.px-tab{display:flex;align-items:center;gap:7px;background:none;border:none;color:var(--lo);
  padding:9px 12px;border-radius:8px 8px 0 0;font-size:.82rem;font-weight:500;cursor:pointer;font-family:inherit}
.px-tab.on{color:var(--hi);background:var(--ink);box-shadow:inset 0 -2px 0 var(--accent)}
.px-scroll{flex:1;overflow-y:auto;padding:22px;background:var(--ink)}
.px-scroll::-webkit-scrollbar{width:9px}
.px-scroll::-webkit-scrollbar-thumb{background:#34323d;border-radius:9px;border:2px solid var(--ink)}

.px-field{margin-bottom:17px}
.px-label{display:block;font-size:.72rem;font-weight:600;color:var(--lo);margin-bottom:7px;
  letter-spacing:.04em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}
.px-input,.px-area{width:100%;background:var(--ink-2);border:1px solid var(--line);color:var(--hi);
  padding:11px 13px;border-radius:9px;font-size:.9rem;font-family:inherit;transition:.15s;resize:vertical}
.px-input:focus,.px-area:focus{outline:none;border-color:var(--accent);background:#1d1c25}
.px-input::placeholder,.px-area::placeholder{color:#5d5a68}
.px-area{min-height:78px;line-height:1.5}
.px-hint{font-size:.74rem;color:#6a6776;margin-top:6px}

.px-sub{font-family:'Space Grotesk',sans-serif;font-size:.82rem;font-weight:600;color:var(--hi);
  margin:6px 0 14px;padding-bottom:9px;border-bottom:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-between}
.px-rep{border:1px solid var(--line);border-radius:11px;padding:13px;margin-bottom:11px;background:var(--ink-2);position:relative}
.px-rep .del{position:absolute;top:9px;right:9px;background:none;border:none;color:#6a6776;cursor:pointer;padding:4px;border-radius:6px}
.px-rep .del:hover{color:#ff6b6b;background:#2a1f23}
.px-add{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:none;
  border:1px dashed var(--line);color:var(--lo);padding:11px;border-radius:10px;font-size:.85rem;
  font-weight:500;cursor:pointer;font-family:inherit;transition:.15s}
.px-add:hover{border-color:var(--accent);color:var(--hi)}

.px-presets{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px}
.px-preset{background:var(--ink-2);border:1px solid var(--line);border-radius:10px;padding:13px 10px;
  cursor:pointer;text-align:center;transition:.15s}
.px-preset.on{border-color:var(--accent);background:#1d1c2b}
.px-preset b{display:block;font-size:.84rem;margin-bottom:3px}
.px-preset span{font-size:.68rem;color:var(--lo)}
.px-swatches{display:flex;gap:9px;flex-wrap:wrap;margin-top:4px}
.px-sw{width:30px;height:30px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:.15s}
.px-sw.on{border-color:#fff;transform:scale(1.12)}
.px-toggle{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;
  background:var(--ink-2);border:1px solid var(--line);border-radius:11px}
.px-switch{width:42px;height:24px;border-radius:14px;background:#34323d;position:relative;cursor:pointer;transition:.2s;flex:0 0 42px}
.px-switch.on{background:var(--accent)}
.px-switch i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s}
.px-switch.on i{left:21px}

/* preview */
.px-stage{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(circle at 50% 0%,#1a1922,#0e0d12);padding:26px;overflow:hidden}
.px-frame{background:#000;border:1px solid var(--line);border-radius:14px;overflow:hidden;
  box-shadow:0 40px 90px rgba(0,0,0,.5);transition:width .4s,height .4s;position:relative}
.px-frame iframe{width:100%;height:100%;border:none;display:block;background:#fff}
.px-bar{position:absolute;top:0;left:0;right:0;height:0}

/* modal */
.px-overlay{position:fixed;inset:0;background:rgba(8,7,11,.72);backdrop-filter:blur(6px);
  z-index:100;display:flex;align-items:center;justify-content:center;padding:24px}
.px-modal{background:var(--ink-2);border:1px solid var(--line);border-radius:18px;width:100%;max-width:560px;
  max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.px-mhead{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid var(--line)}
.px-mhead h3{font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:700}
.px-mhead p{font-size:.82rem;color:var(--lo);margin-top:3px}
.px-mclose{background:none;border:none;color:var(--lo);cursor:pointer;padding:6px;border-radius:8px}
.px-mclose:hover{color:var(--hi);background:var(--ink-3)}
.px-mbody{padding:22px;overflow-y:auto}
.px-code{background:var(--ink);border:1px solid var(--line);border-radius:11px;padding:14px;
  font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#b8b5c4;max-height:300px;overflow:auto;white-space:pre-wrap;line-height:1.5}
.px-steps{font-size:.86rem;color:var(--lo);line-height:1.7;margin-top:16px}
.px-steps code{background:var(--ink);padding:2px 7px;border-radius:5px;color:var(--accent);
  font-family:'JetBrains Mono',monospace;font-size:.82em}
@media(max-width:900px){.px-panel{width:330px;flex-basis:330px}}
`;

const TABS = [
  { id: "contenido", label: "Contenido", icon: FileText },
  { id: "imagenes", label: "Imágenes", icon: Layers },
  { id: "estilo", label: "Estilo", icon: Palette },
  { id: "contacto", label: "Contacto", icon: Phone },
];

export default function ParaluxBuilder({ initialData, onChange }) {
  const [d, setD] = useState({ ...DEFAULT, ...(initialData || {}) });
  const [tab, setTab] = useState("contenido");
  const [device, setDevice] = useState("desktop");
  const [preview, setPreview] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setD((o) => ({ ...o, [k]: v }));

  /* debounced preview generation + onChange */
  useEffect(() => {
    const t = setTimeout(() => {
      const html = generateHTML(d);
      setPreview(html);
      if (onChange) onChange(d, html);
    }, 280);
    return () => clearTimeout(t);
  }, [d]);

  /* services / gallery helpers */
  const addService = () => set("services", [...(d.services || []), { title: "", desc: "" }]);
  const updService = (i, k, v) =>
    set("services", d.services.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const delService = (i) => set("services", d.services.filter((_, idx) => idx !== i));

  const addGallery = () => set("gallery", [...(d.gallery || []), ""]);
  const updGallery = (i, v) => set("gallery", d.gallery.map((g, idx) => (idx === i ? v : g)));
  const delGallery = (i) => set("gallery", d.gallery.filter((_, idx) => idx !== i));

  const frameSize =
    device === "desktop"
      ? { width: "min(100%, 1180px)", height: "100%" }
      : { width: "390px", height: "min(100%, 760px)" };

  const download = () => {
    const blob = new Blob([generateHTML(d)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generateHTML(d));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) { /* ignore */ }
  };

  return (
    <>
      <style>{BUILDER_CSS}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="px-app">
        {/* top bar */}
        <div className="px-top">
          <div className="px-logo">
            <span className="dot" />
            Paralux <small>landing builder</small>
          </div>

          <div className="px-seg">
            <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>
              <Monitor size={15} /> Escritorio
            </button>
            <button className={device === "mobile" ? "on" : ""} onClick={() => setDevice("mobile")}>
              <Smartphone size={15} /> Móvil
            </button>
          </div>

          <div className="px-actions">
            <button className="px-btn px-btn--ai" onClick={() => setShowAI(true)}>
              <Sparkles size={15} /> Generar con IA
            </button>
            <button className="px-btn" onClick={() => setShowExport(true)}>
              <Download size={15} /> Exportar
            </button>
          </div>
        </div>

        <div className="px-body">
          {/* control panel */}
          <div className="px-panel">
            <div className="px-tabs">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} className={`px-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>

            <div className="px-scroll">
              {tab === "contenido" && (
                <>
                  <Field label="Nombre del negocio" v={d.businessName} on={(v) => set("businessName", v)} ph="Estudio Lumen" />
                  <Field label="Logo / marca (texto)" v={d.logoText} on={(v) => set("logoText", v)} ph="LUMEN" hint="Texto que aparece en la barra superior." />
                  <Field label="Bajada / rubro (eyebrow)" v={d.tagline} on={(v) => set("tagline", v)} ph="Arquitectura & Interiorismo" />
                  <Field label="Titular del hero" v={d.heroHeadline} on={(v) => set("heroHeadline", v)} ph="Espacios que respiran luz" area />
                  <Field label="Subtítulo del hero" v={d.heroSubtext} on={(v) => set("heroSubtext", v)} area />
                  <Field label="Texto del botón (CTA)" v={d.ctaText} on={(v) => set("ctaText", v)} ph="Hablar por WhatsApp" />

                  <div className="px-sub">Sección «Nosotros»</div>
                  <Field label="Título" v={d.aboutTitle} on={(v) => set("aboutTitle", v)} />
                  <Field label="Texto" v={d.aboutText} on={(v) => set("aboutText", v)} area />

                  <div className="px-sub">Frase destacada (parallax)</div>
                  <Field label="Cita / declaración" v={d.stmtText} on={(v) => set("stmtText", v)} area hint="Aparece sobre una imagen con efecto parallax. Déjalo vacío para omitir la sección." />

                  <div className="px-sub">
                    Servicios <span style={{ color: "var(--lo)", fontWeight: 400, fontSize: ".72rem" }}>{(d.services || []).length}</span>
                  </div>
                  <Field label="Título de la sección" v={d.servicesTitle} on={(v) => set("servicesTitle", v)} />
                  {(d.services || []).map((s, i) => (
                    <div className="px-rep" key={i}>
                      <button className="del" onClick={() => delService(i)}><Trash2 size={14} /></button>
                      <Field label={`Servicio ${i + 1}`} v={s.title} on={(v) => updService(i, "title", v)} ph="Interiorismo" />
                      <Field label="Descripción" v={s.desc} on={(v) => updService(i, "desc", v)} area />
                    </div>
                  ))}
                  <button className="px-add" onClick={addService}><Plus size={15} /> Agregar servicio</button>

                  <div className="px-sub" style={{ marginTop: 22 }}>Llamado final</div>
                  <Field label="Título" v={d.ctaTitle} on={(v) => set("ctaTitle", v)} />
                  <Field label="Subtítulo" v={d.ctaSubtext} on={(v) => set("ctaSubtext", v)} area />
                </>
              )}

              {tab === "imagenes" && (
                <>
                  <p className="px-hint" style={{ marginBottom: 18 }}>
                    Subí imágenes o pegá URLs. Las imágenes se suben a tu almacenamiento.
                  </p>
                  <ImageField label="Imagen del hero (fondo)" value={d.heroImage} onChange={(v) => set("heroImage", v)} />
                  <ImageField label="Imagen de «Nosotros»" value={d.aboutImage} onChange={(v) => set("aboutImage", v)} hint="Déjalo vacío para ocultar la imagen." />
                  <ImageField label="Imagen de la frase (parallax)" value={d.stmtImage} onChange={(v) => set("stmtImage", v)} />

                  <div className="px-sub">
                    Galería <span style={{ color: "var(--lo)", fontWeight: 400, fontSize: ".72rem" }}>{(d.gallery || []).length}</span>
                  </div>
                  <Field label="Título de la galería" v={d.galleryTitle} on={(v) => set("galleryTitle", v)} />
                  {(d.gallery || []).map((g, i) => (
                    <div className="px-rep" key={i}>
                      <button className="del" onClick={() => delGallery(i)}><Trash2 size={14} /></button>
                      <ImageField label={`Imagen ${i + 1}`} value={g} onChange={(v) => updGallery(i, v)} />
                    </div>
                  ))}
                  <button className="px-add" onClick={addGallery}><Plus size={15} /> Agregar imagen</button>
                </>
              )}

              {tab === "estilo" && (
                <>
                  <div className="px-field">
                    <span className="px-label">Estilo tipográfico</span>
                    <div className="px-presets">
                      {Object.entries(PRESETS).map(([k, v]) => (
                        <div key={k} className={`px-preset ${d.preset === k ? "on" : ""}`} onClick={() => set("preset", k)}>
                          <b style={{ fontFamily: `'${v.display}', serif` }}>Aa</b>
                          <span>{v.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-field">
                    <span className="px-label">Color de acento</span>
                    <div className="px-swatches">
                      {ACCENTS.map((a) => (
                        <div key={a} className={`px-sw ${d.accent === a ? "on" : ""}`} style={{ background: a }} onClick={() => set("accent", a)} />
                      ))}
                      <input type="color" value={d.accent} onChange={(e) => set("accent", e.target.value)}
                        style={{ width: 30, height: 30, padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: "50%" }} />
                    </div>
                    <p className="px-hint">Se usa en botones, números y enlaces. El último círculo abre el selector personalizado.</p>
                  </div>

                  <div className="px-field">
                    <span className="px-label">Modo oscuro de la página</span>
                    <div className="px-toggle">
                      <span style={{ fontSize: ".88rem" }}>{d.dark ? "Activado" : "Desactivado"}</span>
                      <div className={`px-switch ${d.dark ? "on" : ""}`} onClick={() => set("dark", !d.dark)}><i /></div>
                    </div>
                  </div>
                </>
              )}

              {tab === "contacto" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <MessageCircle size={15} color="#25D366" /> WhatsApp
                    </span>
                  </div>
                  <Field label="Número (con código de país)" v={d.whatsappNumber} on={(v) => set("whatsappNumber", v)} ph="521234567890"
                    hint="Solo dígitos, formato internacional. Ej: 52 = México, 57 = Colombia, 34 = España. Vacío = sin botón de WhatsApp." />
                  <Field label="Mensaje pre-cargado" v={d.whatsappMessage} on={(v) => set("whatsappMessage", v)} area
                    hint="Texto que el visitante verá ya escrito al abrir el chat." />

                  <div className="px-sub">Datos de contacto</div>
                  <Field label="Correo" v={d.email} on={(v) => set("email", v)} ph="hola@..." />
                  <Field label="Teléfono visible" v={d.phone} on={(v) => set("phone", v)} ph="+52 ..." />
                  <Field label="Ubicación" v={d.location} on={(v) => set("location", v)} ph="Ciudad de México" />

                  <div className="px-sub">Redes sociales</div>
                  <Field label="Instagram (URL)" v={d.instagram} on={(v) => set("instagram", v)} ph="https://instagram.com/..." />
                  <Field label="Facebook (URL)" v={d.facebook} on={(v) => set("facebook", v)} ph="https://facebook.com/..." />
                  <Field label="Sitio web (URL)" v={d.website} on={(v) => set("website", v)} ph="https://..." />
                </>
              )}
            </div>
          </div>

          {/* preview */}
          <div className="px-stage">
            <div className="px-frame" style={frameSize}>
              <iframe title="preview" srcDoc={preview} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" />
            </div>
          </div>
        </div>
      </div>

      {showAI && <AIModal d={d} setD={setD} onClose={() => setShowAI(false)} />}

      {showExport && (
        <div className="px-overlay" onClick={() => setShowExport(false)}>
          <div className="px-modal" onClick={(e) => e.stopPropagation()}>
            <div className="px-mhead">
              <div>
                <h3>Exportar para Vercel</h3>
                <p>Un único archivo <code style={{ color: "var(--accent)" }}>index.html</code>, listo para desplegar.</p>
              </div>
              <button className="px-mclose" onClick={() => setShowExport(false)}><X size={18} /></button>
            </div>
            <div className="px-mbody">
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <button className="px-btn px-btn--ai" onClick={download} style={{ flex: 1, justifyContent: "center" }}>
                  <Download size={15} /> Descargar index.html
                </button>
                <button className={`px-btn ${copied ? "px-btn--ok" : ""}`} onClick={copyCode} style={{ flex: 1, justifyContent: "center" }}>
                  {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar código</>}
                </button>
              </div>

              <div className="px-steps">
                <strong style={{ color: "var(--hi)" }}>Desplegar en 3 pasos:</strong><br />
                1. Crea una carpeta y guarda el archivo como <code>index.html</code>.<br />
                2. En la terminal: <code>npm i -g vercel</code> y luego <code>vercel</code>.<br />
                3. Acepta los valores por defecto → tu landing queda en línea.<br />
                <span style={{ display: "block", marginTop: 8, color: "#6a6776" }}>
                  O arrastra la carpeta a vercel.com/new. La guía explica cómo automatizar el deploy con la API de Vercel.
                </span>
              </div>

              <div className="px-sub" style={{ marginTop: 20 }}>Vista del código</div>
              <pre className="px-code">{generateHTML(d).slice(0, 1400) + "\n\n…  (código completo en el archivo descargado)"}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- reusable field ---------- */
function Field({ label, v, on, ph, hint, area }) {
  return (
    <div className="px-field">
      <span className="px-label">{label}</span>
      {area ? (
        <textarea className="px-area" value={v || ""} placeholder={ph} onChange={(e) => on(e.target.value)} />
      ) : (
        <input className="px-input" value={v || ""} placeholder={ph} onChange={(e) => on(e.target.value)} />
      )}
      {hint && <p className="px-hint">{hint}</p>}
    </div>
  );
}

/* ---------- image field with upload ---------- */
function ImageField({ label, value, onChange, hint }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        onChange(url);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="px-field">
      <span className="px-label">{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="px-input"
          value={value || ""}
          placeholder="https://..."
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <label style={{ position: "relative", cursor: "pointer" }}>
          <input type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={handleFile} />
          <span className="px-btn" style={{ padding: "8px 12px", fontSize: ".78rem" }}>
            {uploading ? "..." : "Subir"}
          </span>
        </label>
      </div>
      {hint && <p className="px-hint">{hint}</p>}
    </div>
  );
}

/* ---------- AI modal: drafts minimalist copy via Claude ---------- */
function AIModal({ d, setD, onClose }) {
  const [brief, setBrief] = useState({
    name: d.businessName || "",
    what: "",
    tone: "Profesional y cálido",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!brief.name.trim() || !brief.what.trim()) {
      setError("Completa al menos el nombre y qué hace el negocio.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const prompt =
        "Eres un copywriter experto en landing pages minimalistas y profesionales en español. " +
        "Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin markdown, sin explicaciones, sin ```.\n\n" +
        "Negocio: " + brief.name + "\n" +
        "Qué hace: " + brief.what + "\n" +
        "Tono: " + brief.tone + "\n\n" +
        "El JSON debe tener exactamente estas llaves (strings en español, breves y elegantes):\n" +
        "{\n" +
        '  "tagline": "rubro corto, 2-4 palabras",\n' +
        '  "heroHeadline": "titular potente, máx 7 palabras",\n' +
        '  "heroSubtext": "1 frase, máx 22 palabras",\n' +
        '  "ctaText": "texto de botón, 2-4 palabras",\n' +
        '  "aboutTitle": "título de sección nosotros, máx 4 palabras",\n' +
        '  "aboutText": "2-3 frases sobre el valor del negocio",\n' +
        '  "stmtText": "una cita/declaración memorable, máx 14 palabras",\n' +
        '  "servicesTitle": "título sección servicios, máx 4 palabras",\n' +
        '  "services": [ {"title":"...","desc":"1 frase"}, {"title":"...","desc":"1 frase"}, {"title":"...","desc":"1 frase"} ],\n' +
        '  "ctaTitle": "invitación a contactar, máx 6 palabras",\n' +
        '  "ctaSubtext": "1 frase amable de cierre",\n' +
        '  "whatsappMessage": "mensaje que el cliente enviaría por WhatsApp"\n' +
        "}";

      const res = await fetch("/api/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brief.name,
          what: brief.what,
          tone: brief.tone,
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const parsed = await res.json();

      setD((o) => ({
        ...o,
        businessName: brief.name,
        logoText: (brief.name || o.logoText).toUpperCase().slice(0, 16),
        tagline: parsed.tagline ?? o.tagline,
        heroHeadline: parsed.heroHeadline ?? o.heroHeadline,
        heroSubtext: parsed.heroSubtext ?? o.heroSubtext,
        ctaText: parsed.ctaText ?? o.ctaText,
        aboutTitle: parsed.aboutTitle ?? o.aboutTitle,
        aboutText: parsed.aboutText ?? o.aboutText,
        stmtText: parsed.stmtText ?? o.stmtText,
        servicesTitle: parsed.servicesTitle ?? o.servicesTitle,
        services: Array.isArray(parsed.services) && parsed.services.length ? parsed.services : o.services,
        ctaTitle: parsed.ctaTitle ?? o.ctaTitle,
        ctaSubtext: parsed.ctaSubtext ?? o.ctaSubtext,
        whatsappMessage: parsed.whatsappMessage ?? o.whatsappMessage,
      }));
      onClose();
    } catch (e) {
      setError("No se pudo generar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-overlay" onClick={onClose}>
      <div className="px-modal" onClick={(e) => e.stopPropagation()}>
        <div className="px-mhead">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Sparkles size={18} color="#4B4BFF" /> Generar contenido con IA
            </h3>
            <p>Describe el negocio y Claude redacta todo el texto de la landing.</p>
          </div>
          <button className="px-mclose" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="px-mbody">
          <Field label="Nombre del negocio" v={brief.name} on={(v) => setBrief({ ...brief, name: v })} ph="Estudio Lumen" />
          <Field label="¿Qué hace? (1-2 frases)" v={brief.what} on={(v) => setBrief({ ...brief, what: v })} area
            ph="Estudio de arquitectura e interiorismo enfocado en espacios cálidos y minimalistas." />
          <Field label="Tono / personalidad" v={brief.tone} on={(v) => setBrief({ ...brief, tone: v })} ph="Profesional y cálido" />

          {error && <p style={{ color: "#ff7a7a", fontSize: ".84rem", marginBottom: 12 }}>{error}</p>}

          <button className="px-btn px-btn--ai" onClick={run} disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
            {loading ? <><Loader2 size={16} className="px-spin" /> Generando…</> : <><Sparkles size={16} /> Redactar contenido</>}
          </button>
          <p className="px-hint" style={{ textAlign: "center", marginTop: 12 }}>
            Reemplaza titular, nosotros, servicios, frase destacada, CTA y mensaje de WhatsApp.
          </p>
        </div>
      </div>
      <style>{`.px-spin{animation:pxspin 1s linear infinite}@keyframes pxspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

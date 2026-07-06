import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Globe, Monitor, Smartphone, MessageCircle, Plus,
  Trash2, Loader2, X, Layers, Palette, Type, FileText, Phone, Search, Star, CalendarClock, Code
} from "lucide-react";
import { generateHTML } from "@/lib/paralux/generate-html";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { upload } from "@vercel/blob/client";

/* Header Authorization para las rutas /api/* protegidas con requireAuth. */
async function authHeaders() {
  try {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

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
  heroImage: { url: "https://picsum.photos/seed/lumenhero/1800/1100" },
  aboutTitle: "Diseño con intención",
  aboutText: "Somos un estudio enfocado en crear ambientes que equilibran función y emoción. Trabajamos de cerca con cada cliente, cuidando la proporción, la luz natural y la calidez de los materiales para que el resultado se sienta, antes de verse.",
  aboutImage: { url: "https://picsum.photos/seed/lumenabout/1000/1250" },
  stmtText: "El buen diseño es invisible: se siente antes de verse.",
  stmtImage: { url: "https://picsum.photos/seed/lumenstmt/1800/1000" },
  servicesTitle: "Cómo trabajamos",
  services: [
    { title: "Interiorismo", desc: "Proyectos integrales de interior, desde el concepto hasta el último detalle de ejecución." },
    { title: "Arquitectura", desc: "Diseño y desarrollo arquitectónico con foco en la luz, el espacio y la materialidad." },
    { title: "Consultoría", desc: "Acompañamiento y dirección creativa para tu obra, remodelación o nuevo espacio." },
  ],
  galleryTitle: "Proyectos recientes",
  gallery: [
    { url: "https://picsum.photos/seed/lumeng1/900/1100" },
    { url: "https://picsum.photos/seed/lumeng2/900/1100" },
    { url: "https://picsum.photos/seed/lumeng3/900/1100" },
  ],
  googleReviewsTitle: "Lo que dicen nuestros clientes",
  googleReviewUrl: "",
  googleReviews: [
    { author: "María González", rating: 5, text: "Excelente atención y un resultado impecable. Superaron nuestras expectativas." },
    { author: "Carlos Ramírez", rating: 5, text: "Profesionales, puntuales y con muchísimo gusto. Recomendados al 100%." },
    { author: "Lucía Fernández", rating: 5, text: "Transformaron por completo nuestro espacio. Volveríamos a contratarlos sin dudar." },
  ],
  socialTitle: "Conectá con nosotros",
  socialLinks: [
    { type: "instagram", url: "" },
    { type: "facebook", url: "" },
    { type: "whatsapp", url: "" },
  ],
  ctaTitle: "Cuéntanos sobre tu proyecto",
  ctaSubtext: "Respondemos rápido. Escríbenos y agendemos una conversación sin compromiso.",
  contactCtaText: "Escribir por WhatsApp",
  whatsappEnabled: true,
  whatsappNumber: "521234567890",
  whatsappMessage: "Hola Estudio Lumen, vi su sitio y me gustaría comprar.",
  whatsappPosition: "right",
  whatsappSize: "normal",
  bookingEnabled: false,
  bookingTitle: "Reservá tu turno",
  bookingSubtext: "Elegí día, horario y servicio. Te confirmamos por WhatsApp.",
  bookingButtonText: "Reservar por WhatsApp",
  bookingServices: [
    { name: "Consulta inicial", duration: 30, price: "" },
    { name: "Sesión de trabajo", duration: 60, price: "" },
  ],
  bookingDays: [1, 2, 3, 4, 5],
  bookingHoursStart: "09:00",
  bookingHoursEnd: "18:00",
  bookingInterval: 30,
  email: "hola@estudiolumen.com",
  phone: "+52 123 456 7890",
  location: "Ciudad de México",
  instagram: "https://instagram.com/",
  facebook: "",
  website: "",
  preset: "modern",
  dark: false,
  accent: "#3B3BF5",
  customHead: "",
  customBody: "",
  customFooter: "",
};

/* =========================================================================
   BUILDER UI
   ========================================================================= */
const BUILDER_CSS = `
:root{
  --ink:#141319;--ink-2:#1B1A22;--ink-3:#26252F;--line:#302E3B;
  --paper:#F6F5F2;--hi:#F4F3F7;--lo:#9B98A8;--accent:#4B4BFF;--ok:#2BB673;
}
.px-app{position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:var(--ink);
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
.px-stage{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  background:radial-gradient(circle at 50% 0%,#1a1922,#0e0d12);padding:26px;overflow:auto}
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
  { id: "resenas", label: "Reseñas", icon: Star },
  { id: "estilo", label: "Estilo", icon: Palette },
  { id: "contacto", label: "Contacto", icon: Phone },
  { id: "reservas", label: "Reservas", icon: CalendarClock },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "codigo", label: "Código", icon: Code },
];

const WEEKDAYS = [
  { n: 1, label: "Lun" }, { n: 2, label: "Mar" }, { n: 3, label: "Mié" },
  { n: 4, label: "Jue" }, { n: 5, label: "Vie" }, { n: 6, label: "Sáb" }, { n: 0, label: "Dom" },
];

const SOCIAL_TYPES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "website", label: "Sitio web" },
];

function normalizeImage(img) {
  if (!img) return { url: "" };
  if (typeof img === "string") return { url: img };
  return { url: img.url || "", author: img.author, authorUrl: img.authorUrl, unsplashUrl: img.unsplashUrl };
}

export default function ParaluxBuilder({ initialData, onChange, device, onDeviceChange, showAI, onShowAIChange, plan = "free" }) {
  const normalizedInitial = initialData
    ? {
        ...initialData,
        heroImage: normalizeImage(initialData.heroImage),
        aboutImage: normalizeImage(initialData.aboutImage),
        stmtImage: normalizeImage(initialData.stmtImage),
        gallery: (initialData.gallery || []).map(normalizeImage),
      }
    : {};
  const [d, setD] = useState({ ...DEFAULT, ...normalizedInitial });
  const [tab, setTab] = useState("contenido");
  const [preview, setPreview] = useState("");
  const internalDevice = device || "desktop";
  const internalShowAI = showAI || false;

  const set = (k, v) => setD((o) => ({ ...o, [k]: v }));

  /* debounced preview generation + onChange */
  useEffect(() => {
    const t = setTimeout(() => {
      const showBadge = plan === "pro" ? d.hideBadge !== true : true;
      const html = generateHTML(d, { showBadge, allowCustomCode: plan === "pro" });
      setPreview(html);
      if (onChange) onChange(d, html);
    }, 280);
    return () => clearTimeout(t);
  }, [d, plan]);

  /* services / gallery helpers */
  const addService = () => set("services", [...(d.services || []), { title: "", desc: "" }]);
  const updService = (i, k, v) =>
    set("services", d.services.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const delService = (i) => set("services", d.services.filter((_, idx) => idx !== i));

  const addGallery = () => set("gallery", [...(d.gallery || []), { url: "" }]);
  const updGallery = (i, v) => set("gallery", d.gallery.map((g, idx) => (idx === i ? v : g)));
  const delGallery = (i) => set("gallery", d.gallery.filter((_, idx) => idx !== i));

  /* google reviews helpers */
  const addReview = () => set("googleReviews", [...(d.googleReviews || []), { author: "", rating: 5, text: "" }]);
  const updReview = (i, k, v) =>
    set("googleReviews", d.googleReviews.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const delReview = (i) => set("googleReviews", d.googleReviews.filter((_, idx) => idx !== i));

  /* social links helpers */
  const addSocial = () => set("socialLinks", [...(d.socialLinks || []), { type: "instagram", url: "" }]);
  const updSocial = (i, k, v) =>
    set("socialLinks", d.socialLinks.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const delSocial = (i) => set("socialLinks", d.socialLinks.filter((_, idx) => idx !== i));

  /* booking services helpers */
  const addBookingService = () => set("bookingServices", [...(d.bookingServices || []), { name: "", duration: 30, price: "" }]);
  const updBookingService = (i, k, v) =>
    set("bookingServices", (d.bookingServices || []).map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const delBookingService = (i) => set("bookingServices", (d.bookingServices || []).filter((_, idx) => idx !== i));
  const toggleBookingDay = (n) => {
    const cur = Array.isArray(d.bookingDays) ? d.bookingDays : [];
    set("bookingDays", cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]);
  };

  const frameSize =
    internalDevice === "desktop"
      ? { width: "min(100%, 1180px)", height: "100%" }
      : { width: "390px", height: "min(100%, 760px)" };

  return (
    <>
      <style>{BUILDER_CSS}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="px-app">
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
                  <Field label="Texto del botón (CTA)" v={d.contactCtaText} on={(v) => set("contactCtaText", v)} ph="Escribir por WhatsApp" />
                </>
              )}

              {tab === "imagenes" && (
                <>
                  <UnsplashSearch
                    defaultQuery={d.businessName || d.tagline || "business"}
                    onSelect={(img, target) => {
                      const imageObj = {
                        url: img.url,
                        author: img.author,
                        authorUrl: img.authorUrl,
                        unsplashUrl: img.unsplashUrl,
                      };
                      if (target === "hero") set("heroImage", imageObj);
                      else if (target === "about") set("aboutImage", imageObj);
                      else if (target === "stmt") set("stmtImage", imageObj);
                      else if (target === "gallery") set("gallery", [...(d.gallery || []), imageObj]);
                      else {
                        if (!d.heroImage?.url) set("heroImage", imageObj);
                        else if (!d.aboutImage?.url) set("aboutImage", imageObj);
                        else if (!d.stmtImage?.url) set("stmtImage", imageObj);
                        else set("gallery", [...(d.gallery || []), imageObj]);
                      }
                    }}
                  />

                  <div className="px-sub" style={{ marginTop: 22 }}>Imágenes actuales</div>
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

              {tab === "resenas" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>Reseñas de Google</div>
                  <Field label="Título de la sección" v={d.googleReviewsTitle} on={(v) => set("googleReviewsTitle", v)} ph="Lo que dicen nuestros clientes" />
                  <Field
                    label="Enlace para dejar reseña en Google"
                    v={d.googleReviewUrl}
                    on={(v) => set("googleReviewUrl", v)}
                    ph="https://g.page/r/..."
                    hint="El botón “Dejá tu reseña en Google” lleva a este enlace. Sacalo del perfil de Google de tu negocio."
                  />

                  <div className="px-sub">
                    Reseñas <span style={{ color: "var(--lo)", fontWeight: 400, fontSize: ".72rem" }}>{(d.googleReviews || []).length}</span>
                  </div>
                  {(d.googleReviews || []).map((r, i) => (
                    <div className="px-rep" key={i}>
                      <button className="del" onClick={() => delReview(i)}><Trash2 size={14} /></button>
                      <Field label={`Cliente ${i + 1}`} v={r.author} on={(v) => updReview(i, "author", v)} ph="María González" />
                      <div className="px-field">
                        <span className="px-label">Estrellas</span>
                        <select
                          className="px-input"
                          value={r.rating || 5}
                          aria-label={`Estrellas de la reseña ${i + 1}`}
                          onChange={(e) => updReview(i, "rating", Number(e.target.value))}
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)} ({n})</option>
                          ))}
                        </select>
                      </div>
                      <Field label="Reseña" v={r.text} on={(v) => updReview(i, "text", v)} area ph="Excelente atención y resultado impecable." />
                    </div>
                  ))}
                  <button className="px-add" onClick={addReview}><Plus size={15} /> Agregar reseña</button>
                </>
              )}

              {tab === "estilo" && (
                <>
                  <div className="px-field">
                    <span className="px-label">Estilo tipográfico</span>
                    <div className="px-presets">
                      {Object.entries(PRESETS).map(([k, v]) => (
                        <button
                          type="button"
                          key={k}
                          className={`px-preset ${d.preset === k ? "on" : ""}`}
                          aria-pressed={d.preset === k}
                          onClick={() => set("preset", k)}
                          style={{ font: "inherit" }}
                        >
                          <b style={{ fontFamily: `'${v.display}', serif` }}>Aa</b>
                          <span>{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-field">
                    <span className="px-label">Color de acento</span>
                    <div className="px-swatches">
                      {ACCENTS.map((a) => (
                        <button
                          type="button"
                          key={a}
                          className={`px-sw ${d.accent === a ? "on" : ""}`}
                          style={{ background: a, padding: 0 }}
                          aria-label={`Color de acento ${a}`}
                          aria-pressed={d.accent === a}
                          onClick={() => set("accent", a)}
                        />
                      ))}
                      <input type="color" value={d.accent} onChange={(e) => set("accent", e.target.value)}
                        style={{ width: 30, height: 30, padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: "50%" }} />
                    </div>
                    <p className="px-hint">Se usa en botones, números y enlaces. El último círculo abre el selector personalizado.</p>
                  </div>

                  <div className="px-field">
                    <span className="px-label">Idioma del sitio</span>
                    <select
                      className="px-input"
                      value={d.lang === "en" ? "en" : "es"}
                      onChange={(e) => set("lang", e.target.value)}
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                    <p className="px-hint">Cambia los textos fijos de la plantilla (menú, secciones, botones). El contenido lo redacta la IA en el idioma elegido.</p>
                  </div>

                  <div className="px-field">
                    <span className="px-label">Modo oscuro de la página</span>
                    <div className="px-toggle">
                      <span style={{ fontSize: ".88rem" }}>{d.dark ? "Activado" : "Desactivado"}</span>
                      <button
                        type="button"
                        className={`px-switch ${d.dark ? "on" : ""}`}
                        aria-pressed={d.dark}
                        aria-label="Modo oscuro de la página"
                        onClick={() => set("dark", !d.dark)}
                        style={{ border: "none", padding: 0 }}
                      ><i /></button>
                    </div>
                  </div>

                  <div className="px-field">
                    <span className="px-label">
                      {'Insignia "Hecho con LeadScout"'}
                      {plan !== "pro" && (
                        <span style={{ marginLeft: 6, fontSize: ".7rem", opacity: 0.7 }}>🔒 Pro</span>
                      )}
                    </span>
                    <div className="px-toggle">
                      <span style={{ fontSize: ".88rem" }}>
                        {plan === "pro" && d.hideBadge ? "Oculta" : "Visible"}
                      </span>
                      <button
                        type="button"
                        className={`px-switch ${!(plan === "pro" && d.hideBadge) ? "on" : ""}`}
                        aria-pressed={!(plan === "pro" && d.hideBadge)}
                        aria-label="Mostrar insignia Hecho con LeadScout"
                        disabled={plan !== "pro"}
                        onClick={() => { if (plan === "pro") set("hideBadge", !d.hideBadge); }}
                        style={{ border: "none", padding: 0, cursor: plan === "pro" ? "pointer" : "not-allowed", opacity: plan === "pro" ? 1 : 0.55 }}
                      ><i /></button>
                    </div>
                    <p className="px-hint">
                      {plan === "pro"
                        ? "Como usuario Pro podés ocultar la insignia de LeadScout en tus sitios publicados."
                        : "Los sitios del plan Free siempre muestran la insignia de LeadScout. Mejorá a Pro para ocultarla."}
                    </p>
                  </div>
                </>
              )}

              {tab === "contacto" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>Datos de contacto</div>
                  <Field label="Correo" v={d.email} on={(v) => set("email", v)} ph="hola@..." />
                  <Field label="Teléfono visible" v={d.phone} on={(v) => set("phone", v)} ph="+52 ..." />
                  <Field label="Ubicación" v={d.location} on={(v) => set("location", v)} ph="Ciudad de México" />

                  <div className="px-sub">Enlaces del pie</div>
                  <Field label="Instagram (URL)" v={d.instagram} on={(v) => set("instagram", v)} ph="https://instagram.com/..." />
                  <Field label="Facebook (URL)" v={d.facebook} on={(v) => set("facebook", v)} ph="https://facebook.com/..." />
                  <Field label="Sitio web (URL)" v={d.website} on={(v) => set("website", v)} ph="https://..." />

                  <div className="px-sub">
                    Sección de redes (botones) <span style={{ color: "var(--lo)", fontWeight: 400, fontSize: ".72rem" }}>{(d.socialLinks || []).length}</span>
                  </div>
                  <Field label="Título de la sección" v={d.socialTitle} on={(v) => set("socialTitle", v)} ph="Conectá con nosotros" />
                  {(d.socialLinks || []).map((s, i) => (
                    <div className="px-rep" key={i}>
                      <button className="del" onClick={() => delSocial(i)}><Trash2 size={14} /></button>
                      <div className="px-field">
                        <span className="px-label">Red</span>
                        <select
                          className="px-input"
                          value={s.type}
                          aria-label={`Red social ${i + 1}`}
                          onChange={(e) => updSocial(i, "type", e.target.value)}
                        >
                          {SOCIAL_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <Field label="Enlace (URL) o usuario" v={s.url} on={(v) => updSocial(i, "url", v)} ph="tu_usuario o https://..." />
                      {!/[a-z0-9]/i.test((s.url || "").replace(/^https?:\/\//i, "").replace(/[@#/]/g, "")) && (
                        <p className="px-hint" style={{ color: "#e11d48", marginTop: 4 }}>
                          Falta el enlace real — poné tu usuario o link. Con “#” o vacío esta red no se muestra.
                        </p>
                      )}
                    </div>
                  ))}
                  <button className="px-add" onClick={addSocial}><Plus size={15} /> Agregar red social</button>
                  <p className="px-hint">Estos botones son los de la sección “Seguinos en redes”. Podés pegar el link completo o solo tu usuario (ej. <b>@miempresa</b>) y lo completamos. Los botones usan el color de acento de tu marca.</p>
                </>
              )}

              {tab === "reservas" && (
                <>
                  <div className="px-field">
                    <span className="px-label">Calendario de reservas</span>
                    <div className="px-toggle">
                      <span style={{ fontSize: ".88rem" }}>{d.bookingEnabled ? "Activado" : "Desactivado"}</span>
                      <button
                        type="button"
                        className={`px-switch ${d.bookingEnabled ? "on" : ""}`}
                        aria-pressed={!!d.bookingEnabled}
                        aria-label="Activar calendario de reservas"
                        onClick={() => set("bookingEnabled", !d.bookingEnabled)}
                        style={{ border: "none", padding: 0 }}
                      ><i /></button>
                    </div>
                    <p className="px-hint">Muestra una sección donde el visitante elige fecha, horario y servicio. Al enviar, se abre WhatsApp con la reserva ya escrita.</p>
                  </div>

                  {d.bookingEnabled && (
                    <>
                      {!(d.whatsappNumber || "").replace(/\D/g, "") && (
                        <p className="px-hint" style={{ color: "#ff7a7a" }} role="alert">
                          Configurá el número en la pestaña WhatsApp: las reservas se envían a ese número.
                        </p>
                      )}

                      <Field label="Título de la sección" v={d.bookingTitle} on={(v) => set("bookingTitle", v)} ph="Reservá tu turno" />
                      <Field label="Descripción" v={d.bookingSubtext} on={(v) => set("bookingSubtext", v)} area ph="Elegí día, horario y servicio. Te confirmamos por WhatsApp." />
                      <Field label="Texto del botón" v={d.bookingButtonText} on={(v) => set("bookingButtonText", v)} ph="Reservar por WhatsApp" />

                      <div className="px-sub">
                        Servicios <span style={{ color: "var(--lo)", fontWeight: 400, fontSize: ".72rem" }}>{(d.bookingServices || []).length}</span>
                      </div>
                      {(d.bookingServices || []).map((s, i) => (
                        <div className="px-rep" key={i}>
                          <button className="del" onClick={() => delBookingService(i)}><Trash2 size={14} /></button>
                          <Field label={`Servicio ${i + 1}`} v={s.name} on={(v) => updBookingService(i, "name", v)} ph="Consulta inicial" />
                          <div style={{ display: "flex", gap: 10 }}>
                            <div className="px-field" style={{ flex: 1, marginBottom: 0 }}>
                              <span className="px-label">Duración (min)</span>
                              <input
                                type="number"
                                min="0"
                                step="5"
                                className="px-input"
                                value={s.duration ?? ""}
                                aria-label={`Duración del servicio ${i + 1}`}
                                placeholder="30"
                                onChange={(e) => updBookingService(i, "duration", e.target.value === "" ? "" : Number(e.target.value))}
                              />
                            </div>
                            <div className="px-field" style={{ flex: 1, marginBottom: 0 }}>
                              <span className="px-label">Precio</span>
                              <input
                                className="px-input"
                                value={s.price || ""}
                                aria-label={`Precio del servicio ${i + 1}`}
                                placeholder="$500"
                                onChange={(e) => updBookingService(i, "price", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button className="px-add" onClick={addBookingService}><Plus size={15} /> Agregar servicio</button>

                      <div className="px-sub" style={{ marginTop: 22 }}>Días disponibles</div>
                      <div className="px-presets" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                        {WEEKDAYS.map((w) => {
                          const on = (d.bookingDays || []).includes(w.n);
                          return (
                            <button
                              type="button"
                              key={w.n}
                              className={`px-preset ${on ? "on" : ""}`}
                              aria-pressed={on}
                              onClick={() => toggleBookingDay(w.n)}
                              style={{ font: "inherit", padding: "10px 6px" }}
                            >
                              <span>{w.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="px-sub" style={{ marginTop: 22 }}>Horario de atención</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div className="px-field" style={{ flex: 1 }}>
                          <span className="px-label">Desde</span>
                          <input type="time" className="px-input" value={d.bookingHoursStart || "09:00"} aria-label="Hora de inicio" onChange={(e) => set("bookingHoursStart", e.target.value)} />
                        </div>
                        <div className="px-field" style={{ flex: 1 }}>
                          <span className="px-label">Hasta</span>
                          <input type="time" className="px-input" value={d.bookingHoursEnd || "18:00"} aria-label="Hora de fin" onChange={(e) => set("bookingHoursEnd", e.target.value)} />
                        </div>
                      </div>
                      <div className="px-field">
                        <span className="px-label">Intervalo entre turnos</span>
                        <select
                          className="px-input"
                          value={d.bookingInterval || 30}
                          aria-label="Intervalo entre turnos"
                          onChange={(e) => set("bookingInterval", Number(e.target.value))}
                        >
                          {[15, 30, 45, 60, 90, 120].map((n) => (
                            <option key={n} value={n}>{n} minutos</option>
                          ))}
                        </select>
                        <p className="px-hint">Con estos valores se generan las franjas horarias que puede elegir el visitante.</p>
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === "whatsapp" && (
                <>
                  <div className="px-field">
                    <span className="px-label">Mostrar botón flotante</span>
                    <div className="px-toggle">
                      <span style={{ fontSize: ".88rem" }}>{d.whatsappEnabled ? "Activado" : "Desactivado"}</span>
                      <button
                        type="button"
                        className={`px-switch ${d.whatsappEnabled ? "on" : ""}`}
                        aria-pressed={d.whatsappEnabled}
                        aria-label="Mostrar botón flotante de WhatsApp"
                        onClick={() => set("whatsappEnabled", !d.whatsappEnabled)}
                        style={{ border: "none", padding: 0 }}
                      ><i /></button>
                    </div>
                  </div>

                  {d.whatsappEnabled && (
                    <>
                      <Field label="Número de teléfono" v={d.whatsappNumber} on={(v) => set("whatsappNumber", v)} ph="521234567890"
                        hint="Solo dígitos, formato internacional. Ej: 52 = México, 57 = Colombia, 34 = España." />
                      <Field label="Mensaje pre-cargado" v={d.whatsappMessage} on={(v) => set("whatsappMessage", v)} area
                        hint="Texto que el visitante verá ya escrito al abrir el chat." />

                      <div className="px-field">
                        <span className="px-label">Posición</span>
                        <div className="px-presets">
                          {[
                            { k: "right", label: "Derecha" },
                            { k: "left", label: "Izquierda" },
                            { k: "center", label: "Centro abajo" },
                          ].map((p) => (
                            <button
                              type="button"
                              key={p.k}
                              className={`px-preset ${d.whatsappPosition === p.k ? "on" : ""}`}
                              aria-pressed={d.whatsappPosition === p.k}
                              onClick={() => set("whatsappPosition", p.k)}
                              style={{ font: "inherit" }}
                            >
                              <span>{p.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="px-field">
                        <span className="px-label">Tamaño</span>
                        <div className="px-presets">
                          {[
                            { k: "normal", label: "Normal" },
                            { k: "large", label: "Grande" },
                          ].map((s) => (
                            <button
                              type="button"
                              key={s.k}
                              className={`px-preset ${d.whatsappSize === s.k ? "on" : ""}`}
                              aria-pressed={d.whatsappSize === s.k}
                              onClick={() => set("whatsappSize", s.k)}
                              style={{ font: "inherit" }}
                            >
                              <span>{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                        <div style={{
                          width: d.whatsappSize === "large" ? 72 : 60,
                          height: d.whatsappSize === "large" ? 72 : 60,
                          borderRadius: "50%",
                          background: "#25D366",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 10px 30px rgba(37,211,102,.45)",
                        }}>
                          <svg viewBox="0 0 24 24" style={{ width: 30, height: 30, fill: "#fff" }}>
                            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.494 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.728-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                          </svg>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === "codigo" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>
                    Código personalizado
                    {plan !== "pro" && (
                      <span style={{ marginLeft: 6, fontSize: ".7rem", opacity: 0.7 }}>🔒 Pro</span>
                    )}
                  </div>

                  {plan === "pro" ? (
                    <>
                      <Field
                        label="Código en <head>"
                        area
                        v={d.customHead}
                        on={(v) => set("customHead", v)}
                        ph="<!-- Ej: etiqueta de Google Analytics, meta tags, estilos -->"
                        hint="Se inserta antes de </head>. Ideal para analytics, píxeles, meta tags o estilos."
                      />
                      <Field
                        label="Código en <body>"
                        area
                        v={d.customBody}
                        on={(v) => set("customBody", v)}
                        ph="<!-- Ej: script que debe correr al inicio del body -->"
                        hint="Se inserta justo al abrir el <body>."
                      />
                      <Field
                        label="Código en el footer"
                        area
                        v={d.customFooter}
                        on={(v) => set("customFooter", v)}
                        ph="<!-- Ej: widget de chat, script de conversión -->"
                        hint="Se inserta al final de la página, dentro del footer. Ideal para chat/embeds y scripts de terceros."
                      />
                      <p className="px-hint">
                        El código se inyecta tal cual en tu sitio publicado. Pegá solo código de fuentes en las que confíes.
                      </p>
                    </>
                  ) : (
                    <p className="px-hint">
                      Insertá tu propio código HTML en el {"<head>"}, {"<body>"} y footer de la página
                      (Google Analytics, píxeles de Meta, widgets de chat, embeds, etc.).
                      Esta función es exclusiva del plan Pro. Mejorá a Pro para habilitarla.
                    </p>
                  )}
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

      {internalShowAI && <AIModal d={d} setD={setD} onClose={() => onShowAIChange && onShowAIChange(false)} />}


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
  const [error, setError] = useState("");
  const isObject = value && typeof value === "object";
  const url = isObject ? value.url || "" : value || "";

  function updateUrl(newUrl) {
    if (isObject) {
      onChange({ ...value, url: newUrl });
    } else {
      onChange(newUrl);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      const msg = "El archivo debe ser una imagen.";
      setError(msg);
      toast.error(msg);
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const msg = "La imagen supera los 5MB. Probá con una más liviana.";
      setError(msg);
      toast.error(msg);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`paralux/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        headers: await authHeaders(),
        clientPayload: JSON.stringify({ kind: "image" }),
        contentType: file.type,
      });
      onChange(blob.url);
    } catch (err) {
      console.error("Upload failed", err);
      const msg = "No se pudo subir la imagen. Probá con otra.";
      setError(msg);
      toast.error(msg);
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
          value={url}
          placeholder="https://..."
          onChange={(e) => updateUrl(e.target.value)}
          style={{ flex: 1 }}
        />
        <label style={{ position: "relative", cursor: "pointer" }}>
          <input type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={handleFile} />
          <span className="px-btn" style={{ padding: "8px 12px", fontSize: ".78rem" }}>
            {uploading ? "..." : "Subir"}
          </span>
        </label>
      </div>
      {error && <p className="px-hint" style={{ color: "#ff7a7a" }} role="alert">{error}</p>}
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
    lang: d.lang === "en" ? "en" : "es",
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
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          name: brief.name,
          what: brief.what,
          tone: brief.tone,
          language: brief.lang,
        }),
      });
      if (!res.ok) {
        const msg = await res.json().then((b) => b?.error).catch(() => null);
        throw new Error(msg || "No se pudo generar. Revisa tu conexión e inténtalo de nuevo.");
      }
      const parsed = await res.json();

      setD((o) => ({
        ...o,
        lang: brief.lang,
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
        galleryTitle: parsed.galleryTitle ?? o.galleryTitle,
        googleReviewsTitle: parsed.googleReviewsTitle ?? o.googleReviewsTitle,
        socialTitle: parsed.socialTitle ?? o.socialTitle,
        ctaTitle: parsed.ctaTitle ?? o.ctaTitle,
        ctaSubtext: parsed.ctaSubtext ?? o.ctaSubtext,
        contactCtaText: parsed.contactCtaText ?? o.contactCtaText,
        /* whatsappMessage NO se toca: se respeta el mensaje precargado del lead. */
      }));
      onClose();
    } catch (e) {
      setError(e?.message || "No se pudo generar. Revisa tu conexión e inténtalo de nuevo.");
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

          <div className="px-field">
            <span className="px-label">Idioma del sitio</span>
            <select
              className="px-input"
              value={brief.lang}
              onChange={(e) => setBrief({ ...brief, lang: e.target.value })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

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

/* ---------- Unsplash image search ---------- */
function UnsplashSearch({ defaultQuery, onSelect }) {
  const [query, setQuery] = useState(defaultQuery);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  async function search(q = query) {
    if (!q.trim()) return;
    setError("");
    setHasSearched(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}&per_page=12`);
      if (!res.ok) throw new Error(`Search failed with status ${res.status}`);
      const data = await res.json();
      setImages(data.images || []);
    } catch (e) {
      console.error("Image search error:", e);
      setImages([]);
      setError("No se pudieron cargar las imágenes. Revisá tu conexión e intentá de nuevo.");
    }
    setLoading(false);
  }

  useEffect(() => {
    search(defaultQuery);
  }, [defaultQuery]);

  async function trackDownload(img) {
    if (!img.downloadLocation) return;
    try {
      await fetch("/api/images/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: img.downloadLocation }),
      });
    } catch (e) {
      console.error("Download tracking error:", e);
    }
  }

  function handleSelect(img) {
    setSelectedImage(img);
    trackDownload(img);
  }

  return (
    <div>
      <div className="px-sub" style={{ marginTop: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={15} /> Buscar imágenes
        </span>
      </div>

      <div className="px-field">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="px-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: barber shop, restaurant, lawyer..."
            onKeyDown={(e) => e.key === "Enter" && search()}
            style={{ flex: 1 }}
          />
          <button className="px-btn" onClick={() => search()} disabled={loading}>
            {loading ? <Loader2 size={14} className="px-spin" /> : <Search size={14} />}
            Buscar
          </button>
        </div>
      </div>

      {selectedImage && (
        <div className="px-rep" style={{ marginBottom: 14 }}>
          <p className="px-hint" style={{ marginBottom: 8 }}>
            Imagen seleccionada. ¿Dónde la querés usar?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="px-btn" onClick={() => { onSelect(selectedImage, "hero"); setSelectedImage(null); }}>Hero</button>
            <button className="px-btn" onClick={() => { onSelect(selectedImage, "about"); setSelectedImage(null); }}>Nosotros</button>
            <button className="px-btn" onClick={() => { onSelect(selectedImage, "stmt"); setSelectedImage(null); }}>Frase</button>
            <button className="px-btn" onClick={() => { onSelect(selectedImage, "gallery"); setSelectedImage(null); }}>Galería</button>
            <button className="px-btn px-btn--ai" onClick={() => { onSelect(selectedImage, "auto"); setSelectedImage(null); }}>Auto</button>
          </div>
        </div>
      )}

      <style>{`.px-skeleton{background:linear-gradient(90deg,#26252f,#34323d,#26252f);background-size:200% 100%;animation:pxpulse 1.2s ease-in-out infinite;border-radius:8px}@keyframes pxpulse{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        maxHeight: 320,
        overflowY: "auto",
        padding: 4,
      }}>
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={`sk-${i}`} className="px-skeleton" style={{ width: "100%", height: 80 }} aria-hidden="true" />
        ))}
        {!loading && images.map((img) => (
          <div
            key={img.id}
            onClick={() => handleSelect(img)}
            className="unsplash-thumb"
            style={{
              position: "relative",
              cursor: "pointer",
              borderRadius: 8,
              overflow: "hidden",
              border: selectedImage?.id === img.id ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "border .2s",
            }}
          >
            <img
              src={img.thumb}
              alt={img.alt}
              style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }}
              loading="lazy"
            />
            <div className="unsplash-attribution">
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 10, lineHeight: 1.3 }}>
                Photo by{" "}
                <a
                  href={img.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "#fff", textDecoration: "underline", fontWeight: 500 }}
                >
                  {img.author}
                </a>{" "}
                on{" "}
                <a
                  href={img.unsplashUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: "#fff", textDecoration: "underline", fontWeight: 500 }}
                >
                  Unsplash
                </a>
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && !loading && (
        <p className="px-hint" style={{ textAlign: "center", padding: "20px 0", color: "#ff7a7a" }} role="alert">
          {error}
        </p>
      )}

      {!error && !loading && !hasSearched && images.length === 0 && (
        <p className="px-hint" style={{ textAlign: "center", padding: "20px 0" }}>
          Escribí un término y buscá imágenes gratuitas de Unsplash.
        </p>
      )}

      {!error && !loading && hasSearched && images.length === 0 && (
        <p className="px-hint" style={{ textAlign: "center", padding: "20px 0" }}>
          No encontramos imágenes para esa búsqueda. Probá con otro término.
        </p>
      )}
    </div>
  );
}

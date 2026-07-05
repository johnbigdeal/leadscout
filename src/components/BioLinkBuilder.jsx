"use client";

import React, { useState, useEffect } from "react";
import {
  User, Link2, Share2, Palette, Sparkles, Plus, Trash2, GripVertical,
  Globe, MessageCircle, Camera, ThumbsUp, Music2, Play, Briefcase,
  AtSign, Phone, Mail, MapPin, Star, Calendar, Check, ChevronDown, Layout,
} from "lucide-react";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateBiolinkHTML } from "@/lib/biolink/generate-biolink-html";
import { createClient } from "@/lib/supabase/client";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";

/* Header Authorization para las rutas /api/* protegidas con requireAuth.
   (Mismo patrón que ParaluxBuilder — se reutiliza para la subida de avatar.) */
async function authHeaders() {
  try {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

/* =========================================================================
   BIOLINK BUILDER — editor visual de un sitio "link in bio" (estilo Linktree)
   - Izquierda: panel de edición con pestañas (Perfil, Enlaces, Redes,
     Apariencia, Temas)
   - Derecha: preview en vivo dentro de un marco de teléfono (iframe srcDoc)
   - Emite onChange(d, html) con debounce, igual que ParaluxBuilder.
   ========================================================================= */

/* Íconos válidos para cada enlace (contrato del objeto `d`). */
const ICONS = [
  "link", "globe", "whatsapp", "instagram", "facebook", "tiktok",
  "youtube", "linkedin", "x", "phone", "mail", "map", "star", "calendar",
];

/* Mapa ICON -> componente lucide para dibujar el selector en el editor. */
const ICON_COMP = {
  link: Link2, globe: Globe, whatsapp: MessageCircle, instagram: Camera,
  facebook: ThumbsUp, tiktok: Music2, youtube: Play, linkedin: Briefcase,
  x: AtSign, phone: Phone, mail: Mail, map: MapPin, star: Star, calendar: Calendar,
};

/* Redes de la pestaña "Redes": clave en `d.socials` + etiqueta + placeholder. */
const SOCIALS = [
  { key: "instagram", label: "Instagram", ph: "https://instagram.com/tu_usuario", Icon: Camera },
  { key: "facebook", label: "Facebook", ph: "https://facebook.com/tu_pagina", Icon: ThumbsUp },
  { key: "whatsapp", label: "WhatsApp", ph: "https://wa.me/521234567890", Icon: MessageCircle },
  { key: "tiktok", label: "TikTok", ph: "https://tiktok.com/@tu_usuario", Icon: Music2 },
  { key: "youtube", label: "YouTube", ph: "https://youtube.com/@tu_canal", Icon: Play },
  { key: "linkedin", label: "LinkedIn", ph: "https://linkedin.com/in/tu_perfil", Icon: Briefcase },
  { key: "x", label: "X (Twitter)", ph: "https://x.com/tu_usuario", Icon: AtSign },
  { key: "website", label: "Sitio web", ph: "https://tusitio.com", Icon: Globe },
  { key: "email", label: "Email", ph: "hola@tunegocio.com", Icon: Mail },
];

/* Tipografías disponibles (coinciden con el contrato `font`). */
const FONTS = [
  { value: "system", label: "Sistema" },
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "montserrat", label: "Montserrat" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

const BUTTON_STYLES = [
  { value: "fill", label: "Sólido" },
  { value: "outline", label: "Contorno" },
  { value: "glass", label: "Vidrio" },
  { value: "soft", label: "Suave" },
];

const BG_TYPES = [
  { value: "solid", label: "Sólido" },
  { value: "gradient", label: "Degradado" },
  { value: "animated", label: "Animado" },
];

/* Presets de la pestaña "Temas". Cada uno setea todos los campos de
   apariencia de una sola pasada (incluye `theme` con su id). */
const THEMES = [
  {
    id: "minimal", name: "Minimal",
    apply: {
      bgType: "solid", bgColor1: "#FFFFFF", bgColor2: "#F1F1F1", bgAngle: 135,
      accent: "#111111", textColor: "#111111", buttonTextColor: "#FFFFFF",
      buttonStyle: "fill", buttonRadius: 12, font: "inter", dark: false,
    },
  },
  {
    id: "neon", name: "Neón",
    apply: {
      bgType: "animated", bgColor1: "#0F0F1A", bgColor2: "#1B0A2E", bgAngle: 135,
      accent: "#00F5D4", textColor: "#F5F5FF", buttonTextColor: "#04120F",
      buttonStyle: "glass", buttonRadius: 16, font: "poppins", dark: true,
    },
  },
  {
    id: "pastel", name: "Pastel",
    apply: {
      bgType: "gradient", bgColor1: "#FDE7F3", bgColor2: "#E7F0FD", bgAngle: 160,
      accent: "#F06292", textColor: "#3A2B33", buttonTextColor: "#FFFFFF",
      buttonStyle: "soft", buttonRadius: 22, font: "poppins", dark: false,
    },
  },
  {
    id: "dark-pro", name: "Oscuro Pro",
    apply: {
      bgType: "solid", bgColor1: "#0B0B0F", bgColor2: "#16161D", bgAngle: 135,
      accent: "#7C5CFF", textColor: "#EDEDF2", buttonTextColor: "#FFFFFF",
      buttonStyle: "outline", buttonRadius: 10, font: "montserrat", dark: true,
    },
  },
  {
    id: "vibrant", name: "Degradado vibrante",
    apply: {
      bgType: "gradient", bgColor1: "#FF6A00", bgColor2: "#EE0979", bgAngle: 130,
      accent: "#FFFFFF", textColor: "#FFFFFF", buttonTextColor: "#EE0979",
      buttonStyle: "fill", buttonRadius: 30, font: "poppins", dark: true,
    },
  },
  {
    id: "retro", name: "Retro",
    apply: {
      bgType: "gradient", bgColor1: "#F4E2B8", bgColor2: "#E29578", bgAngle: 150,
      accent: "#6D4C3D", textColor: "#3B2A20", buttonTextColor: "#F8EFE2",
      buttonStyle: "soft", buttonRadius: 6, font: "serif", dark: false,
    },
  },
];

/* =========================================================================
   DEFAULT — contenido de ejemplo lindo para que se vea bien de una.
   El estado inicial es { ...DEFAULT, ...(initialData||{}) }.
   ========================================================================= */
const DEFAULT = {
  siteType: "biolink",
  businessName: "Café Aurora",
  avatar: "https://i.pravatar.cc/300?img=32",
  bio: "☕ Café de especialidad & pastelería artesanal. Pedidos, menú y reservas acá abajo 👇",
  links: [
    { id: "l1", title: "Ver el menú", url: "https://example.com/menu", icon: "star" },
    { id: "l2", title: "Reservar una mesa", url: "https://example.com/reservar", icon: "calendar" },
    { id: "l3", title: "Pedí por WhatsApp", url: "https://wa.me/521234567890", icon: "whatsapp" },
    { id: "l4", title: "Cómo llegar", url: "https://maps.google.com", icon: "map" },
  ],
  socials: {
    instagram: "https://instagram.com/cafe.aurora",
    facebook: "",
    whatsapp: "https://wa.me/521234567890",
    tiktok: "",
    youtube: "",
    linkedin: "",
    x: "",
    website: "",
    email: "hola@cafeaurora.com",
  },
  dark: false,
  bgType: "gradient",
  bgColor1: "#FDE7F3",
  bgColor2: "#E7F0FD",
  bgAngle: 160,
  accent: "#F06292",
  textColor: "#3A2B33",
  buttonTextColor: "#FFFFFF",
  buttonStyle: "soft",
  buttonRadius: 22,
  font: "poppins",
  theme: "pastel",
  hideBadge: false,
  customHead: "",
  customBody: "",
  customFooter: "",
};

/* Pestañas del panel de edición. */
const TABS = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "enlaces", label: "Enlaces", icon: Link2 },
  { id: "redes", label: "Redes", icon: Share2 },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "temas", label: "Temas", icon: Layout },
];

/* Genera un id de enlace único en cliente. */
function newLinkId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* =========================================================================
   COMPONENTE PRINCIPAL
   ========================================================================= */
export default function BioLinkBuilder({
  initialData,
  onChange,
  device,
  onDeviceChange,
  showAI,
  onShowAIChange,
  plan = "free",
}) {
  const [d, setD] = useState({ ...DEFAULT, ...(initialData || {}), siteType: "biolink" });
  const [tab, setTab] = useState("perfil");
  const [preview, setPreview] = useState("");
  /* Redes abiertas manualmente (para mostrar el input aunque su URL esté vacía). */
  const [openSocials, setOpenSocials] = useState(() => new Set());

  /* set(k,v): patch superficial del estado, idéntico a ParaluxBuilder. */
  const set = (k, v) => setD((o) => ({ ...o, [k]: v }));

  /* Preview con debounce (~280ms) + emisión de onChange(d, html). */
  useEffect(() => {
    const t = setTimeout(() => {
      const showBadge = plan === "pro" ? d.hideBadge !== true : true;
      const html = generateBiolinkHTML(d, { showBadge, allowCustomCode: plan === "pro" });
      setPreview(html);
      if (onChange) onChange(d, html);
    }, 280);
    return () => clearTimeout(t);
  }, [d, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- helpers de enlaces ---------- */
  const addLink = () =>
    set("links", [...(d.links || []), { id: newLinkId(), title: "", url: "", icon: "link" }]);
  const updLink = (id, k, v) =>
    set("links", (d.links || []).map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const delLink = (id) => set("links", (d.links || []).filter((l) => l.id !== id));

  /* ---------- helpers de redes ---------- */
  const setSocial = (key, value) => set("socials", { ...(d.socials || {}), [key]: value });

  /* ---------- drag & drop de enlaces (dnd-kit) ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = d.links || [];
    const from = list.findIndex((l) => l.id === active.id);
    const to = list.findIndex((l) => l.id === over.id);
    if (from === -1 || to === -1) return;
    set("links", arrayMove(list, from, to));
  }

  /* Aplica un preset de tema completo. */
  const applyTheme = (theme) => setD((o) => ({ ...o, ...theme.apply, theme: theme.id }));

  /* Marco del preview: teléfono (mobile-first) o ancho completo. */
  const internalDevice = device || "mobile";
  const frameSize =
    internalDevice === "desktop"
      ? { width: "min(100%, 900px)", height: "100%", borderRadius: 14 }
      : { width: 380, height: "min(100%, 760px)", borderRadius: 34 };

  const gradientOn = d.bgType === "gradient" || d.bgType === "animated";

  return (
    <>
      <style>{BUILDER_CSS}</style>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="px-app">
        <div className="px-body">
          {/* ================= panel de edición ================= */}
          <div className="px-panel">
            <div className="px-tabs">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`px-tab ${tab === t.id ? "on" : ""}`}
                    onClick={() => setTab(t.id)}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>

            <div className="px-scroll">
              {/* ---------------- PERFIL ---------------- */}
              {tab === "perfil" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>Tu perfil</div>
                  <AvatarField
                    label="Foto / avatar"
                    value={d.avatar}
                    onChange={(v) => set("avatar", v)}
                    hint="Subí una imagen o pegá una URL. Se muestra redonda arriba de todo."
                  />
                  <Field
                    label="Nombre o negocio"
                    v={d.businessName}
                    on={(v) => set("businessName", v)}
                    ph="Café Aurora"
                  />
                  <Field
                    label="Bio / descripción"
                    v={d.bio}
                    on={(v) => set("bio", v)}
                    area
                    ph="Contá en pocas palabras qué hacés. Podés usar emojis."
                    hint="Aparece debajo del nombre. Ideal 1-2 frases."
                  />
                </>
              )}

              {/* ---------------- ENLACES ---------------- */}
              {tab === "enlaces" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>
                    Enlaces
                    <span style={{ color: "var(--lo)", fontWeight: 400, fontSize: ".72rem" }}>
                      {(d.links || []).length}
                    </span>
                  </div>
                  <p className="px-hint" style={{ marginTop: -6, marginBottom: 14 }}>
                    Arrastrá con <GripVertical size={12} style={{ verticalAlign: "-2px" }} /> para
                    reordenar. Cada botón lleva a su enlace.
                  </p>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={(d.links || []).map((l) => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {(d.links || []).map((l) => (
                        <SortableLink
                          key={l.id}
                          link={l}
                          onUpd={(k, v) => updLink(l.id, k, v)}
                          onDel={() => delLink(l.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  <button className="px-add" onClick={addLink}>
                    <Plus size={15} /> Agregar enlace
                  </button>
                </>
              )}

              {/* ---------------- REDES ---------------- */}
              {tab === "redes" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>Redes sociales</div>
                  <p className="px-hint" style={{ marginTop: -6, marginBottom: 14 }}>
                    Activá cada red y pegá su enlace. Se muestran como íconos al pie del perfil.
                  </p>
                  {SOCIALS.map((s) => {
                    const value = (d.socials || {})[s.key] || "";
                    /* activa si tiene URL o si el usuario la abrió manualmente */
                    const on = value.trim() !== "" || openSocials.has(s.key);
                    const SIcon = s.Icon;
                    const toggle = () => {
                      if (on) {
                        /* desactivar: limpiar URL y colapsar */
                        setSocial(s.key, "");
                        setOpenSocials((prev) => {
                          const next = new Set(prev);
                          next.delete(s.key);
                          return next;
                        });
                      } else {
                        /* activar: abrir el input (URL sigue vacía hasta que escriba) */
                        setOpenSocials((prev) => new Set(prev).add(s.key));
                      }
                    };
                    return (
                      <div className="px-rep" key={s.key}>
                        <div
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            marginBottom: on ? 10 : 0,
                          }}
                        >
                          <span
                            style={{
                              display: "flex", alignItems: "center", gap: 9,
                              fontSize: ".88rem", fontWeight: 500,
                            }}
                          >
                            <SIcon size={16} /> {s.label}
                          </span>
                          <button
                            type="button"
                            className={`px-switch ${on ? "on" : ""}`}
                            aria-pressed={on}
                            aria-label={`Activar ${s.label}`}
                            style={{ border: "none", padding: 0 }}
                            onClick={toggle}
                          >
                            <i />
                          </button>
                        </div>
                        {on && (
                          <input
                            className="px-input"
                            value={value}
                            placeholder={s.ph}
                            aria-label={`Enlace de ${s.label}`}
                            onChange={(e) => setSocial(s.key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                  <p className="px-hint">
                    El toggle desactivado guarda un valor vacío (la red no se muestra en el sitio).
                  </p>
                </>
              )}

              {/* ---------------- APARIENCIA ---------------- */}
              {tab === "apariencia" && (
                <>
                  {/* Fondo */}
                  <div className="px-sub" style={{ marginTop: 0 }}>Fondo</div>
                  <div className="px-field">
                    <span className="px-label">Tipo de fondo</span>
                    <div className="px-presets">
                      {BG_TYPES.map((b) => (
                        <button
                          type="button"
                          key={b.value}
                          className={`px-preset ${d.bgType === b.value ? "on" : ""}`}
                          aria-pressed={d.bgType === b.value}
                          onClick={() => set("bgType", b.value)}
                          style={{ font: "inherit" }}
                        >
                          <span>{b.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <ColorField
                      label="Color 1"
                      value={d.bgColor1}
                      onChange={(v) => set("bgColor1", v)}
                    />
                    {gradientOn && (
                      <ColorField
                        label="Color 2"
                        value={d.bgColor2}
                        onChange={(v) => set("bgColor2", v)}
                      />
                    )}
                  </div>

                  {gradientOn && (
                    <RangeField
                      label="Ángulo del degradado"
                      value={d.bgAngle}
                      min={0}
                      max={360}
                      suffix="°"
                      onChange={(v) => set("bgAngle", v)}
                    />
                  )}

                  {/* Botones */}
                  <div className="px-sub">Botones</div>
                  <div className="px-field">
                    <span className="px-label">Estilo de botón</span>
                    <div className="px-presets" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      {BUTTON_STYLES.map((b) => (
                        <button
                          type="button"
                          key={b.value}
                          className={`px-preset ${d.buttonStyle === b.value ? "on" : ""}`}
                          aria-pressed={d.buttonStyle === b.value}
                          onClick={() => set("buttonStyle", b.value)}
                          style={{ font: "inherit" }}
                        >
                          <span>{b.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <RangeField
                    label="Redondeo de esquinas"
                    value={d.buttonRadius}
                    min={0}
                    max={40}
                    suffix="px"
                    onChange={(v) => set("buttonRadius", v)}
                  />

                  {/* Colores */}
                  <div className="px-sub">Colores</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <ColorField label="Acento" value={d.accent} onChange={(v) => set("accent", v)} />
                    <ColorField label="Texto" value={d.textColor} onChange={(v) => set("textColor", v)} />
                    <ColorField
                      label="Texto botón"
                      value={d.buttonTextColor}
                      onChange={(v) => set("buttonTextColor", v)}
                    />
                  </div>

                  {/* Tipografía */}
                  <div className="px-sub">Tipografía</div>
                  <div className="px-field">
                    <span className="px-label">Fuente</span>
                    <select
                      className="px-input"
                      value={d.font}
                      aria-label="Tipografía del sitio"
                      onChange={(e) => set("font", e.target.value)}
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Modo claro/oscuro */}
                  <div className="px-field">
                    <span className="px-label">Modo oscuro</span>
                    <div className="px-toggle">
                      <span style={{ fontSize: ".88rem" }}>{d.dark ? "Activado" : "Desactivado"}</span>
                      <button
                        type="button"
                        className={`px-switch ${d.dark ? "on" : ""}`}
                        aria-pressed={!!d.dark}
                        aria-label="Modo oscuro del sitio"
                        onClick={() => set("dark", !d.dark)}
                        style={{ border: "none", padding: 0 }}
                      >
                        <i />
                      </button>
                    </div>
                  </div>

                  {/* Insignia (Pro) — mismo gating que ParaluxBuilder */}
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
                        style={{
                          border: "none", padding: 0,
                          cursor: plan === "pro" ? "pointer" : "not-allowed",
                          opacity: plan === "pro" ? 1 : 0.55,
                        }}
                      >
                        <i />
                      </button>
                    </div>
                    <p className="px-hint">
                      {plan === "pro"
                        ? "Como usuario Pro podés ocultar la insignia de LeadScout."
                        : "Los sitios Free siempre muestran la insignia. Mejorá a Pro para ocultarla."}
                    </p>
                  </div>
                </>
              )}

              {/* ---------------- TEMAS ---------------- */}
              {tab === "temas" && (
                <>
                  <div className="px-sub" style={{ marginTop: 0 }}>Temas rápidos</div>
                  <p className="px-hint" style={{ marginTop: -6, marginBottom: 14 }}>
                    Un click aplica todos los colores, botones y tipografía. Después podés
                    ajustar cualquier detalle en «Apariencia».
                  </p>
                  <div className="px-presets" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {THEMES.map((th) => {
                      const on = d.theme === th.id;
                      const a = th.apply;
                      const bg = a.bgType === "solid"
                        ? a.bgColor1
                        : `linear-gradient(${a.bgAngle}deg, ${a.bgColor1}, ${a.bgColor2})`;
                      return (
                        <button
                          type="button"
                          key={th.id}
                          className={`px-preset ${on ? "on" : ""}`}
                          aria-pressed={on}
                          onClick={() => applyTheme(th)}
                          style={{ font: "inherit", padding: 0, overflow: "hidden" }}
                        >
                          {/* mini-preview del tema */}
                          <div
                            style={{
                              height: 70, background: bg,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center", gap: 5,
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%",
                              background: a.accent, border: "2px solid rgba(255,255,255,.5)",
                            }} />
                            <div style={{
                              width: "62%", height: 9, borderRadius: a.buttonRadius / 3,
                              background: a.buttonStyle === "outline" ? "transparent" : a.accent,
                              border: a.buttonStyle === "outline" ? `1.5px solid ${a.accent}` : "none",
                            }} />
                          </div>
                          <div style={{
                            padding: "8px 6px", display: "flex", alignItems: "center",
                            justifyContent: "center", gap: 6,
                          }}>
                            {on && <Check size={13} />}
                            <b style={{ fontSize: ".82rem" }}>{th.name}</b>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ================= preview ================= */}
          <div className="px-stage">
            <div className="px-frame" style={frameSize}>
              <iframe
                title="preview"
                srcDoc={preview}
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================================================
   SUB-COMPONENTES
   ========================================================================= */

/* Enlace ordenable (drag & drop con dnd-kit). */
function SortableLink({ link, onUpd, onDel }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: link.id });
  const [iconOpen, setIconOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 2 : "auto",
  };

  const CurIcon = ICON_COMP[link.icon] || Link2;

  return (
    <div className="px-rep" ref={setNodeRef} style={style}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* asa de arrastre */}
        <button
          type="button"
          className="bl-grip"
          aria-label="Arrastrar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="px-field" style={{ marginBottom: 10 }}>
            <span className="px-label">Título</span>
            <input
              className="px-input"
              value={link.title || ""}
              placeholder="Ver el menú"
              aria-label="Título del enlace"
              onChange={(e) => onUpd("title", e.target.value)}
            />
          </div>
          <div className="px-field" style={{ marginBottom: 10 }}>
            <span className="px-label">Enlace (URL)</span>
            <input
              className="px-input"
              value={link.url || ""}
              placeholder="https://..."
              aria-label="URL del enlace"
              onChange={(e) => onUpd("url", e.target.value)}
            />
          </div>

          {/* selector de ícono */}
          <div className="px-field" style={{ marginBottom: 0, position: "relative" }}>
            <span className="px-label">Ícono</span>
            <button
              type="button"
              className="px-input"
              aria-haspopup="listbox"
              aria-expanded={iconOpen}
              onClick={() => setIconOpen((o) => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 9, textTransform: "capitalize" }}>
                <CurIcon size={16} /> {link.icon}
              </span>
              <ChevronDown size={15} />
            </button>
            {iconOpen && (
              <div className="bl-iconpop" role="listbox">
                {ICONS.map((ic) => {
                  const IC = ICON_COMP[ic] || Link2;
                  const sel = ic === link.icon;
                  return (
                    <button
                      type="button"
                      key={ic}
                      role="option"
                      aria-selected={sel}
                      className={`bl-iconopt ${sel ? "on" : ""}`}
                      title={ic}
                      onClick={() => { onUpd("icon", ic); setIconOpen(false); }}
                    >
                      <IC size={17} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* borrar */}
        <button
          type="button"
          className="bl-del"
          aria-label="Borrar enlace"
          onClick={onDel}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* Campo de texto reutilizable (input o textarea), igual que ParaluxBuilder. */
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

/* Selector de color en vivo (input type=color + hex editable). */
function ColorField({ label, value, onChange }) {
  return (
    <div className="px-field" style={{ flex: 1, minWidth: 0 }}>
      <span className="px-label">{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={value || "#000000"}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 38, height: 38, padding: 0, border: "1px solid var(--line)",
            borderRadius: 9, background: "none", cursor: "pointer", flex: "0 0 38px",
          }}
        />
        <input
          className="px-input"
          value={value || ""}
          aria-label={`${label} (hex)`}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: ".78rem" }}
        />
      </div>
    </div>
  );
}

/* Deslizador (range) con valor visible. */
function RangeField({ label, value, min, max, suffix = "", onChange }) {
  return (
    <div className="px-field">
      <span className="px-label" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span style={{ color: "var(--hi)" }}>{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}

/* Campo de avatar: subida a Vercel Blob (mismo patrón que ImageField) + URL. */
function AvatarField({ label, value, onChange, hint }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
      const blob = await upload(`biolink/${file.name}`, file, {
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
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* vista previa redonda del avatar */}
        <div className="bl-avatar">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Avatar" />
          ) : (
            <User size={22} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="px-input"
            value={value || ""}
            placeholder="https://..."
            aria-label="URL del avatar"
            onChange={(e) => onChange(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <label style={{ position: "relative", cursor: "pointer", display: "inline-block" }}>
            <input
              type="file"
              accept="image/*"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              onChange={handleFile}
            />
            <span className="px-btn" style={{ padding: "8px 14px", fontSize: ".8rem" }}>
              {uploading ? "Subiendo…" : "Subir imagen"}
            </span>
          </label>
        </div>
      </div>
      {error && <p className="px-hint" style={{ color: "#ff7a7a" }} role="alert">{error}</p>}
      {hint && <p className="px-hint">{hint}</p>}
    </div>
  );
}

/* =========================================================================
   CSS del builder — reutiliza las clases px-* de ParaluxBuilder (mismo look)
   y agrega unas pocas clases bl-* propias del BioLink. Se inyecta local para
   que el componente sea autosuficiente aunque ParaluxBuilder no esté montado.
   ========================================================================= */
const BUILDER_CSS = `
:root{
  --ink:#141319;--ink-2:#1B1A22;--ink-3:#26252F;--line:#302E3B;
  --hi:#F4F3F7;--lo:#9B98A8;--accent:#4B4BFF;
}
.px-app{position:relative;width:100%;height:100%;display:flex;flex-direction:column;background:var(--ink);
  color:var(--hi);font-family:'Inter',system-ui,sans-serif;overflow:hidden}
.px-app *{box-sizing:border-box}
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
  margin:20px 0 14px;padding-bottom:9px;border-bottom:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-between}
.px-rep{border:1px solid var(--line);border-radius:11px;padding:13px;margin-bottom:11px;background:var(--ink-2);position:relative}
.px-add{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:none;
  border:1px dashed var(--line);color:var(--lo);padding:11px;border-radius:10px;font-size:.85rem;
  font-weight:500;cursor:pointer;font-family:inherit;transition:.15s}
.px-add:hover{border-color:var(--accent);color:var(--hi)}

.px-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--ink-3);
  color:var(--hi);padding:8px 15px;border-radius:9px;font-size:.84rem;font-weight:600;cursor:pointer;
  font-family:inherit;transition:.15s}
.px-btn:hover{border-color:#46434f;background:#2d2c37}

.px-presets{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px}
.px-preset{background:var(--ink-2);border:1px solid var(--line);border-radius:10px;padding:11px 8px;
  cursor:pointer;text-align:center;transition:.15s;color:var(--hi)}
.px-preset.on{border-color:var(--accent);background:#1d1c2b}
.px-preset b{display:block;font-size:.84rem}
.px-preset span{font-size:.74rem;color:var(--lo)}
.px-preset.on span{color:var(--hi)}
.px-toggle{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;
  background:var(--ink-2);border:1px solid var(--line);border-radius:11px}
.px-switch{width:42px;height:24px;border-radius:14px;background:#34323d;position:relative;cursor:pointer;transition:.2s;flex:0 0 42px}
.px-switch.on{background:var(--accent)}
.px-switch:disabled{cursor:not-allowed}
.px-switch i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s}
.px-switch.on i{left:21px}

/* preview stage / phone frame */
.px-stage{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  background:radial-gradient(circle at 50% 0%,#1a1922,#0e0d12);padding:26px;overflow:auto}
.px-frame{background:#000;border:1px solid var(--line);overflow:hidden;
  box-shadow:0 40px 90px rgba(0,0,0,.5);transition:width .35s,height .35s;position:relative}
.px-frame iframe{width:100%;height:100%;border:none;display:block;background:#fff}

/* bio-link specific */
.bl-grip{background:none;border:none;color:#6a6776;cursor:grab;padding:6px 2px;border-radius:6px;
  touch-action:none;flex:0 0 auto}
.bl-grip:active{cursor:grabbing}
.bl-grip:hover{color:var(--hi)}
.bl-del{background:none;border:none;color:#6a6776;cursor:pointer;padding:6px;border-radius:6px;flex:0 0 auto}
.bl-del:hover{color:#ff6b6b;background:#2a1f23}
.bl-iconpop{position:absolute;top:100%;left:0;right:0;margin-top:6px;z-index:20;
  background:var(--ink-3);border:1px solid var(--line);border-radius:11px;padding:9px;
  display:grid;grid-template-columns:repeat(7,1fr);gap:5px;box-shadow:0 18px 40px rgba(0,0,0,.5)}
.bl-iconopt{display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;
  background:var(--ink-2);border:1px solid transparent;color:var(--hi);cursor:pointer;transition:.12s}
.bl-iconopt:hover{border-color:#46434f;background:#2d2c37}
.bl-iconopt.on{border-color:var(--accent);background:#1d1c2b;color:#fff}
.bl-avatar{width:64px;height:64px;border-radius:50%;overflow:hidden;flex:0 0 64px;
  background:var(--ink-3);border:1px solid var(--line);display:flex;align-items:center;
  justify-content:center;color:var(--lo)}
.bl-avatar img{width:100%;height:100%;object-fit:cover;display:block}
@media(max-width:900px){.px-panel{width:330px;flex-basis:330px}}
`;

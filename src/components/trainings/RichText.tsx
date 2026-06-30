"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

/** Renderiza HTML enriquecido (Tiptap) sanitizado. */
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  const clean = useMemo(() => {
    if (!html) return "";
    if (typeof window === "undefined") return ""; // se hidrata en cliente
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "code", "pre"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });
  }, [html]);

  if (!clean) return null;
  return (
    <div
      className={className ?? "prose prose-sm max-w-none text-zinc-700"}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

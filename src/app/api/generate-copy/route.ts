import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* POST /api/generate-copy */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { name, what, tone } = await request.json();
  if (!name || !what) {
    return NextResponse.json({ error: "name and what are required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const prompt =
    "Eres un copywriter experto en landing pages minimalistas y profesionales en español. " +
    "Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin markdown, sin explicaciones, sin ```.\n\n" +
    `Negocio: ${name}\n` +
    `Qué hace: ${what}\n` +
    `Tono: ${tone || "Profesional y cálido"}\n\n` +
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

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "AI generation failed" }, { status: 500 });
  }
}

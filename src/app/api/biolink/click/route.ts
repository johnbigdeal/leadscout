import { db } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* POST /api/biolink/click — público (sin auth). Cuenta un clic de un enlace del
   biolink publicado. Incrementa atómicamente data.clickCounts[linkId] en una sola
   sentencia (el row-lock de Postgres hace el incremento seguro ante concurrencia).
   No se persiste ningún dato personal del visitante. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const w = typeof body?.w === "string" ? body.w : "";
    const l = typeof body?.l === "string" ? body.l : "";

    if (!UUID_RE.test(w) || !l || l.length > 128) {
      return new Response(null, { status: 204 });
    }

    await db
      .update(websites)
      .set({
        data: sql`${websites.data} || jsonb_build_object(
          'clickCounts',
          COALESCE(${websites.data}->'clickCounts', '{}'::jsonb) || jsonb_build_object(
            ${l}::text,
            COALESCE((${websites.data}#>>ARRAY['clickCounts', ${l}::text])::int, 0) + 1
          )
        )`,
      })
      .where(eq(websites.id, w));
  } catch {
    /* nunca romper la navegación del visitante por un fallo de conteo */
  }
  return new Response(null, { status: 204 });
}

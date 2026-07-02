import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { availableDomains, subscriptions } from "@/lib/db/schema";
import { and, eq, or, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ACCESS_LEVELS = ["both", "free", "pro"] as const;

async function getPlan(orgId: string): Promise<string> {
  const [sub] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);
  return sub?.plan || "free";
}

/* GET /api/domains/available — dominios que la org puede usar para publicar.
   Super admin: ve todos (propios + todos los globales) para gestionar.
   Usuario normal: sus propios + globales cuyo accessLevel matchee su plan. */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  if (ctx.isSuperAdmin) {
    const rows = await db
      .select()
      .from(availableDomains)
      .where(or(eq(availableDomains.isGlobal, true), eq(availableDomains.orgId, ctx.orgId)));
    return NextResponse.json(rows);
  }

  const plan = await getPlan(ctx.orgId);
  const allowedLevels = plan === "pro" ? ["pro", "both"] : ["free", "both"];

  const rows = await db
    .select()
    .from(availableDomains)
    .where(
      or(
        eq(availableDomains.orgId, ctx.orgId),
        and(eq(availableDomains.isGlobal, true), inArray(availableDomains.accessLevel, allowedLevels)),
      ),
    );

  return NextResponse.json(rows);
}

/* POST /api/domains/available — agregar un dominio.
   isGlobal/accessLevel solo los puede setear el super admin. */
export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { domain, zoneId, isDefault, isGlobal, accessLevel } = await request.json();
  if (!domain || !zoneId) {
    return NextResponse.json({ error: "domain and zoneId required" }, { status: 400 });
  }

  const global = ctx.isSuperAdmin ? !!isGlobal : false;
  const level = ctx.isSuperAdmin && ACCESS_LEVELS.includes(accessLevel) ? accessLevel : "both";

  /* If marking as default, clear other defaults for this org */
  if (isDefault) {
    await db
      .update(availableDomains)
      .set({ isDefault: false })
      .where(eq(availableDomains.orgId, ctx.orgId));
  }

  const [row] = await db
    .insert(availableDomains)
    .values({
      orgId: ctx.orgId,
      domain: domain.trim(),
      zoneId: zoneId.trim(),
      isDefault: isDefault || false,
      isGlobal: global,
      accessLevel: level,
    })
    .returning();

  return NextResponse.json(row);
}

/* PATCH /api/domains/available?id=xxx — activar/desactivar/default/global/acceso. */
export async function PATCH(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(availableDomains)
    .where(eq(availableDomains.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  /* Solo el dueño del dominio o el super admin pueden modificarlo. */
  if (existing.orgId !== ctx.orgId && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  /* Whitelist de campos; isGlobal/accessLevel solo para super admin. */
  const patch: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
  if (typeof body.isDefault === "boolean") patch.isDefault = body.isDefault;
  if (ctx.isSuperAdmin) {
    if (typeof body.isGlobal === "boolean") patch.isGlobal = body.isGlobal;
    if (ACCESS_LEVELS.includes(body.accessLevel)) patch.accessLevel = body.accessLevel;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  /* Al promover a global: si ya existe otra fila global del mismo dominio,
     no crear un duplicado (hay un índice único parcial por dominio global).
     Consolidar en la fila global existente en vez de fallar con 500. */
  if (patch.isGlobal === true) {
    const [existingGlobal] = await db
      .select()
      .from(availableDomains)
      .where(and(eq(availableDomains.domain, existing.domain), eq(availableDomains.isGlobal, true)))
      .limit(1);
    if (existingGlobal && existingGlobal.id !== id) {
      const globalPatch: Record<string, unknown> = {};
      if (typeof patch.accessLevel === "string") globalPatch.accessLevel = patch.accessLevel;
      if (Object.keys(globalPatch).length > 0) {
        await db.update(availableDomains).set(globalPatch).where(eq(availableDomains.id, existingGlobal.id));
      }
      const [g] = await db.select().from(availableDomains).where(eq(availableDomains.id, existingGlobal.id)).limit(1);
      return NextResponse.json(g);
    }
  }

  /* If marking as default, clear other defaults for this org */
  if (patch.isDefault === true) {
    await db
      .update(availableDomains)
      .set({ isDefault: false })
      .where(eq(availableDomains.orgId, existing.orgId ?? ctx.orgId));
  }

  try {
    const [updated] = await db
      .update(availableDomains)
      .set(patch)
      .where(eq(availableDomains.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (e) {
    const msg = (e as { code?: string })?.code === "23505"
      ? "Ese dominio ya está disponible para todos."
      : "No se pudo actualizar el dominio.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}

/* DELETE /api/domains/available?id=xxx — quitar dominio del pool. */
export async function DELETE(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(availableDomains)
    .where(eq(availableDomains.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ success: true });

  if (existing.orgId !== ctx.orgId && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(availableDomains).where(eq(availableDomains.id, id));
  return NextResponse.json({ success: true });
}

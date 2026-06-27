import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { services, memberships } from "@/lib/db/schema";
import { canCreateService } from "@/lib/plans";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.orgId, ctx.orgId))
    .orderBy(services.name);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { name, defaultCost, currency, recurrence } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!(await canCreateService(ctx.orgId))) {
    return NextResponse.json(
      { error: "Límite de servicios alcanzado. Upgrade a Pro para ilimitados." },
      { status: 403 },
    );
  }
  const [svc] = await db.insert(services).values({
    orgId: ctx.orgId, name: name.trim(),
    defaultCost: String(defaultCost ?? 0),
    currency: currency || "USD",
    recurrence: recurrence || "one_time",
  }).onConflictDoNothing().returning();
  if (!svc) return NextResponse.json({ error: "Already exists" }, { status: 409 });
  return NextResponse.json(svc);
}

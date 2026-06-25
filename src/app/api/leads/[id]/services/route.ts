import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, leadServices, services, memberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const rows = await db
    .select({
      id: leadServices.id,
      leadId: leadServices.leadId,
      serviceId: leadServices.serviceId,
      cost: leadServices.cost,
      recurrence: leadServices.recurrence,
      createdAt: leadServices.createdAt,
      serviceName: services.name,
      defaultCost: services.defaultCost,
    })
    .from(leadServices)
    .innerJoin(services, eq(leadServices.serviceId, services.id))
    .where(and(eq(leadServices.leadId, leadId), eq(services.orgId, ctx.orgId)));
  return NextResponse.json(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { serviceId, cost, recurrence } = await request.json();

  const [lead] = await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.orgId, ctx.orgId))).limit(1);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const [svc] = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.orgId, ctx.orgId))).limit(1);
  if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const [ls] = await db.insert(leadServices).values({
    leadId, serviceId, cost: String(cost ?? 0),
    recurrence: recurrence || svc.recurrence || "one_time",
  }).onConflictDoNothing().returning();
  if (!ls) return NextResponse.json({ error: "Already exists" }, { status: 409 });
  return NextResponse.json({ ...ls, serviceName: svc.name });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await params;
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { serviceId } = await request.json();

  const [lead] = await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.orgId, ctx.orgId))).limit(1);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  await db.delete(leadServices).where(
    and(eq(leadServices.leadId, leadId), eq(leadServices.serviceId, serviceId)),
  );
  return NextResponse.json({ ok: true });
}

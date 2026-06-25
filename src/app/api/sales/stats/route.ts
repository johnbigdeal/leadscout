import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads, leadServices, services, memberships } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

function toMonthly(cost: number, recurrence: string): number {
  if (recurrence === "monthly") return cost;
  if (recurrence === "annual") return cost / 12;
  if (recurrence === "lifetime") return cost / 12;
  return 0;
}

export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get("pipelineId");

  const orgLeads = await db
    .select({ id: leads.id, stage: leads.stage, createdAt: leads.createdAt })
    .from(leads)
    .where(pipelineId ? and(eq(leads.orgId, ctx.orgId), eq(leads.pipelineId, pipelineId)) : eq(leads.orgId, ctx.orgId));

  const leadIds = orgLeads.map(l => l.id);

  const svcRows = leadIds.length > 0
    ? await db
        .select({
          leadId: leadServices.leadId,
          cost: leadServices.cost,
          recurrence: leadServices.recurrence,
          serviceName: services.name,
        })
        .from(leadServices)
        .innerJoin(services, eq(leadServices.serviceId, services.id))
        .where(inArray(leadServices.leadId, leadIds))
    : [];

  const costByLead: Record<string, { cost: number; services: string[]; mrr: number }> = {};
  for (const s of svcRows) {
    if (!costByLead[s.leadId]) costByLead[s.leadId] = { cost: 0, services: [], mrr: 0 };
    const c = Number(s.cost);
    costByLead[s.leadId].cost += c;
    costByLead[s.leadId].mrr += toMonthly(c, s.recurrence);
    costByLead[s.leadId].services.push(s.serviceName);
  }

  let potentialRevenue = 0;
  let potentialMrr = 0;
  let closedRevenue = 0;
  let closedMrr = 0;
  let wonCount = 0;

  const potentialByStage: Record<string, number> = {};
  const closedByRecurrence: Record<string, number> = {};
  const mrrByRecurrence: Record<string, number> = {};

  for (const lead of orgLeads) {
    const c = costByLead[lead.id]?.cost ?? 0;
    const m = costByLead[lead.id]?.mrr ?? 0;
    if (lead.stage === "won") {
      closedRevenue += c;
      closedMrr += m;
      wonCount++;
    } else if (lead.stage !== "lost") {
      potentialRevenue += c;
      potentialMrr += m;
      potentialByStage[lead.stage] = (potentialByStage[lead.stage] || 0) + c;
    }
  }

  for (const s of svcRows) {
    const lead = orgLeads.find(l => l.id === s.leadId);
    if (!lead) continue;
    if (lead.stage === "won") {
      closedByRecurrence[s.recurrence] = (closedByRecurrence[s.recurrence] || 0) + Number(s.cost);
      if (s.recurrence !== "one_time") {
        mrrByRecurrence[s.recurrence] = (mrrByRecurrence[s.recurrence] || 0) + toMonthly(Number(s.cost), s.recurrence);
      }
    }
  }

  const wonLeads = orgLeads.filter(l => l.stage === "won");
  const monthlyRevenue: Record<string, number> = {};
  for (const lead of wonLeads) {
    const month = lead.createdAt.toISOString().slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (costByLead[lead.id]?.cost ?? 0);
  }

  const stageCounts: Record<string, number> = {};
  for (const lead of orgLeads) {
    stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
  }

  const recurrenceBreakdown: Record<string, number> = {};
  for (const s of svcRows) {
    recurrenceBreakdown[s.recurrence] = (recurrenceBreakdown[s.recurrence] || 0) + Number(s.cost);
  }

  return NextResponse.json({
    potentialRevenue,
    potentialMrr,
    closedRevenue,
    closedMrr,
    arr: closedMrr * 12,
    wonCount,
    totalLeads: orgLeads.length,
    monthlyRevenue,
    stageCounts,
    potentialByStage,
    closedByRecurrence,
    mrrByRecurrence,
    hasServices: svcRows.length > 0,
  });
}

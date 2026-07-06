import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { planConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* PATCH /api/admin/plan-configs/[id] */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "name", "description", "price", "currency", "interval",
    "popular", "features", "limitations",
    "stripePriceId", "paypalPlanId", "isActive",
  ];

  const updateData: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }
  updateData.updatedAt = new Date();

  const [plan] = await db
    .update(planConfigs)
    .set(updateData)
    .where(eq(planConfigs.id, id))
    .returning();

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

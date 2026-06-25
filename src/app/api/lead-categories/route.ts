import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leadCategories, memberships } from "@/lib/db/schema";
import { canCreateCategory } from "@/lib/plans";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const rows = await db.select().from(leadCategories).where(eq(leadCategories.orgId, ctx.orgId)).orderBy(leadCategories.name);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;
  const { name, color } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!(await canCreateCategory(ctx.orgId))) {
    return NextResponse.json(
      { error: "Límite de categorías alcanzado. Upgrade a Pro para ilimitadas." },
      { status: 403 },
    );
  }
  const [cat] = await db.insert(leadCategories).values({
    orgId: ctx.orgId, name: name.trim(), color: color || "#0369A1",
  }).onConflictDoNothing().returning();
  if (!cat) return NextResponse.json({ error: "Already exists" }, { status: 409 });
  return NextResponse.json(cat);
}

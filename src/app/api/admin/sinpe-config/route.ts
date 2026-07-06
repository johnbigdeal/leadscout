import { NextResponse } from "next/server";
import { requireSuperAdmin, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sinpeConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  id: "default",
  number: "64593374",
  name: "JONATHAN RODRIGUEZ",
  amount: "10,000 colones",
  supportEmail: "johnbigdeal@gmail.com",
};

/* GET /api/admin/sinpe-config — returns config (any authenticated user) */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;

  const [config] = await db
    .select()
    .from(sinpeConfig)
    .where(eq(sinpeConfig.id, "default"))
    .limit(1);

  return NextResponse.json({ config: config || DEFAULTS });
}

/* POST /api/admin/sinpe-config — upsert config (superadmin only) */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const body = await request.json();

  const allowed = ["number", "name", "amount", "supportEmail"];
  const updateData: Record<string, any> = { updatedAt: new Date() };

  for (const field of allowed) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  await db
    .insert(sinpeConfig)
    .values({ id: "default", ...updateData } as any)
    .onConflictDoUpdate({ target: sinpeConfig.id, set: updateData });

  const [config] = await db
    .select()
    .from(sinpeConfig)
    .where(eq(sinpeConfig.id, "default"))
    .limit(1);

  return NextResponse.json({ config });
}

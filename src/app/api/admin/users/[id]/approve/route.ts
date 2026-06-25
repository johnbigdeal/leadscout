import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;
  const { action } = await request.json();

  if (action === "approve") {
    await db
      .update(memberships)
      .set({ approved: true })
      .where(eq(memberships.userId, id));
    return NextResponse.json({ ok: true, action: "approved" });
  }

  if (action === "reject") {
    await db
      .delete(memberships)
      .where(eq(memberships.userId, id));
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

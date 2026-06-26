import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { searches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* DELETE /api/searches/[id] — super admin only */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(searches)
      .where(eq(searches.id, id))
      .returning({ id: searches.id });

    if (!deleted) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (e: any) {
    console.error("Delete search error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to delete search" },
      { status: 500 },
    );
  }
}

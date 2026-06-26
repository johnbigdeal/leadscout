import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { searches } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* POST /api/admin/searches/bulk-delete — super admin only */
export async function POST(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Invalid or empty ids array" },
      { status: 400 },
    );
  }

  try {
    const deleted = await db
      .delete(searches)
      .where(inArray(searches.id, ids))
      .returning({ id: searches.id });

    return NextResponse.json({ deleted: deleted.length });
  } catch (e: any) {
    console.error("Bulk delete searches error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to delete searches" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inviteCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* POST /api/invite-codes/validate — chequeo público (pre-signup) de un código.
   La autoridad real es /api/onboarding (revalida y consume el uso). */
export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({}));
  if (!code || typeof code !== "string") {
    return NextResponse.json({ valid: false });
  }

  const [row] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code.trim().toLowerCase()))
    .limit(1);

  const valid =
    !!row &&
    row.enabled &&
    (row.maxUses === null || row.usesCount < row.maxUses);

  return NextResponse.json({ valid });
}

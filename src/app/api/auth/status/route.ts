import { NextResponse } from "next/server";
import { authenticateRequest, getOrgCurrency } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await authenticateRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = await getOrgCurrency(ctx.orgId);

  return NextResponse.json({
    role: ctx.role,
    approved: ctx.approved,
    isSuperAdmin: ctx.isSuperAdmin,
    currency,
  });
}

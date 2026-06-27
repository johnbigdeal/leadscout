import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getReferralStats } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/* GET /api/referrals — the current user's referral code, link, credits and referred list. */
export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const stats = await getReferralStats(ctx.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://leadscout.lat";
  const link = stats.code ? `${appUrl}/auth/sign-up?ref=${stats.code}` : null;

  return NextResponse.json({
    ...stats,
    link,
    plan: ctx.isSuperAdmin ? "pro" : undefined, // hint; UI also fetches plan separately
  });
}

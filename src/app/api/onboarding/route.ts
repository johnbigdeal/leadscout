import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { organizations, memberships, subscriptions, pipelines, profiles } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { generateUniqueReferralCode } from "@/lib/referrals";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  // Rate limit by IP - 5 requests per minute
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limit = rateLimit(`onboarding:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Por favor espera unos minutos." },
      { status: 429 },
    );
  }

  const { userId, orgName, referralCode } = await request.json();
  if (!userId || !orgName) {
    return NextResponse.json({ error: "Missing userId or orgName" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSuperAdmin = user.email === "johnbigdeal@gmail.com";

  /* Resolve referrer from the referral code (must exist and not be self). */
  let referredBy: string | null = null;
  if (referralCode && typeof referralCode === "string") {
    const [referrer] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.referralCode, referralCode.trim().toUpperCase()))
      .limit(1);
    if (referrer && referrer.id !== userId) referredBy = referrer.id;
  }

  const newReferralCode = await generateUniqueReferralCode();

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName })
    .returning();

  await db.insert(profiles).values({
    id: userId,
    email: user.email!,
    role: isSuperAdmin ? "super_admin" : "user",
    referralCode: newReferralCode,
    referredBy,
  }).onConflictDoNothing();

  await db.insert(memberships).values({
    orgId: org.id,
    userId,
    role: isSuperAdmin ? "superadmin" : "owner",
    approved: isSuperAdmin,
  });

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(subscriptions).values({
    orgId: org.id,
    plan: "free",
    searchQuota: 50,
    trialEndsAt,
  });

  await db.insert(pipelines).values({
    orgId: org.id,
    name: "Ventas",
    category: "General",
    stages: ["new", "contacted", "qualified", "won", "lost"],
  });

  return NextResponse.json({ orgId: org.id, approved: isSuperAdmin });
}

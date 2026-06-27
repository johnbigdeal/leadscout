import { randomBytes } from "crypto";
import { db } from "./db";
import { profiles } from "./db/schema";
import { eq, desc } from "drizzle-orm";

/* Unambiguous charset (no 0/O/1/I/L) for human-friendly codes. */
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CHARS[bytes[i] % CHARS.length];
  return out;
}

/* Generate a code guaranteed not to collide with an existing profile. */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateReferralCode();
    const [existing] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.referralCode, code))
      .limit(1);
    if (!existing) return code;
  }
  /* Extremely unlikely fallback: longer code. */
  return generateReferralCode(12);
}

export type ReferralStats = {
  code: string | null;
  referredCount: number;
  creditsEarned: number;
  creditsUsed: number;
  creditsRemaining: number;
  referred: { email: string; createdAt: string }[];
};

/* Referral stats for a user: 1 referral = 1 credit; remaining = earned − used. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [me] = await db
    .select({ referralCode: profiles.referralCode, creditsUsed: profiles.creditsUsed })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const referredRows = await db
    .select({ email: profiles.email, createdAt: profiles.createdAt })
    .from(profiles)
    .where(eq(profiles.referredBy, userId))
    .orderBy(desc(profiles.createdAt));

  const creditsEarned = referredRows.length;
  const creditsUsed = me?.creditsUsed ?? 0;

  return {
    code: me?.referralCode ?? null,
    referredCount: creditsEarned,
    creditsEarned,
    creditsUsed,
    creditsRemaining: Math.max(0, creditsEarned - creditsUsed),
    referred: referredRows.map((r) => ({ email: r.email, createdAt: r.createdAt.toISOString() })),
  };
}

/* Credits remaining for a user (earned − used). */
export async function getCreditsRemaining(userId: string): Promise<number> {
  const stats = await getReferralStats(userId);
  return stats.creditsRemaining;
}

import { randomBytes } from "crypto";
import { db } from "./db";
import { profiles, memberships } from "./db/schema";
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
  referred: { email: string; createdAt: string; approved: boolean }[];
};

/* Referral stats for a user. A referral only counts as a credit once the
   referred account is APPROVED (membership.approved) — i.e. the person was let
   in / used the app — to avoid crediting fake or pending signups.
   1 approved referral = 1 credit; remaining = earned − used. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [me] = await db
    .select({ referralCode: profiles.referralCode, creditsUsed: profiles.creditsUsed })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      createdAt: profiles.createdAt,
      approved: memberships.approved,
    })
    .from(profiles)
    .leftJoin(memberships, eq(memberships.userId, profiles.id))
    .where(eq(profiles.referredBy, userId))
    .orderBy(desc(profiles.createdAt));

  /* Dedupe by referred user (a user could have >1 membership); approved if any. */
  const byId = new Map<string, { email: string; createdAt: Date; approved: boolean }>();
  for (const r of rows) {
    const ex = byId.get(r.id);
    if (!ex) byId.set(r.id, { email: r.email, createdAt: r.createdAt, approved: !!r.approved });
    else if (r.approved) ex.approved = true;
  }
  const referred = Array.from(byId.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const creditsEarned = referred.filter((r) => r.approved).length;
  const creditsUsed = me?.creditsUsed ?? 0;

  return {
    code: me?.referralCode ?? null,
    referredCount: referred.length,
    creditsEarned,
    creditsUsed,
    creditsRemaining: Math.max(0, creditsEarned - creditsUsed),
    referred: referred.map((r) => ({ email: r.email, createdAt: r.createdAt.toISOString(), approved: r.approved })),
  };
}

/* Credits remaining for a user (earned − used). */
export async function getCreditsRemaining(userId: string): Promise<number> {
  const stats = await getReferralStats(userId);
  return stats.creditsRemaining;
}

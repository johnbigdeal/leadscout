/**
 * Centralized auth utilities for Supabase Auth in LeadScout.
 * Replace the duplicated auth() functions across API routes with these helpers.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { db } from "./db";
import { memberships, organizations, profiles, subscriptions } from "./db/schema";
import { eq } from "drizzle-orm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export interface AuthContext {
  user: { id: string; email?: string };
  orgId: string;
  role: string;
  approved: boolean;
  isSuperAdmin: boolean;
}

/**
 * Authenticate a request using Bearer token.
 * Returns null if unauthorized.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return null;

  const [membership] = await db
    .select({
      orgId: memberships.orgId,
      role: memberships.role,
      approved: memberships.approved,
    })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) return null;

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return {
    user: { id: user.id, email: user.email },
    orgId: membership.orgId,
    role: membership.role,
    approved: membership.approved,
    isSuperAdmin: profile?.role === "super_admin",
  };
}

/**
 * Require authentication — returns 401 or 403 if not authenticated/not approved.
 */
export async function requireAuth(
  request: Request,
  options?: { requireApproved?: boolean },
): Promise<{ ctx: AuthContext; response?: never } | { ctx?: never; response: NextResponse }> {
  const ctx = await authenticateRequest(request);
  if (!ctx) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (options?.requireApproved !== false && !ctx.approved) {
    return { response: NextResponse.json({ error: "Account pending approval" }, { status: 403 }) };
  }
  return { ctx };
}

/**
 * Require superadmin role (global app admin via profiles table).
 */
export async function requireSuperAdmin(
  request: Request,
): Promise<{ ctx: AuthContext; response?: never } | { ctx?: never; response: NextResponse }> {
  const result = await requireAuth(request);
  if (result.response) return result;
  if (!result.ctx.isSuperAdmin) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx: result.ctx };
}

/**
 * Get org currency for the authenticated user.
 */
export async function getOrgCurrency(orgId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org?.currency || "USD";
}

export { translateAuthError } from "./auth-errors";

/**
 * Check trial status for an organization.
 * Returns trial info including whether expired and days until data deletion.
 */
export async function checkTrialStatus(orgId: string): Promise<{
  trialExpired: boolean;
  trialEndsAt: Date | null;
  daysUntilDeletion: number | null;
}> {
  const [sub] = await db
    .select({ trialEndsAt: subscriptions.trialEndsAt, dataDeletedAt: subscriptions.dataDeletedAt })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .limit(1);

  if (!sub || !sub.trialEndsAt) {
    return { trialExpired: false, trialEndsAt: null, daysUntilDeletion: null };
  }

  const now = new Date();
  const trialExpired = new Date(sub.trialEndsAt) < now;

  let daysUntilDeletion: number | null = null;
  if (sub.dataDeletedAt) {
    daysUntilDeletion = Math.max(0, Math.ceil((new Date(sub.dataDeletedAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (trialExpired) {
    daysUntilDeletion = 30;
  }

  return { trialExpired, trialEndsAt: sub.trialEndsAt, daysUntilDeletion };
}

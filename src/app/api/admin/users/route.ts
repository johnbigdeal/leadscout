import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships, organizations, profiles, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const supabase = await createServiceClient();

  // Fetch all users from Supabase Auth (paginated, but for now fetch all)
  const allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) break;
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  // Fetch memberships and profiles for all users
  const allMemberships = await db
    .select()
    .from(memberships);

  const allProfiles = await db
    .select()
    .from(profiles);

  const allOrgs = await db
    .select()
    .from(organizations);

  const allSubs = await db
    .select({ orgId: subscriptions.orgId, plan: subscriptions.plan })
    .from(subscriptions);

  const usersWithData = allUsers
    /* Hide soft-deleted users (profile.deletedAt set). */
    .filter((u) => {
      const p = allProfiles.find((pp) => pp.id === u.id);
      return !p?.deletedAt;
    })
    .map((u) => {
      const m = allMemberships.find((m) => m.userId === u.id);
      const p = allProfiles.find((p) => p.id === u.id);
      const org = m ? allOrgs.find((o) => o.id === m.orgId) : null;
      const sub = m ? allSubs.find((s) => s.orgId === m.orgId) : null;

      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        membership: m
          ? {
              id: m.id,
              orgId: m.orgId,
              role: m.role,
              approved: m.approved,
              orgName: org?.name,
              plan: sub?.plan || "free",
            }
          : null,
        profileRole: p?.role || "user",
      };
    });

  return NextResponse.json({ users: usersWithData });
}

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  memberships,
  organizations,
  websites,
  searches,
  leads,
  profiles,
} from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const supabase = await createServiceClient();

  // Get Supabase auth user count
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (usersError) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
  const totalUsers = usersData.total;

  const [orgsCount] = await db.select({ count: count() }).from(organizations);
  const [websitesCount] = await db.select({ count: count() }).from(websites);
  const [searchesCount] = await db.select({ count: count() }).from(searches);
  const [leadsCount] = await db.select({ count: count() }).from(leads);
  const [pendingCount] = await db
    .select({ count: count() })
    .from(memberships)
    .where(eq(memberships.approved, false));
  const [superAdminCount] = await db
    .select({ count: count() })
    .from(profiles)
    .where(eq(profiles.role, "super_admin"));

  return NextResponse.json({
    totalUsers,
    totalOrgs: orgsCount.count,
    totalWebsites: websitesCount.count,
    totalSearches: searchesCount.count,
    totalLeads: leadsCount.count,
    pendingApprovals: pendingCount.count,
    totalSuperAdmins: superAdminCount.count,
  });
}

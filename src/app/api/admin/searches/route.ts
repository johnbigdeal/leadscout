import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { searches, organizations, searchBusinesses } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* GET /api/admin/searches — list all searches for super admin */
export async function GET(request: Request) {
  const result = await requireSuperAdmin(request);
  if (result.response) return result.response;

  const rows = await db
    .select({
      id: searches.id,
      orgId: searches.orgId,
      orgName: organizations.name,
      keywords: searches.keywords,
      location: searches.location,
      status: searches.status,
      createdAt: searches.createdAt,
      businessCount: count(searchBusinesses.businessId),
    })
    .from(searches)
    .leftJoin(organizations, eq(organizations.id, searches.orgId))
    .leftJoin(searchBusinesses, eq(searchBusinesses.searchId, searches.id))
    .groupBy(searches.id, organizations.name)
    .orderBy(desc(searches.createdAt))
    .limit(200);

  return NextResponse.json({ searches: rows });
}

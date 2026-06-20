import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { searches, searchBusinesses } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: searches.id,
      keywords: searches.keywords,
      location: searches.location,
      status: searches.status,
      createdAt: searches.createdAt,
      businessCount: count(searchBusinesses.businessId),
    })
    .from(searches)
    .leftJoin(searchBusinesses, eq(searchBusinesses.searchId, searches.id))
    .groupBy(searches.id)
    .orderBy(desc(searches.createdAt))
    .limit(50);

  return NextResponse.json(rows);
}
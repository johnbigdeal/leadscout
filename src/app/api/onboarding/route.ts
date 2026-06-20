import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { organizations, memberships, subscriptions, pipelines } from "@/lib/db/schema";

export async function POST(request: Request) {
  const { userId, orgName } = await request.json();
  if (!userId || !orgName) {
    return NextResponse.json({ error: "Missing userId or orgName" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSuperAdmin = user.email === "johnbigdeal@gmail.com";

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName })
    .returning();

  await db.insert(memberships).values({
    orgId: org.id,
    userId,
    role: isSuperAdmin ? "superadmin" : "owner",
    approved: isSuperAdmin,
  });

  await db.insert(subscriptions).values({
    orgId: org.id,
    plan: "free",
    searchQuota: 50,
  });

  await db.insert(pipelines).values({
    orgId: org.id,
    name: "Ventas",
    category: "General",
    stages: ["new", "contacted", "qualified", "won", "lost"],
  });

  return NextResponse.json({ orgId: org.id, approved: isSuperAdmin });
}

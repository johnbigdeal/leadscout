import { redirect } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { memberships, organizations, subscriptions, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CurrencyProvider } from "@/lib/currency-context";
import DashboardClient from "./DashboardClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const [membership] = await db
    .select({
      orgId: memberships.orgId,
      role: memberships.role,
      approved: memberships.approved,
    })
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (!membership) {
    redirect("/auth/sign-in");
  }

  if (!membership.approved) {
    redirect("/waiting-approval");
  }

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const isSuperAdmin = profile?.role === "super_admin";

  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);

  const [sub] = await db
    .select({
      plan: subscriptions.plan,
      trialEndsAt: subscriptions.trialEndsAt,
      dataDeletedAt: subscriptions.dataDeletedAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.orgId, membership.orgId))
    .limit(1);

  const effectivePlan = isSuperAdmin ? "pro" : (sub?.plan || "free");
  const trialExpired = sub?.trialEndsAt && new Date(sub.trialEndsAt) < new Date();
  const trialDaysLeft = sub?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : -1;
  const daysUntilDeletion = sub?.dataDeletedAt
    ? Math.max(0, Math.ceil((new Date(sub.dataDeletedAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : trialExpired ? 30 : null;

  return (
    <CurrencyProvider>
      <DashboardClient
        isAdmin={isSuperAdmin || membership.role === "superadmin"}
        isSuperAdmin={isSuperAdmin}
        currency={org?.currency || "USD"}
        plan={effectivePlan}
        trialExpired={!!trialExpired}
        trialDaysLeft={trialDaysLeft}
        daysUntilDeletion={daysUntilDeletion}
      >
        {children}
      </DashboardClient>
    </CurrencyProvider>
  );
}

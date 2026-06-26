"use client";

import { useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  History,
  LayoutDashboard,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Shield,
  Settings,
  LogOut,
  Globe,
  Crown,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/currency-context";
import { FreeBadge, ProBadge, SuperAdminBadge, UpgradeButton } from "@/components/plan-badges";
import { UpgradeModal } from "@/components/upgrade-modal";
import { X } from "lucide-react";

function NavItem({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function DashboardClient({
  children,
  isAdmin,
  isSuperAdmin,
  currency: initialCurrency,
  plan,
  trialExpired,
  trialDaysLeft,
  daysUntilDeletion,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currency: string;
  plan: string;
  trialExpired?: boolean;
  trialDaysLeft?: number;
  daysUntilDeletion?: number | null;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const { currency } = useCurrency();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dismissBanner, setDismissBanner] = useState(false);

  // Use the currency from context if available, otherwise fallback to server-provided
  const displayCurrency = currency || initialCurrency;

  return (
    <div className="flex min-h-screen">
      <aside
        className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          {collapsed ? (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Crosshair className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                <Crosshair className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-display text-lg tracking-tight text-sidebar-foreground">
                {t("appName")}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavItem
            href="/dashboard/search"
            icon={<Search className="h-4 w-4" />}
            label={t("search")}
            collapsed={collapsed}
          />
          <NavItem
            href="/dashboard/results"
            icon={<History className="h-4 w-4" />}
            label={t("history")}
            collapsed={collapsed}
          />
          <NavItem
            href="/dashboard/crm"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label={t("crm")}
            collapsed={collapsed}
          />
          <NavItem
            href="/dashboard/sales"
            icon={<DollarSign className="h-4 w-4" />}
            label={t("sales")}
            collapsed={collapsed}
          />
          <NavItem
            href="/dashboard/websites"
            icon={<Globe className="h-4 w-4" />}
            label="Websites"
            collapsed={collapsed}
          />
          {isSuperAdmin && (
            <NavItem
              href="/dashboard/admin"
              icon={<Shield className="h-4 w-4" />}
              label="Admin"
              collapsed={collapsed}
            />
          )}
          <NavItem
            href="/dashboard/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Configuración"
            collapsed={collapsed}
          />
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-1">
          {/* Plan badge */}
          {!collapsed && (
            <div className="mb-2 flex items-center justify-center gap-1.5">
              {isSuperAdmin ? (
                <SuperAdminBadge>Super Admin</SuperAdminBadge>
              ) : plan === "pro" ? (
                <ProBadge>Pro</ProBadge>
              ) : (
                <FreeBadge>Free</FreeBadge>
              )}
            </div>
          )}
          {plan === "free" && !isSuperAdmin && !collapsed && (
            <div className="flex justify-center">
              <UpgradeButton onClick={() => router.push("/dashboard/settings/plans")} />
            </div>
          )}
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
            }}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? t("signOut") : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("signOut")}</span>}
          </button>
          {!collapsed && (
            <p className="text-[10px] text-sidebar-foreground/40 text-center">
              Moneda: {displayCurrency}
            </p>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center border-t border-sidebar-border p-3 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Trial expired overlay */}
        {trialExpired && !isSuperAdmin && !pathname.includes('/dashboard/settings/plans') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Zap className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="mb-2 font-display text-2xl tracking-tight text-foreground">
                Tu prueba terminó
              </h2>
              <p className="mb-1 text-sm text-muted-foreground">
                El período de prueba gratuita ha expirado.
              </p>
              {daysUntilDeletion !== null && (
                <p className="mb-6 text-sm font-medium text-amber-600">
                  Tus datos se eliminarán en {daysUntilDeletion} días.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <UpgradeButton onClick={() => router.push("/dashboard/settings/plans")} />
                <button
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trial countdown banner */}
        {plan === "free" && !trialExpired && !dismissBanner && !isSuperAdmin && (
          <div className="relative flex items-center justify-center gap-3 border-b border-amber-200/50 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-4 py-2.5">
            <FreeBadge>Free</FreeBadge>
            {trialDaysLeft && trialDaysLeft > 0 ? (
              <span className="text-sm text-amber-800">
                Prueba gratuita: te quedan <strong>{trialDaysLeft} día{trialDaysLeft !== 1 ? "s" : ""}</strong>.
                Upgrade a Pro para desbloquear todas las funciones.
              </span>
            ) : (
              <span className="text-sm text-amber-800">
                Upgrade a Pro para desbloquear dominios propios, búsquedas ilimitadas y más.
              </span>
            )}
            <UpgradeButton onClick={() => setShowUpgradeModal(true)} />
            <button
              onClick={() => setDismissBanner(true)}
              className="absolute right-3 text-amber-600 hover:text-amber-800"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <main className="flex-1 bg-background">{children}</main>
      </div>

      {!pathname.includes('/dashboard/settings/plans') && (
        <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="Todas las funciones Pro" />
      )}
    </div>
  );
}

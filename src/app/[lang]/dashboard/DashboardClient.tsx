"use client";

import { useState, useEffect } from "react";
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
  Menu,
  Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { useCurrency } from "@/lib/currency-context";
import { FreeBadge, ProBadge, SuperAdminBadge, UpgradeButton } from "@/components/plan-badges";
import { UpgradeModal } from "@/components/upgrade-modal";
import { X } from "lucide-react";

function NavItem({
  href,
  icon,
  label,
  collapsed,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
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
  /* El builder necesita altura definida para que su preview (iframe) tenga
     scroll interno y los elementos position:fixed (FAB de WhatsApp) se anclen
     al viewport del iframe y no al fondo del contenido. */
  const isBuilder = pathname.includes("/dashboard/builder/");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dismissBanner, setDismissBanner] = useState(false);

  // Persist banner dismissal so it doesn't reappear on every navigation
  useEffect(() => {
    if (localStorage.getItem("trialBannerDismissed") === "1") setDismissBanner(true);
  }, []);

  function dismissTrialBanner() {
    setDismissBanner(true);
    localStorage.setItem("trialBannerDismissed", "1");
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  // Use the currency from context if available, otherwise fallback to server-provided
  const displayCurrency = currency || initialCurrency;

  const sidebarBody = (mobile: boolean) => {
    const isCollapsed = mobile ? false : collapsed;
    const closeOnNav = mobile ? () => setMobileOpen(false) : undefined;
    return (
      <>
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          {isCollapsed ? (
            <Link href="/dashboard/search" className="mx-auto flex items-center" aria-label={t("appName")}>
              <Logo variant="mark" theme="light" height={28} />
            </Link>
          ) : (
            <Link href="/dashboard/search" className="flex items-center" aria-label={t("appName")}>
              <Logo theme="light" height={28} />
            </Link>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavItem href="/dashboard/search" icon={<Search className="h-4 w-4" />} label={t("search")} collapsed={isCollapsed} onNavigate={closeOnNav} />
          <NavItem href="/dashboard/results" icon={<History className="h-4 w-4" />} label={t("history")} collapsed={isCollapsed} onNavigate={closeOnNav} />
          <NavItem href="/dashboard/crm" icon={<LayoutDashboard className="h-4 w-4" />} label={t("crm")} collapsed={isCollapsed} onNavigate={closeOnNav} />
          <NavItem href="/dashboard/sales" icon={<DollarSign className="h-4 w-4" />} label={t("sales")} collapsed={isCollapsed} onNavigate={closeOnNav} />
          <NavItem href="/dashboard/websites" icon={<Globe className="h-4 w-4" />} label="Websites" collapsed={isCollapsed} onNavigate={closeOnNav} />
          <NavItem href="/dashboard/referrals" icon={<Gift className="h-4 w-4" />} label="Referidos" collapsed={isCollapsed} onNavigate={closeOnNav} />
          {isSuperAdmin && (
            <NavItem href="/dashboard/admin" icon={<Shield className="h-4 w-4" />} label="Admin" collapsed={isCollapsed} onNavigate={closeOnNav} />
          )}
          <NavItem href="/dashboard/settings" icon={<Settings className="h-4 w-4" />} label="Configuración" collapsed={isCollapsed} onNavigate={closeOnNav} />
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-1">
          {!isCollapsed && (
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
          {plan === "free" && !isSuperAdmin && !isCollapsed && (
            <div className="flex justify-center">
              <UpgradeButton onClick={() => router.push("/dashboard/settings/plans")} />
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-60 ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? t("signOut") : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{signingOut ? "Cerrando…" : t("signOut")}</span>}
          </button>
          {!isCollapsed && (
            <p className="text-[10px] text-sidebar-foreground/40 text-center">
              Moneda: {displayCurrency}
            </p>
          )}
        </div>

        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            className="flex items-center justify-center border-t border-sidebar-border p-3 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </>
    );
  };

  return (
    <div className={`flex ${isBuilder ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarBody(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarBody(true)}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
              <Crosshair className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display text-base tracking-tight text-sidebar-foreground">
              {t("appName")}
            </span>
          </div>
        </div>

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
              onClick={dismissTrialBanner}
              aria-label="Cerrar aviso"
              className="absolute right-3 text-amber-600 hover:text-amber-800"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <main className={`flex-1 bg-background ${isBuilder ? "min-h-0 overflow-hidden" : ""}`}>{children}</main>
      </div>

      {!pathname.includes('/dashboard/settings/plans') && (
        <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="Todas las funciones Pro" />
      )}
    </div>
  );
}

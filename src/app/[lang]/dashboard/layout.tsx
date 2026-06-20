"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, History, LayoutDashboard, Crosshair, ChevronLeft, ChevronRight, DollarSign, Shield, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CurrencyProvider, useCurrency } from "@/lib/currency-context";

function NavItem({ href, icon, label, collapsed }: { href: string; icon: React.ReactNode; label: string; collapsed: boolean }) {
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

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const router = useRouter();
  const { currency } = useCurrency();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/auth/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.role === "superadmin");
        setIsApproved(data.approved);
        if (!data.approved && !window.location.pathname.includes("waiting-approval")) {
          router.push("/waiting-approval");
        }
      }
    }
    checkStatus();
  }, [router]);

  if (isApproved === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold">Esperando aprobación</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta está pendiente de aprobación por el administrador.
          </p>
        </div>
      </div>
    );
  }

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
          {isAdmin && (
            <NavItem
              href="/dashboard/admin/approvals"
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
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/");
            }}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? t("signOut") : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("signOut")}</span>}
          </button>
          {!collapsed && (
            <p className="text-[10px] text-sidebar-foreground/40 text-center">
              Moneda: {currency}
            </p>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center border-t border-sidebar-border p-3 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </CurrencyProvider>
  );
}

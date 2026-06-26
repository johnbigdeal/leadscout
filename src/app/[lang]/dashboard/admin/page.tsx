"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FreeBadge, ProBadge, SuperAdminBadge } from "@/components/plan-badges";
import {
  Shield,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Globe,
  Search,
  BarChart3,
  Clock,
  Crown,
  CreditCard,
  Trash2,
  Save,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

interface Stats {
  totalUsers: number;
  totalOrgs: number;
  totalWebsites: number;
  totalSearches: number;
  totalLeads: number;
  pendingApprovals: number;
  totalSuperAdmins: number;
}

interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  membership: {
    id: string;
    orgId: string;
    role: string;
    approved: boolean;
    orgName: string;
  } | null;
  profileRole: string;
}

interface AdminOrg {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  memberCount: number;
  plan: string;
  status: string;
}

interface AdminSubscription {
  orgId: string;
  plan: string;
  status: string;
  paypalSubscriptionId: string | null;
  paypalPlanId: string | null;
  currentPeriodEnd: string | null;
  paypalStatus?: string;
  paypalError?: string;
}

interface TrialData {
  orgId: string;
  orgName: string;
  plan: string;
  trialEndsAt: string | null;
  dataDeletedAt: string | null;
  expired: boolean;
}

interface AdminSearch {
  id: string;
  orgId: string;
  orgName: string | null;
  keywords: string;
  location: string;
  status: string;
  createdAt: string;
  businessCount: number;
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<"overview" | "users" | "orgs" | "subscriptions" | "trials" | "searches">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [searches, setSearches] = useState<AdminSearch[]>([]);
  const [extending, setExtending] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/stats", { headers });
    if (res.ok) setStats(await res.json());
  }

  async function fetchUsers() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/users", { headers });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }

  async function fetchOrgs() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/orgs", { headers });
    if (res.ok) {
      const data = await res.json();
      setOrgs(data.orgs);
    }
  }

  async function fetchSubscriptions() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/subscriptions", { headers });
    if (res.ok) {
      const data = await res.json();
      setSubscriptions(data.subscriptions);
    }
  }

  async function handleUserAction(userId: string, action: "approve" | "reject") {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/admin/users/${userId}/approve`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action }),
    });
    fetchUsers();
    fetchStats();
  }

  async function handleCancelSubscription(orgId: string) {
    if (!confirm("¿Cancelar suscripción y hacer downgrade a Free?")) return;
    const headers = await getAuthHeaders();
    await fetch(`/api/admin/subscriptions/${orgId}/cancel`, { method: "POST", headers });
    fetchSubscriptions();
    fetchOrgs();
  }

  async function fetchTrials() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/trials", { headers });
    if (res.ok) {
      const data = await res.json();
      setTrials(data.trials);
    }
  }

  async function fetchSearches() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/searches", { headers });
    if (res.ok) {
      const data = await res.json();
      setSearches(data.searches);
    }
  }

  async function handleDeleteSearch(searchId: string) {
    if (!confirm("¿Eliminar esta búsqueda? Se borrarán también sus resultados.")) return;
    const headers = await getAuthHeaders();
    await fetch(`/api/searches/${searchId}`, { method: "DELETE", headers });
    fetchSearches();
    fetchStats();
  }

  async function handleExtendTrial(orgId: string) {
    const days = Number(extendDays[orgId]) || 7;
    setExtending(orgId);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/admin/trials/${orgId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ days }),
    });
    setExtending(null);
    fetchTrials();
  }

  async function handleUpgradeSubscription(orgId: string) {
    if (!confirm("¿Upgrade manual a Pro?")) return;
    const headers = await getAuthHeaders();
    await fetch(`/api/admin/subscriptions/${orgId}/upgrade`, { method: "POST", headers });
    fetchSubscriptions();
    fetchOrgs();
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchOrgs(), fetchSubscriptions(), fetchTrials(), fetchSearches()]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight">Panel de Administración</h1>
          <p className="text-sm text-zinc-500">Gestión global de la aplicación</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Usuarios" value={stats.totalUsers} icon={<Users className="h-4 w-4" />} />
          <StatCard label="Organizaciones" value={stats.totalOrgs} icon={<Building2 className="h-4 w-4" />} />
          <StatCard label="Websites" value={stats.totalWebsites} icon={<Globe className="h-4 w-4" />} />
          <StatCard label="Búsquedas" value={stats.totalSearches} icon={<Search className="h-4 w-4" />} />
          <StatCard label="Leads" value={stats.totalLeads} icon={<BarChart3 className="h-4 w-4" />} />
          <StatCard label="Pendientes" value={stats.pendingApprovals} icon={<Clock className="h-4 w-4" />} highlight />
          <StatCard label="Super Admins" value={stats.totalSuperAdmins} icon={<Crown className="h-4 w-4" />} />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-zinc-200 pb-1 overflow-x-auto">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")} label="Resumen" />
        <TabButton active={tab === "users"} onClick={() => setTab("users")} label={`Usuarios (${users.length})`} />
        <TabButton active={tab === "orgs"} onClick={() => setTab("orgs")} label={`Organizaciones (${orgs.length})`} />
        <TabButton active={tab === "subscriptions"} onClick={() => setTab("subscriptions")} label={`Suscripciones (${subscriptions.length})`} />
        <TabButton active={tab === "trials"} onClick={() => setTab("trials")} label={`Trials (${trials.filter(t => t.expired).length})`} />
        <TabButton active={tab === "searches"} onClick={() => setTab("searches")} label={`Búsquedas (${searches.length})`} />
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Aprobaciones Pendientes</h2>
            {users.filter((u) => u.membership && !u.membership.approved).length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm text-zinc-500">No hay aprobaciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users
                  .filter((u) => u.membership && !u.membership.approved)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{u.email}</p>
                        <p className="text-xs text-zinc-500">Org: {u.membership?.orgName || u.membership?.orgId}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleUserAction(u.id, "reject")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Rechazar
                        </Button>
                        <Button size="sm" onClick={() => handleUserAction(u.id, "approve")}>
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-3 pl-4">Usuario</th>
                <th className="pb-3">Organización</th>
                <th className="pb-3">Rol</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Registro</th>
                <th className="pb-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-3 pl-4">
                    <div>
                      <p className="font-medium">{u.email}</p>
                      <p className="text-xs text-zinc-400">{u.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="py-3">{u.membership?.orgName || "—"}</td>
                  <td className="py-3">
                    {u.profileRole === "super_admin" ? (
                      <SuperAdminBadge>Super Admin</SuperAdminBadge>
                    ) : (
                      <select
                        value={u.membership?.role || "member"}
                        onChange={async (e) => {
                          const headers = await getAuthHeaders();
                          headers["Content-Type"] = "application/json";
                          await fetch(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            headers,
                            body: JSON.stringify({ role: e.target.value }),
                          });
                          fetchUsers();
                        }}
                        className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs"
                      >
                        <option value="member">member</option>
                        <option value="owner">owner</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3">
                    {u.membership?.approved ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aprobado</Badge>
                    ) : u.membership ? (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendiente</Badge>
                    ) : (
                      <Badge variant="secondary">Sin org</Badge>
                    )}
                  </td>
                  <td className="py-3 text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString("es")}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1">
                      {u.membership && !u.membership.approved && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleUserAction(u.id, "approve")}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                            onClick={() => handleUserAction(u.id, "reject")}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {u.profileRole !== "super_admin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:text-red-700"
                          onClick={async () => {
                            if (!confirm(`¿Eliminar usuario ${u.email}?\nSe desactivará su acceso.`)) return;
                            const headers = await getAuthHeaders();
                            await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers });
                            fetchUsers();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Orgs Tab */}
      {tab === "orgs" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-3 pl-4">Organización</th>
                <th className="pb-3">Miembros</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Moneda</th>
                <th className="pb-3 pr-4">Creada</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const [editingName, setEditingName] = useState(o.name);
                const [editingCurrency, setEditingCurrency] = useState(o.currency);
                const [isEditing, setIsEditing] = useState(false);

                return (
                  <tr key={o.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 pl-4">
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="rounded border border-zinc-200 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="font-medium">{o.name}</span>
                      )}
                    </td>
                    <td className="py-3">{o.memberCount}</td>
                    <td className="py-3">
                      {o.plan === "pro" ? <ProBadge>Pro</ProBadge> : <FreeBadge>Free</FreeBadge>}
                    </td>
                    <td className="py-3">
                      <Badge variant="outline">{o.status}</Badge>
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <select
                          value={editingCurrency}
                          onChange={(e) => setEditingCurrency(e.target.value)}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="ARS">ARS</option>
                          <option value="BRL">BRL</option>
                          <option value="MXN">MXN</option>
                        </select>
                      ) : (
                        o.currency
                      )}
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {new Date(o.createdAt).toLocaleDateString("es")}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1">
                        {isEditing ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600"
                            onClick={async () => {
                              const headers = await getAuthHeaders();
                              headers["Content-Type"] = "application/json";
                              await fetch(`/api/admin/orgs/${o.id}`, {
                                method: "PATCH",
                                headers,
                                body: JSON.stringify({ name: editingName, currency: editingCurrency }),
                              });
                              setIsEditing(false);
                              fetchOrgs();
                            }}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-zinc-600"
                            onClick={() => setIsEditing(true)}
                          >
                            ✎
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:text-red-700"
                          onClick={async () => {
                            if (!confirm(`¿Eliminar organización "${o.name}"?\n\nSe borrarán TODOS los datos: websites, leads, búsquedas, etc. Esta acción no se puede deshacer.`)) return;
                            const headers = await getAuthHeaders();
                            await fetch(`/api/admin/orgs/${o.id}`, { method: "DELETE", headers });
                            fetchOrgs();
                            fetchStats();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Trials Tab */}
      {tab === "trials" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={trials.filter(t => !t.expired).length > 0 ? "default" : "outline"} onClick={fetchTrials}>
              Todos ({trials.length})
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-3 pl-4">Organización</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Trial termina</th>
                  <th className="pb-3">Eliminación</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((t) => (
                  <tr key={t.orgId} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 pl-4 font-medium">{t.orgName}</td>
                    <td className="py-3">
                      {t.expired ? <FreeBadge>Free (expired)</FreeBadge> : <FreeBadge>Free</FreeBadge>}
                    </td>
                    <td className="py-3 text-zinc-500">
                      {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString("es") : "—"}
                    </td>
                    <td className="py-3 text-zinc-500">
                      {t.dataDeletedAt ? new Date(t.dataDeletedAt).toLocaleDateString("es") : "—"}
                    </td>
                    <td className="py-3">
                      {t.expired ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expirado</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Activo</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          placeholder="7"
                          value={extendDays[t.orgId] || ""}
                          onChange={(e) => setExtendDays(prev => ({ ...prev, [t.orgId]: e.target.value }))}
                          className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-zinc-400">días</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 hover:bg-amber-50"
                          disabled={extending === t.orgId}
                          onClick={() => handleExtendTrial(t.orgId)}
                        >
                          {extending === t.orgId ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                          ) : (
                            <Zap className="mr-1 h-3 w-3" />
                          )}
                          Extender
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {trials.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                      No hay trials registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {tab === "subscriptions" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-3 pl-4">Org ID</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">PayPal ID</th>
                <th className="pb-3">PayPal Status</th>
                <th className="pb-3">Periodo</th>
                <th className="pb-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.orgId} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-3 pl-4 font-mono text-xs">{s.orgId.slice(0, 8)}...</td>
                  <td className="py-3">
                    {s.plan === "pro" ? <ProBadge>Pro</ProBadge> : <FreeBadge>Free</FreeBadge>}
                  </td>
                  <td className="py-3">
                    <Badge variant="outline">{s.status}</Badge>
                  </td>
                  <td className="py-3 font-mono text-xs">
                    {s.paypalSubscriptionId ? s.paypalSubscriptionId.slice(0, 12) + "..." : "—"}
                  </td>
                  <td className="py-3">
                    {s.paypalStatus ? (
                      <Badge className={s.paypalStatus === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}>
                        {s.paypalStatus}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-zinc-500">
                    {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es") : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1">
                      {s.plan === "pro" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleCancelSubscription(s.orgId)}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      )}
                      {s.plan === "free" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleUpgradeSubscription(s.orgId)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Searches Tab */}
      {tab === "searches" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-3 pl-4">Búsqueda</th>
                <th className="pb-3">Organización</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Resultados</th>
                <th className="pb-3">Creada</th>
                <th className="pb-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {searches.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-3 pl-4">
                    <div>
                      <p className="font-medium">{s.keywords}</p>
                      <p className="text-xs text-zinc-500">{s.location}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="font-medium">{s.orgName || "—"}</span>
                    <p className="text-xs font-mono text-zinc-400">{s.orgId.slice(0, 8)}...</p>
                  </td>
                  <td className="py-3">
                    <Badge variant="outline">{s.status}</Badge>
                  </td>
                  <td className="py-3 text-zinc-600">{s.businessCount}</td>
                  <td className="py-3 text-zinc-500">
                    {new Date(s.createdAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 pr-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteSearch(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {searches.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                    No hay búsquedas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-amber-700" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "border-b-2 border-primary text-primary"
          : "text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

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
  Pencil,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
    plan?: string;
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

interface SinpePayment {
  id: string;
  orgId: string;
  orgName?: string;
  email?: string;
  proofUrl: string;
  reference: string | null;
  amount: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
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

interface InviteCode {
  id: string;
  code: string;
  ownerEmail: string | null;
  label: string | null;
  maxUses: number | null;
  usesCount: number;
  enabled: boolean;
  createdAt: string;
}

interface InviteRequest {
  id: string;
  userId: string;
  email: string | null;
  status: string;
  createdAt: string;
}

interface PlanConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  popular: boolean;
  features: string[];
  limitations: Record<string, any>;
  stripePriceId: string | null;
  paypalPlanId: string | null;
  isActive: boolean;
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<"overview" | "users" | "orgs" | "subscriptions" | "sinpe" | "invites" | "trials" | "searches" | "referrals" | "planes">("overview");
  const [referrals, setReferrals] = useState<{ referrerEmail: string; referredEmail: string; referredAt: string }[]>([]);
  const [topReferrers, setTopReferrers] = useState<{ email: string; count: number }[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [sinpePayments, setSinpePayments] = useState<SinpePayment[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteRequests, setInviteRequests] = useState<InviteRequest[]>([]);
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeInfinite, setNewCodeInfinite] = useState(false);
  const [trials, setTrials] = useState<TrialData[]>([]);
  const [searches, setSearches] = useState<AdminSearch[]>([]);
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [extending, setExtending] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
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
    const res = await fetch(`/api/admin/users/${userId}/approve`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      toast.error("No se pudo procesar la solicitud. Intenta de nuevo.");
      return;
    }
    toast.success(action === "approve" ? "Usuario aprobado" : "Usuario rechazado");
    fetchUsers();
    fetchStats();
  }

  async function handleCancelSubscription(orgId: string) {
    if (!confirm("¿Cancelar suscripción y hacer downgrade a Free?")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/subscriptions/${orgId}/cancel`, { method: "POST", headers });
    if (!res.ok) {
      toast.error("No se pudo cancelar la suscripción. Intenta de nuevo.");
      return;
    }
    toast.success("Suscripción cancelada");
    fetchSubscriptions();
    fetchOrgs();
    fetchUsers();
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

  async function fetchReferrals() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/referrals", { headers });
    if (res.ok) {
      const data = await res.json();
      setReferrals(data.referrals || []);
      setTopReferrers(data.topReferrers || []);
    }
  }

  async function fetchPlanConfigs() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/plan-configs", { headers });
    if (res.ok) {
      const data = await res.json();
      setPlanConfigs(data.plans || []);
    }
  }

  async function handlePlanConfigUpdate(id: string, updates: Partial<PlanConfig>) {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/admin/plan-configs/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      toast.error("No se pudo actualizar el plan. Intenta de nuevo.");
      return;
    }
    toast.success("Plan actualizado");
    fetchPlanConfigs();
  }

  async function handleSeedPlans() {
    if (!confirm("¿Crear planes por defecto? Esto no borrará planes existentes.")) return;
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/admin/plan-configs", {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      toast.error("No se pudieron crear los planes. Intenta de nuevo.");
      return;
    }
    toast.success("Planes creados");
    fetchPlanConfigs();
  }

  async function handleDeleteSearch(searchId: string) {
    if (!confirm("¿Eliminar esta búsqueda? Se borrarán también sus resultados.")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/searches/${searchId}`, { method: "DELETE", headers });
    if (!res.ok) {
      toast.error("No se pudo eliminar la búsqueda. Intenta de nuevo.");
      return;
    }
    toast.success("Búsqueda eliminada");
    fetchSearches();
    fetchStats();
  }

  async function handleBulkDeleteSearches() {
    if (selectedSearches.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedSearches.size} búsqueda${selectedSearches.size === 1 ? "" : "s"} seleccionada${selectedSearches.size === 1 ? "" : "s"}?`)) return;
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/admin/searches/bulk-delete", {
      method: "POST",
      headers,
      body: JSON.stringify({ ids: Array.from(selectedSearches) }),
    });
    if (!res.ok) {
      toast.error("No se pudieron eliminar las búsquedas. Intenta de nuevo.");
      return;
    }
    toast.success("Búsquedas eliminadas");
    setSelectedSearches(new Set());
    fetchSearches();
    fetchStats();
  }

  async function handleExtendTrial(orgId: string) {
    const days = Number(extendDays[orgId]) || 7;
    setExtending(orgId);
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/admin/trials/${orgId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ days }),
    });
    setExtending(null);
    if (!res.ok) {
      toast.error("No se pudo extender el trial. Intenta de nuevo.");
      return;
    }
    toast.success("Trial extendido");
    fetchTrials();
  }

  async function handleUpgradeSubscription(orgId: string) {
    if (!confirm("¿Upgrade manual a Pro?")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/subscriptions/${orgId}/upgrade`, { method: "POST", headers });
    if (!res.ok) {
      toast.error("No se pudo hacer el upgrade. Intenta de nuevo.");
      return;
    }
    toast.success("Upgrade realizado");
    fetchSubscriptions();
    fetchOrgs();
    fetchUsers();
  }

  async function fetchSinpePayments() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/sinpe", { headers });
    if (res.ok) {
      const data = await res.json();
      setSinpePayments(data.payments);
    }
  }

  async function handleSinpeAction(id: string, action: "approve" | "reject") {
    let note: string | null = null;
    if (action === "reject") {
      note = prompt("Motivo del rechazo (opcional):");
    } else if (!confirm("¿Aprobar el comprobante y activar Pro para esta organización?")) {
      return;
    }
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/admin/sinpe", {
      method: "POST",
      headers,
      body: JSON.stringify({ id, action, note }),
    });
    if (!res.ok) {
      toast.error("No se pudo procesar el comprobante. Intenta de nuevo.");
      return;
    }
    toast.success(action === "approve" ? "Comprobante aprobado, organización en Pro" : "Comprobante rechazado");
    fetchSinpePayments();
    fetchSubscriptions();
    fetchOrgs();
  }

  async function fetchInviteCodes() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/invite-codes", { headers });
    if (res.ok) {
      const data = await res.json();
      setInviteCodes(data.codes);
      setInviteRequests(data.requests);
    }
  }

  async function createInviteCode() {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/admin/invite-codes", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: newCodeName.trim() || undefined, infinite: newCodeInfinite }),
    });
    if (!res.ok) {
      toast.error("No se pudo crear el código.");
      return;
    }
    toast.success("Código creado");
    setNewCodeName("");
    setNewCodeInfinite(false);
    fetchInviteCodes();
  }

  async function patchInviteCode(id: string, body: Record<string, unknown>, okMsg?: string) {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/admin/invite-codes?id=${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "No se pudo actualizar el código.");
      return;
    }
    if (okMsg) toast.success(okMsg);
    fetchInviteCodes();
  }

  async function deleteInviteCode(id: string) {
    if (!confirm("¿Borrar este código? Dejará de servir para registrarse.")) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/invite-codes?id=${id}`, { method: "DELETE", headers });
    if (!res.ok) { toast.error("No se pudo borrar."); return; }
    toast.success("Código borrado");
    fetchInviteCodes();
  }

  async function renameInviteCode(id: string, current: string) {
    const next = prompt("Nuevo nombre del código (se mantiene el prefijo leadscout_):", current);
    if (!next || next.trim() === current) return;
    patchInviteCode(id, { code: next.trim() }, "Código renombrado");
  }

  async function handleInviteRequest(id: string, action: "approve" | "reject") {
    let note: string | null = null;
    if (action === "reject") note = prompt("Motivo del rechazo (opcional):");
    else if (!confirm("¿Aprobar y recargar +10 usos al solicitante?")) return;
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/admin/invite-codes/requests", {
      method: "POST",
      headers,
      body: JSON.stringify({ id, action, note }),
    });
    if (!res.ok) { toast.error("No se pudo procesar la solicitud."); return; }
    toast.success(action === "approve" ? "Aprobado (+10 usos)" : "Solicitud rechazada");
    fetchInviteCodes();
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchOrgs(), fetchSubscriptions(), fetchSinpePayments(), fetchInviteCodes(), fetchTrials(), fetchSearches(), fetchReferrals(), fetchPlanConfigs()]).finally(() => setLoading(false));
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
        <TabButton active={tab === "sinpe"} onClick={() => setTab("sinpe")} label={`SINPE (${sinpePayments.filter((p) => p.status === "pending").length})`} />
        <TabButton active={tab === "invites"} onClick={() => setTab("invites")} label={`Invitaciones (${inviteRequests.length})`} />
        <TabButton active={tab === "trials"} onClick={() => setTab("trials")} label={`Trials (${trials.filter(t => t.expired).length})`} />
        <TabButton active={tab === "searches"} onClick={() => setTab("searches")} label={`Búsquedas (${searches.length})`} />
        <TabButton active={tab === "referrals"} onClick={() => setTab("referrals")} label={`Referidos (${referrals.length})`} />
        <TabButton active={tab === "planes"} onClick={() => setTab("planes")} label={`Planes (${planConfigs.length})`} />
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
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-zinc-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
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
                        aria-label={`Rol de ${u.email}`}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          if (newRole === "superadmin" && !confirm(`¿Dar rol de superadmin a ${u.email}?`)) return;
                          const headers = await getAuthHeaders();
                          headers["Content-Type"] = "application/json";
                          const res = await fetch(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            headers,
                            body: JSON.stringify({ role: newRole }),
                          });
                          if (!res.ok) {
                            alert("No se pudo cambiar el rol. Intenta de nuevo.");
                            return;
                          }
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
                      {u.membership && u.profileRole !== "super_admin" && (
                        u.membership.plan === "pro" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-zinc-600 hover:text-zinc-800"
                            title="Downgrade a Free"
                            onClick={() => handleCancelSubscription(u.membership!.orgId)}
                          >
                            Free
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700"
                            title="Upgrade a Pro"
                            onClick={() => handleUpgradeSubscription(u.membership!.orgId)}
                          >
                            <Zap className="mr-1 h-3.5 w-3.5" /> Pro
                          </Button>
                        )
                      )}
                      {u.profileRole !== "super_admin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:text-red-700"
                          onClick={async () => {
                            if (!confirm(`¿Eliminar usuario ${u.email}?\nSe desactivará su acceso.`)) return;
                            const headers = await getAuthHeaders();
                            const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              toast.error(err.error || "No se pudo eliminar el usuario.");
                              return;
                            }
                            toast.success("Usuario eliminado");
                            fetchUsers();
                            fetchStats();
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
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-zinc-500">
                    No hay organizaciones
                  </td>
                </tr>
              ) : (
                orgs.map((o) => (
                  <OrgRow
                    key={o.id}
                    org={o}
                    onSaved={fetchOrgs}
                    onDeleted={() => {
                      fetchOrgs();
                      fetchStats();
                    }}
                  />
                ))
              )}
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
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                    No hay suscripciones registradas.
                  </td>
                </tr>
              )}
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

      {/* SINPE Tab */}
      {tab === "sinpe" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-3 pl-4">Organización</th>
                <th className="pb-3">Usuario</th>
                <th className="pb-3">Monto</th>
                <th className="pb-3">Referencia</th>
                <th className="pb-3">Comprobante</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Fecha</th>
                <th className="pb-3 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sinpePayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-zinc-400">
                    No hay comprobantes SINPE.
                  </td>
                </tr>
              )}
              {sinpePayments.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-3 pl-4">{p.orgName || <span className="font-mono text-xs">{p.orgId.slice(0, 8)}...</span>}</td>
                  <td className="py-3 text-zinc-600">{p.email || "—"}</td>
                  <td className="py-3">{p.amount}</td>
                  <td className="py-3 text-zinc-500">{p.reference || "—"}</td>
                  <td className="py-3">
                    <a
                      href={p.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Ver
                    </a>
                  </td>
                  <td className="py-3">
                    {p.status === "approved" ? (
                      <Badge className="bg-emerald-100 text-emerald-700">Aprobado</Badge>
                    ) : p.status === "rejected" ? (
                      <Badge className="bg-red-100 text-red-700">Rechazado</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>
                    )}
                  </td>
                  <td className="py-3 text-zinc-500">{new Date(p.createdAt).toLocaleDateString("es")}</td>
                  <td className="py-3 pr-4">
                    {p.status === "pending" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleSinpeAction(p.id, "approve")}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleSinpeAction(p.id, "reject")}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Rechazar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">{p.adminNote || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invitaciones Tab */}
      {tab === "invites" && (
        <div className="space-y-8">
          {/* Solicitudes pendientes */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Solicitudes de códigos ({inviteRequests.length})</h2>
            {inviteRequests.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
                No hay solicitudes pendientes
              </div>
            ) : (
              <div className="space-y-2">
                {inviteRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4">
                    <div>
                      <p className="text-sm font-medium">{r.email || r.userId.slice(0, 8)}</p>
                      <p className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString("es")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleInviteRequest(r.id, "reject")}>
                        <XCircle className="mr-1 h-3 w-3" /> Rechazar
                      </Button>
                      <Button size="sm" onClick={() => handleInviteRequest(r.id, "approve")}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Aprobar (+10)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crear código */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold">Crear código</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm">
                <span className="px-2 py-2 font-mono text-zinc-400">leadscout_</span>
                <input
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="nombre-personalizado (opcional)"
                  className="rounded-r-lg bg-white px-2 py-2 text-sm focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newCodeInfinite} onChange={(e) => setNewCodeInfinite(e.target.checked)} />
                Ilimitado
              </label>
              <Button size="sm" onClick={createInviteCode}>Crear código</Button>
            </div>
          </div>

          {/* Códigos */}
          <div className="overflow-x-auto">
            <h3 className="mb-3 text-sm font-semibold">Códigos ({inviteCodes.length})</h3>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-3 pl-4">Código</th>
                  <th className="pb-3">Dueño</th>
                  <th className="pb-3">Usos</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inviteCodes.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-zinc-400">No hay códigos.</td></tr>
                )}
                {inviteCodes.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 pl-4 font-mono text-xs">{c.code}</td>
                    <td className="py-3 text-zinc-600">{c.ownerEmail || "—"}</td>
                    <td className="py-3">{c.maxUses === null ? "∞" : `${c.usesCount}/${c.maxUses}`}</td>
                    <td className="py-3">
                      {c.enabled ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Deshabilitado</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => renameInviteCode(c.id, c.code.replace(/^leadscout_/, ""))} className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100">Renombrar</button>
                        {c.maxUses !== null && (
                          <button onClick={() => patchInviteCode(c.id, { addUses: 10 }, "+10 usos")} className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">+10</button>
                        )}
                        <button onClick={() => patchInviteCode(c.id, { enabled: !c.enabled })} className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50">{c.enabled ? "Deshabilitar" : "Habilitar"}</button>
                        <button onClick={() => deleteInviteCode(c.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Searches Tab */}
      {tab === "searches" && (
        <div className="space-y-4">
          {selectedSearches.size > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
              <span className="text-sm font-medium text-red-800">
                {selectedSearches.size} seleccionada{selectedSearches.size === 1 ? "" : "s"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-100"
                onClick={handleBulkDeleteSearches}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar seleccionadas
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-3 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todas las búsquedas"
                      className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                      checked={searches.length > 0 && searches.every((s) => selectedSearches.has(s.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSearches(new Set(searches.map((s) => s.id)));
                        } else {
                          setSelectedSearches(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="pb-3">Búsqueda</th>
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
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                        checked={selectedSearches.has(s.id)}
                        onChange={(e) => {
                          const next = new Set(selectedSearches);
                          if (e.target.checked) {
                            next.add(s.id);
                          } else {
                            next.delete(s.id);
                          }
                          setSelectedSearches(next);
                        }}
                      />
                    </td>
                    <td className="py-3">
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
                    <td colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                      No hay búsquedas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "planes" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Configuración de Planes</h2>
            <Button size="sm" variant="outline" onClick={handleSeedPlans}>
              <Zap className="mr-1 h-3.5 w-3.5" />
              Crear planes por defecto
            </Button>
          </div>
          {planConfigs.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
              <CreditCard className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">No hay planes configurados.</p>
              <p className="mt-1 text-xs text-zinc-400">Usa el botón "Crear planes por defecto" para inicializarlos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {planConfigs.map((plan) => (
                <PlanConfigCard key={plan.id} plan={plan} onSave={handlePlanConfigUpdate} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "referrals" && (
        <div className="space-y-6">
          {topReferrers.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Top referidores</h2>
              <div className="flex flex-wrap gap-2">
                {topReferrers.map((r) => (
                  <div key={r.email} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span className="font-medium">{r.email}</span>
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-3 pl-4">Referidor</th>
                  <th className="pb-3">Referido</th>
                  <th className="pb-3 pr-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-zinc-500">
                      Todavía no hay referidos
                    </td>
                  </tr>
                ) : (
                  referrals.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 pl-4 font-medium">{r.referrerEmail}</td>
                      <td className="py-3">{r.referredEmail}</td>
                      <td className="py-3 pr-4 text-zinc-500">{new Date(r.referredAt).toLocaleDateString("es")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
        {value.toLocaleString("es")}
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

function PlanConfigCard({
  plan,
  onSave,
}: {
  plan: PlanConfig;
  onSave: (id: string, updates: Partial<PlanConfig>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [price, setPrice] = useState(String(plan.price / 100));
  const [stripePriceId, setStripePriceId] = useState(plan.stripePriceId || "");
  const [paypalPlanId, setPaypalPlanId] = useState(plan.paypalPlanId || "");
  const [featuresText, setFeaturesText] = useState(plan.features.join("\n"));

  async function save() {
    await onSave(plan.id, {
      name,
      description,
      price: Math.round(Number(price) * 100),
      stripePriceId: stripePriceId || null,
      paypalPlanId: paypalPlanId || null,
      features: featuresText.split("\n").filter(Boolean),
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold capitalize">{plan.name}</h3>
            {plan.popular && <Badge className="bg-primary text-white text-xs">Popular</Badge>}
            <Badge variant={plan.isActive ? "default" : "secondary"}>{plan.isActive ? "Activo" : "Inactivo"}</Badge>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-600" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{plan.description}</p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="font-medium">${(plan.price / 100).toFixed(2)}</span>
          <span className="text-zinc-400">/ {plan.interval}</span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">{plan.id}</span>
        </div>
        {plan.features.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {plan.features.map((f, i) => (
              <span key={i} className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{f}</span>
            ))}
          </div>
        )}
        {(plan.stripePriceId || plan.paypalPlanId) && (
          <div className="mt-2 flex gap-3 text-xs text-zinc-400">
            {plan.stripePriceId && <span>Stripe: {plan.stripePriceId}</span>}
            {plan.paypalPlanId && <span>PayPal: {plan.paypalPlanId}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold capitalize">Editando: {plan.name}</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={save}>
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-600" onClick={() => setEditing(false)}>
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Precio (USD)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="w-full rounded border border-zinc-200 px-2 py-1 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Descripción</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Stripe Price ID</label>
          <input value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm" />
          <p className="mt-0.5 text-[10px] text-zinc-400">Debe empezar con <code className="text-zinc-500">price_</code>, no <code className="text-zinc-500">prod_</code>. Lo encontrás en Stripe → Productos → Pricing.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">PayPal Plan ID</label>
          <input value={paypalPlanId} onChange={(e) => setPaypalPlanId(e.target.value)} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Características (una por línea)</label>
          <textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={4} className="w-full rounded border border-zinc-200 px-2 py-1 text-sm" />
        </div>
      </div>
    </div>
  );
}

function OrgRow({
  org,
  onSaved,
  onDeleted,
}: {
  org: AdminOrg;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [editingName, setEditingName] = useState(org.name);
  const [editingCurrency, setEditingCurrency] = useState(org.currency);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch(`/api/admin/orgs/${org.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: editingName, currency: editingCurrency }),
      });
      if (!res.ok) {
        alert("No se pudo guardar la organización. Intenta de nuevo.");
        return;
      }
      setIsEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar organización "${org.name}"?\n\nSe borrarán TODOS los datos: websites, leads, búsquedas, etc. Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/orgs/${org.id}`, { method: "DELETE", headers });
      if (!res.ok) {
        alert("No se pudo eliminar la organización. Intenta de nuevo.");
        return;
      }
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50">
      <td className="py-3 pl-4">
        {isEditing ? (
          <input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            aria-label="Nombre de la organización"
            className="rounded border border-zinc-200 px-2 py-1 text-sm"
          />
        ) : (
          <span className="font-medium">{org.name}</span>
        )}
      </td>
      <td className="py-3">{org.memberCount}</td>
      <td className="py-3">
        {org.plan === "pro" ? <ProBadge>Pro</ProBadge> : <FreeBadge>Free</FreeBadge>}
      </td>
      <td className="py-3">
        <Badge variant="outline">{org.status}</Badge>
      </td>
      <td className="py-3">
        {isEditing ? (
          <select
            value={editingCurrency}
            onChange={(e) => setEditingCurrency(e.target.value)}
            aria-label="Moneda de la organización"
            className="rounded border border-zinc-200 px-2 py-1 text-xs"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="ARS">ARS</option>
            <option value="BRL">BRL</option>
            <option value="MXN">MXN</option>
          </select>
        ) : (
          org.currency
        )}
      </td>
      <td className="py-3 pr-4 text-zinc-500">
        {new Date(org.createdAt).toLocaleDateString("es")}
      </td>
      <td className="py-3 pr-4">
        <div className="flex gap-1">
          {isEditing ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-emerald-600"
              disabled={saving}
              aria-label="Guardar cambios"
              onClick={save}
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-zinc-600"
              aria-label="Editar organización"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-red-600 hover:text-red-700"
            disabled={deleting}
            aria-label="Eliminar organización"
            onClick={remove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

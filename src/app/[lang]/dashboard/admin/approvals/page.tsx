"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

export default function AdminApprovalsPage() {
  const [pending, setPending] = useState<any[]>([]);

  async function fetchPending() {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/admin/approvals", { headers });
    if (res.ok) setPending(await res.json());
  }

  useEffect(() => { fetchPending(); }, []);

  async function handleAction(membershipId: string, action: "approve" | "reject") {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    await fetch("/api/admin/approvals", {
      method: "POST", headers,
      body: JSON.stringify({ membershipId, action }),
    });
    fetchPending();
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl tracking-tight">Aprobaciones Pendientes</h1>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <p className="text-lg font-medium">No hay aprobaciones pendientes</p>
          <p className="text-sm text-zinc-500">Todos los usuarios están aprobados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <User className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{m.email}</p>
                  <p className="text-xs text-zinc-500">Org: {m.orgName || m.orgId}</p>
                  <p className="text-xs text-zinc-400">Solicitado: {new Date(m.createdAt).toLocaleDateString("es")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleAction(m.id, "reject")}>
                  <XCircle className="mr-1 h-4 w-4" />
                  Rechazar
                </Button>
                <Button size="sm" onClick={() => handleAction(m.id, "approve")}>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Aprobar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

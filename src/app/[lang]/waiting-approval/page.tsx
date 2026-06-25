"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WaitingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function checkApproval() {
    setChecking(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/sign-in");
      return;
    }

    const res = await fetch("/api/auth/status", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.approved) {
        router.push("/dashboard");
      }
    }
    setChecking(false);
  }

  useEffect(() => {
    const interval = setInterval(checkApproval, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-zinc-900">
          Cuenta en revisión
        </h1>
        <p className="mb-6 text-zinc-600">
          Tu cuenta está pendiente de aprobación por un administrador. Te
          notificaremos por email cuando sea aprobada.
        </p>
        <div className="space-y-3">
          <button
            onClick={checkApproval}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Verificar estado
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
        <p className="mt-6 text-xs text-zinc-400">
          Esta página se actualiza automáticamente cada 30 segundos.
        </p>
      </div>
    </div>
  );
}

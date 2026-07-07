"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function confirmEmail() {
      const supabase = createClient();

      /* El link de confirmación llega con ?code=... (PKCE) o
         ?token_hash=...&type=... Hay que intercambiarlo por una sesión;
         getSession() por sí solo no alcanza. */
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: (type as "signup" | "email" | "recovery" | "magiclink") || "signup",
            token_hash: tokenHash,
          });
          if (error) throw error;
        }
      } catch {
        setStatus("error");
        setMessage("El enlace de confirmación ha expirado o no es válido.");
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus("error");
        setMessage("El enlace de confirmación ha expirado o no es válido.");
        return;
      }

      if (session) {
        setStatus("success");
        setMessage("Tu email ha sido confirmado exitosamente.");
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/dashboard/search");
        }, 2000);
      } else {
        // No session found - maybe the token is still being processed
        setStatus("error");
        setMessage("No se pudo confirmar tu email. Por favor intenta de nuevo o contacta soporte.");
      }
    }

    confirmEmail();
  }, [router, searchParams]);

  return (
    <Card className="w-full max-w-sm shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e2e8f0]">
        <CardHeader className="space-y-1">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle className="text-center">Confirmando email...</CardTitle>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-center text-xl">Email confirmado</CardTitle>
              <CardDescription className="text-center">{message}</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-center text-xl">Error</CardTitle>
              <CardDescription role="alert" className="text-center">{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {status === "error" && (
            <Button onClick={() => router.push("/auth/sign-in")}>
              Volver a iniciar sesión
            </Button>
          )}
        </CardContent>
      </Card>
  );
}

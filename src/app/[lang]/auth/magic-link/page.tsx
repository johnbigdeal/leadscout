"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, Mail } from "lucide-react";

const emailSchema = z.object({
  email: z.string().min(1, "El email es requerido").email("El formato del email no es válido"),
});

export default function MagicLinkPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/search`,
      },
    });
    setLoading(false);

    if (otpError) {
      setError(translateAuthError(otpError.message));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-center text-xl">Magic link enviado</CardTitle>
            <CardDescription className="text-center">
              Revisa tu bandeja de entrada. Te enviamos un enlace mágico para iniciar sesión sin contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/auth/sign-in" className="block text-center text-sm text-primary hover:underline">
              Volver a iniciar sesión
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl font-display tracking-tight">Magic Link</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión sin contraseña. Te enviaremos un enlace mágico a tu email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar magic link"
              )}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            <a href="/auth/sign-in" className="block text-sm text-primary hover:underline">
              Volver a iniciar sesión con contraseña
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

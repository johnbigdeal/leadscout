"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const signUpSchema = z.object({
  email: z.string().min(1, "El email es requerido").email("El formato del email no es válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "La contraseña es demasiado larga"),
  orgName: z.string().min(1, "El nombre de la organización es requerido").max(100, "Máximo 100 caracteres"),
});

export default function SignUpPage() {
  const t = useTranslations("auth");
  const ct = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const result = signUpSchema.safeParse({ email, password, orgName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] && typeof err.path[0] === "string") fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");

    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/es/auth/confirm`,
        data: { orgName },
      },
    });

    if (signUpError) {
      setLoading(false);
      setAuthError(translateAuthError(signUpError.message));
      return;
    }

    if (!data.user) {
      setLoading(false);
      setAuthError("No se pudo crear el usuario. Por favor intenta de nuevo.");
      return;
    }

    const referralCode = new URLSearchParams(window.location.search).get("ref") || undefined;

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id, orgName, referralCode }),
    });

    setLoading(false);

    if (!res.ok) {
      setAuthError("Error al crear la organización. Por favor contacta soporte.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-display tracking-tight">Revisá tu email</CardTitle>
            <CardDescription>
              Te enviamos un email de confirmación a <strong>{email}</strong>. Hacé
              clic en el enlace para activar tu cuenta y poder iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => router.push("/auth/sign-in")}>
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-display tracking-tight">{t("signUpTitle")}</CardTitle>
          <CardDescription>Crea tu cuenta de LeadScout en segundos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="tu@email.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgName">{t("orgName")}</Label>
              <Input
                id="orgName"
                name="orgName"
                autoComplete="organization"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (errors.orgName) setErrors((prev) => ({ ...prev, orgName: "" }));
                }}
                placeholder="Mi Empresa"
                className={errors.orgName ? "border-red-500" : ""}
              />
              {errors.orgName && <p className="text-xs text-red-600">{errors.orgName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Mínimo 8 caracteres"
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </div>

            {authError && (
              <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                ct("signUp")
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">
              {ct("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

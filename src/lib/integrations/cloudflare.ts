import { db } from "@/lib/db";
import { cloudflareAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const CF_API = "https://api.cloudflare.com/client/v4";
const CF_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";

type CfAccount = typeof cloudflareAccounts.$inferSelect;

/** ¿El access token OAuth está por expirar (o ya expiró)? Margen de 2 min. */
function isExpiring(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < 2 * 60 * 1000;
}

/** Renueva el access token OAuth con el refresh_token y lo persiste. Devuelve el nuevo token o null. */
async function refreshOAuthToken(account: CfAccount): Promise<string | null> {
  if (account.authType !== "oauth" || !account.refreshToken) return null;
  const clientId = process.env.CLOUDFLARE_CLIENT_ID;
  const clientSecret = process.env.CLOUDFLARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(CF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const accessToken = data?.access_token;
  if (!accessToken) return null;

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  await db
    .update(cloudflareAccounts)
    .set({
      apiToken: accessToken,
      refreshToken: data.refresh_token || account.refreshToken,
      tokenExpiresAt: expiresAt,
    })
    .where(eq(cloudflareAccounts.id, account.id));
  return accessToken;
}

/** Cuenta de Cloudflare de la org con un token válido (refresca si hace falta). */
export async function getCloudflareAccount(orgId: string): Promise<{ token: string; accountId: string } | null> {
  const [acc] = await db
    .select()
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, orgId))
    .limit(1);
  if (!acc) return null;

  let token = acc.apiToken;
  if (acc.authType === "oauth" && isExpiring(acc.tokenExpiresAt)) {
    const refreshed = await refreshOAuthToken(acc);
    if (refreshed) token = refreshed;
  }
  return { token, accountId: acc.accountId };
}

/** Solo el token válido de la org (o null si no está conectada). */
export async function getValidCfToken(orgId: string): Promise<string | null> {
  return (await getCloudflareAccount(orgId))?.token ?? null;
}

/**
 * Llama a la API de Cloudflare para una org, renovando el token OAuth si expiró.
 * Si aún responde por token inválido/expirado, intenta un refresh y reintenta una vez.
 * Devuelve `data.result`. Lanza Error con el mensaje de Cloudflare si falla.
 */
export async function cfFetch(orgId: string, path: string, opts?: RequestInit): Promise<any> {
  const [acc] = await db
    .select()
    .from(cloudflareAccounts)
    .where(eq(cloudflareAccounts.orgId, orgId))
    .limit(1);
  if (!acc) throw new Error("Cloudflare not connected");

  let token = acc.apiToken;
  if (acc.authType === "oauth" && isExpiring(acc.tokenExpiresAt)) {
    const refreshed = await refreshOAuthToken(acc);
    if (refreshed) token = refreshed;
  }

  const call = (t: string) =>
    fetch(`${CF_API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...opts?.headers },
    });

  let res = await call(token);
  let data = await res.json().catch(() => ({}));

  /* Reintento único: token expirado/inválido → refrescar y reintentar. */
  const authError = res.status === 401 || res.status === 403 || (data?.errors?.[0]?.code === 9109) || (data?.errors?.[0]?.code === 1000);
  if (!data.success && authError && acc.authType === "oauth") {
    const refreshed = await refreshOAuthToken(acc);
    if (refreshed) {
      res = await call(refreshed);
      data = await res.json().catch(() => ({}));
    }
  }

  if (!data.success) throw new Error(data.errors?.[0]?.message || "Cloudflare API error");
  return data.result;
}

/** Helper directo por token (para el token del sistema desde env). */
export async function cfFetchWithToken(token: string, path: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${CF_API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Cloudflare API error");
  return data.result;
}

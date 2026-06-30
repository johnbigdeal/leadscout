import { createClient } from "@/lib/supabase/client";

/**
 * Devuelve los headers de autenticación (Bearer) para llamar a las API routes
 * desde el cliente. Si no hay sesión, devuelve headers vacíos (peticiones
 * anónimas / lectura pública). Centraliza el patrón antes duplicado inline.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

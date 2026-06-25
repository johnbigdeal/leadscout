/**
 * Translate common Supabase auth errors to Spanish.
 * This file is safe to import in Client Components.
 */
export function translateAuthError(error: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email o contraseña incorrectos",
    "Email not confirmed": "Debes confirmar tu email antes de iniciar sesión",
    "User already registered": "Ya existe una cuenta con este email",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
    "Unable to validate email address: invalid format": "El formato del email no es válido",
    "Signup requires a valid password": "La contraseña no es válida",
    "User not found": "No se encontró una cuenta con este email",
    "Invalid email or password": "Email o contraseña incorrectos",
    "Rate limit exceeded": "Demasiados intentos. Por favor espera unos minutos",
    "Email link is invalid or has expired": "El enlace ha expirado o no es válido",
    "New password should be different from the old password": "La nueva contraseña debe ser diferente a la anterior",
    "Auth session missing": "Sesión no encontrada. Por favor inicia sesión nuevamente",
  };
  return map[error] || error;
}

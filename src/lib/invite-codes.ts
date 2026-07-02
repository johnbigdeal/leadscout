import { db } from "@/lib/db";
import { inviteCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const INVITE_PREFIX = "leadscout_";

const SUFFIX_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"; // sin caracteres ambiguos

function randomSuffix(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)];
  }
  return s;
}

/** Normaliza un nombre custom a un slug válido para el sufijo del código. */
export function slugifyCodeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Asegura el prefijo leadscout_ y limpia el resto. Devuelve el código completo. */
export function normalizeCode(input: string): string {
  const raw = input.trim();
  const withoutPrefix = raw.toLowerCase().startsWith(INVITE_PREFIX)
    ? raw.slice(INVITE_PREFIX.length)
    : raw;
  const slug = slugifyCodeName(withoutPrefix) || randomSuffix();
  return INVITE_PREFIX + slug;
}

/** Genera un código único con prefijo leadscout_. */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = INVITE_PREFIX + randomSuffix(6);
    const [existing] = await db
      .select({ id: inviteCodes.id })
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code))
      .limit(1);
    if (!existing) return code;
  }
  return INVITE_PREFIX + randomSuffix(10);
}

/** Devuelve el código personal del usuario, creándolo si no existe (lazy). */
export async function getOrCreateUserCode(userId: string, isSuperAdmin: boolean) {
  const [existing] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.ownerId, userId))
    .limit(1);
  if (existing) return existing;

  const code = await generateUniqueInviteCode();
  const [created] = await db
    .insert(inviteCodes)
    .values({
      code,
      ownerId: userId,
      maxUses: isSuperAdmin ? null : 10,
    })
    .returning();
  return created;
}

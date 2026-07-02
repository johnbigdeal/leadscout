import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { organizations, memberships, subscriptions, pipelines, profiles, subscribers, inviteCodes } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { generateUniqueReferralCode } from "@/lib/referrals";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  // Rate limit by IP - 5 requests per minute
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const limit = rateLimit(`onboarding:${ip}`, { maxRequests: 5, windowMs: 60_000 });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Por favor espera unos minutos." },
      { status: 429 },
    );
  }

  const { userId, orgName, referralCode, inviteCode } = await request.json();
  if (!userId || !orgName) {
    return NextResponse.json({ error: "Missing userId or orgName" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSuperAdmin = user.email === "johnbigdeal@gmail.com";

  /* Capturar el correo para envíos/campañas futuras (idempotente; corre incluso
     en el early-return de abajo). */
  if (user.email) {
    await db
      .insert(subscribers)
      .values({ email: user.email, source: "signup", userId })
      .onConflictDoNothing();
  }

  /* Idempotente: si el usuario ya tiene membership, devolvemos su org existente
     en vez de crear una duplicada. Cubre reintentos y el caso de una cuenta que
     quedó a medias (perfil sin org): al reintentar se completa abajo. */
  const [existingMembership] = await db
    .select({ orgId: memberships.orgId, approved: memberships.approved })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  if (existingMembership) {
    return NextResponse.json({
      orgId: existingMembership.orgId,
      approved: existingMembership.approved,
    });
  }

  /* Resolve referrer from the referral code (must exist and not be self). */
  let referredBy: string | null = null;
  if (referralCode && typeof referralCode === "string") {
    const [referrer] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.referralCode, referralCode.trim().toUpperCase()))
      .limit(1);
    if (referrer && referrer.id !== userId) referredBy = referrer.id;
  }

  const newReferralCode = await generateUniqueReferralCode();
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  /* Todo en una transacción: si algo falla, se revierte completo. Evita cuentas
     a medias (perfil sin org/membership) y organizaciones huérfanas.
     El registro requiere un código de invitación válido (salvo super admin);
     se bloquea la fila del código y se consume un uso de forma atómica. */
  let orgId: string;
  try {
    orgId = await db.transaction(async (tx) => {
      let codeOwnerId: string | null = null;

      if (!isSuperAdmin) {
        const normalized = typeof inviteCode === "string" ? inviteCode.trim().toLowerCase() : "";
        if (!normalized) throw new Error("INVITE_REQUIRED");
        const [code] = await tx
          .select()
          .from(inviteCodes)
          .where(eq(inviteCodes.code, normalized))
          .for("update")
          .limit(1);
        if (!code || !code.enabled || (code.maxUses !== null && code.usesCount >= code.maxUses)) {
          throw new Error("INVITE_INVALID");
        }
        await tx
          .update(inviteCodes)
          .set({ usesCount: sql`${inviteCodes.usesCount} + 1` })
          .where(eq(inviteCodes.id, code.id));
        codeOwnerId = code.ownerId;
      }

      const [org] = await tx
        .insert(organizations)
        .values({ name: orgName })
        .returning();

      await tx
        .insert(profiles)
        .values({
          id: userId,
          email: user.email!,
          role: isSuperAdmin ? "super_admin" : "user",
          referralCode: newReferralCode,
          referredBy: codeOwnerId ?? referredBy,
        })
        .onConflictDoNothing();

      await tx.insert(memberships).values({
        orgId: org.id,
        userId,
        role: isSuperAdmin ? "superadmin" : "owner",
        /* Código válido ⇒ aprobado automáticamente. */
        approved: true,
      });

      await tx.insert(subscriptions).values({
        orgId: org.id,
        plan: "free",
        searchQuota: 50,
        trialEndsAt,
      });

      await tx.insert(pipelines).values({
        orgId: org.id,
        name: "Ventas",
        category: "General",
        stages: ["new", "contacted", "qualified", "won", "lost"],
      });

      return org.id;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVITE_REQUIRED") {
      return NextResponse.json({ error: "Necesitás un código de invitación para registrarte." }, { status: 400 });
    }
    if (msg === "INVITE_INVALID") {
      return NextResponse.json({ error: "El código de invitación no es válido, está deshabilitado o alcanzó su límite de usos." }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ orgId, approved: true });
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const CF_OAUTH_URL = "https://dash.cloudflare.com/oauth2/auth";

export async function GET(request: Request) {
  const result = await requireAuth(request);
  if (result.response) return result.response;
  const ctx = result.ctx;

  const clientId = process.env.CLOUDFLARE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "CLOUDFLARE_CLIENT_ID not configured" }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/cloudflare/oauth/callback`;

  const url = new URL(CF_OAUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  /* Save state and orgId in cookies so we can verify them on callback */
  const response = NextResponse.json({ url: url.toString() });
  response.cookies.set("cf_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("cf_oauth_org", ctx.orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}

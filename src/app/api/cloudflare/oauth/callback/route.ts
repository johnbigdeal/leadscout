import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cloudflareAccounts, memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CF_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  /* Read cookies manually from request headers */
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [k, ...v] = c.split("=");
      return [k, decodeURIComponent(v.join("="))];
    }),
  );

  const savedState = cookies["cf_oauth_state"];
  const orgId = cookies["cf_oauth_org"];

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?error=${encodeURIComponent(errorDescription || error)}`,
    );
  }

  if (!code || !state || state !== savedState || !orgId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?error=invalid_state`,
    );
  }

  const clientId = process.env.CLOUDFLARE_CLIENT_ID;
  const clientSecret = process.env.CLOUDFLARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?error=missing_credentials`,
    );
  }

  try {
    /* Exchange code for tokens */
    const tokenRes = await fetch(CF_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/cloudflare/oauth/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?error=${encodeURIComponent("token_exchange_failed")}`,
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?error=no_access_token`,
      );
    }

    /* Fetch zones to get account info (zone:read scope) */
    const zonesRes = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=1", {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const zonesData = await zonesRes.json();
    const accountId = zonesData.result?.[0]?.account?.id || "unknown";

    /* Upsert cloudflare account */
    const existing = await db
      .select()
      .from(cloudflareAccounts)
      .where(eq(cloudflareAccounts.orgId, orgId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(cloudflareAccounts)
        .set({
          apiToken: accessToken,
          refreshToken: refreshToken || null,
          authType: "oauth",
          accountId: accountId || existing[0].accountId,
        })
        .where(eq(cloudflareAccounts.id, existing[0].id));
    } else {
      await db.insert(cloudflareAccounts).values({
        orgId,
        accountId: accountId || "unknown",
        apiToken: accessToken,
        refreshToken: refreshToken || null,
        authType: "oauth",
      });
    }

    /* Clear oauth cookies */
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?success=connected`,
    );
    response.cookies.set("cf_oauth_state", "", { maxAge: 0, path: "/" });
    response.cookies.set("cf_oauth_org", "", { maxAge: 0, path: "/" });
    return response;
  } catch (e: any) {
    console.error("OAuth callback error:", e);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/es/dashboard/settings/domains?error=${encodeURIComponent(e.message || "unknown")}`,
    );
  }
}

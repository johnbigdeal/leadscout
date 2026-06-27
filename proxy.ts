import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const mainDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "");

  /* Redirect www to non-www */
  if (mainDomain && host === `www.${mainDomain}`) {
    const url = request.nextUrl.clone();
    url.host = mainDomain;
    return NextResponse.redirect(url, 301);
  }

  /* Custom domain detection */
  const isMainDomain = mainDomain ? host === mainDomain : false;
  const isMainSubdomain = mainDomain ? host.endsWith(`.${mainDomain}`) : false;
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const isVercelPreview = host.includes("vercel.app");

  /* If it's a subdomain of the main domain (e.g. pedro.leadscout.lat), rewrite to site page */
  if (mainDomain && isMainSubdomain && !isMainDomain && !isLocalhost && !isVercelPreview) {
    const url = request.nextUrl.clone();
    url.pathname = `/site/${host}`;
    return NextResponse.rewrite(url);
  }

  /* If it's any other custom domain, also rewrite */
  if (mainDomain && !isMainDomain && !isMainSubdomain && !isLocalhost && !isVercelPreview) {
    const url = request.nextUrl.clone();
    url.pathname = `/site/${host}`;
    return NextResponse.rewrite(url);
  }

  const langPrefix = pathname.startsWith("/es");
  const isApi = pathname.startsWith("/api");
  const isStatic = pathname.startsWith("/_next") || pathname === "/favicon.ico";

  if (isApi || isStatic) {
    return NextResponse.next();
  }

  if (!langPrefix) {
    return intlMiddleware(request);
  }

  const { createServerClient } = await import("@supabase/ssr");

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/es/dashboard")) {
    const signInUrl = new URL("/es/auth/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}

export const config = {
  /* Match everything except Next internals, the API, and static assets
     (logos, icons, images) under /public so they serve without a locale
     rewrite. */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

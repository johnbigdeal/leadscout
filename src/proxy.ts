import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  /* Custom domain detection: anything that isn't the main domain, localhost or a
     Vercel preview (e.g. pedro.leadscout.lat or a client's own domain) → rewrite
     to the public site route. */
  const isMainDomain = mainDomain ? host === mainDomain : false;
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const isVercelPreview = host.includes("vercel.app");

  if (mainDomain && !isMainDomain && !isLocalhost && !isVercelPreview) {
    const url = request.nextUrl.clone();
    url.pathname = `/site/${host}`;
    return NextResponse.rewrite(url);
  }

  const langPrefix = pathname.startsWith("/es");

  /* App is Spanish-only (locale prefix always present): redirect any non-prefixed
     app path to its /es-prefixed equivalent so the [lang] route resolves.
     e.g. /auth/sign-in → /es/auth/sign-in, / → /es. */
  if (!langPrefix) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/es" : `/es${pathname}`;
    return NextResponse.redirect(url);
  }

  /* Gate the dashboard: redirect unauthenticated users to sign-in. */
  if (pathname.startsWith("/es/dashboard")) {
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
    if (!user) {
      const signInUrl = new URL("/es/auth/sign-in", request.url);
      return NextResponse.redirect(signInUrl);
    }
    return supabaseResponse;
  }

  return NextResponse.next();
}

export const config = {
  /* Run on all app routes EXCEPT API, Next internals, and any path with a file
     extension (static assets under /public, e.g. /brand/*.png). This lets the
     non-prefixed → /es redirect happen for pages while static files serve as-is. */
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

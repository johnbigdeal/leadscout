import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Public paths that don't require auth
const PUBLIC_PATHS = [
  "/",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/magic-link",
  "/auth/confirm",
  "/waiting-approval",
  "/api/auth/status",
  "/api/onboarding",
  "/api/websites", // POST is public? No, it requires auth. But let's handle in route.
];

// API paths that are always public
const PUBLIC_API_PATHS = [
  "/api/auth/status",
  "/api/onboarding",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

  // Allow public paths without auth check
  if (isPublicPath || isPublicApi) {
    return NextResponse.next();
  }

  // Only protect /dashboard/* and /api/* routes
  const needsAuth = pathname.startsWith("/dashboard") || pathname.startsWith("/api");
  if (!needsAuth) {
    return NextResponse.next();
  }

  // Create Supabase server client with cookie handling
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // No user - redirect or return 401
  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect to sign-in with return URL
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /site/* (public websites)
     * - /magic/* (public magic links)
     */
    "/((?!_next/static|_next/image|favicon.ico|site/|magic/).*)",
  ],
};

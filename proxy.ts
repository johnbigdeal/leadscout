import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["es", "pt-BR"];
const defaultLocale = "es";

function getLocale(request: NextRequest): string {
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang.split(",")[0]?.split("-")[0];
    if (preferred === "pt") return "pt-BR";
    if (locales.includes(preferred ?? "")) return preferred!;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return NextResponse.next();

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|icon).*)"],
};

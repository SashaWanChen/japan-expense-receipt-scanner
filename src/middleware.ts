import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

/**
 * 可選的密碼保護。
 * 未設定 APP_PASSWORD → 完全不啟用（Codespaces Private port 的預設情境）。
 * 有設定 → 沒有有效 cookie 一律導向 /login。
 */
export async function middleware(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE)?.value ?? "";
  if (cookie && safeEqual(cookie, await sessionToken(appPassword))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  /** /login、/api/login、靜態資源、manifest、icons 除外。 */
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|icons|favicon.ico|manifest.webmanifest).*)",
  ],
};

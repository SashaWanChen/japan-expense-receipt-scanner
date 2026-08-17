import { NextResponse } from "next/server";
import { AUTH_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/login — 驗證密碼並寫入 httpOnly cookie。 */
export async function POST(request: Request) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json({ ok: true, protection: false });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  if (!safeEqual(password, appPassword)) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, protection: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await sessionToken(appPassword),
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

/** GET /api/login — 查詢是否啟用密碼保護（登入頁用）。 */
export function GET() {
  return NextResponse.json({ protection: Boolean(process.env.APP_PASSWORD) });
}

/**
 * 可選的密碼保護。
 * 未設定 APP_PASSWORD 時完全不啟用（走 Codespaces Private port 的預設情境）。
 * Cookie 存的是密碼的雜湊值，不是密碼本身。
 */
export const AUTH_COOKIE = "jrs_auth";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 由 APP_PASSWORD 推導出 session token（Web Crypto，Node 與 Edge 都可用）。 */
export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`jrs:${password}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

/** 定時比較，避免 timing attack。 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

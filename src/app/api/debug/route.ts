import { NextResponse } from "next/server";
import { hasGeminiKey, MODELS } from "@/lib/gemini";
import { checkNotion, notionConfigStatus } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ServiceStatus {
  configured: boolean;
  ok: boolean;
  detail: string;
}

/** GET /api/debug — 健康檢查。只回報「有沒有設定 / 連不連得上」，不洩漏 key 內容。 */
export async function GET() {
  const gemini: ServiceStatus = hasGeminiKey()
    ? { configured: true, ok: true, detail: `已設定 API key，model fallback：${MODELS.join(" → ")}` }
    : { configured: false, ok: false, detail: "未設定 GEMINI_API_KEY，掃描功能無法使用" };

  const notionConfig = notionConfigStatus();
  let notion: ServiceStatus;
  let database: { title: string; properties: Array<{ name: string; type: string }> } | null = null;

  if (!notionConfig.ok) {
    notion = {
      configured: false,
      ok: false,
      detail: `未設定 ${notionConfig.missing.join("、")}`,
    };
  } else {
    try {
      const info = await checkNotion();
      database = { title: info.databaseTitle, properties: info.properties };
      notion = { configured: true, ok: true, detail: `已連線資料庫「${info.databaseTitle}」` };
    } catch (error) {
      notion = {
        configured: true,
        ok: false,
        detail: `連線失敗：${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  return NextResponse.json({
    time: new Date().toISOString(),
    passwordProtection: process.env.APP_PASSWORD ? "已啟用" : "未啟用（未設定 APP_PASSWORD）",
    gemini,
    notion,
    database,
  });
}

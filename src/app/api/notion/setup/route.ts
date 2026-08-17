import { NextResponse } from "next/server";
import { badRequest, errorResponse } from "@/lib/api";
import { extractNotionId, setupDatabase } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notion/setup — 一鍵建立符合 App schema 的 Notion 資料庫。
 * body: { page: string（頁面網址或 ID）, exchangeRate?: number, title?: string }
 * 只需要 NOTION_TOKEN；成功後回傳新資料庫 ID 供填入 NOTION_DATABASE_ID。
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      page?: unknown;
      exchangeRate?: unknown;
      title?: unknown;
    };

    let pageId: string;
    try {
      pageId = extractNotionId(typeof body.page === "string" ? body.page : "");
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : String(err));
    }

    const rate = Number(body.exchangeRate);
    const result = await setupDatabase(pageId, {
      exchangeRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

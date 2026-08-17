import { NextResponse } from "next/server";
import { badRequest, errorResponse } from "@/lib/api";
import { cacheInvalidate, RECEIPTS_CACHE_KEY } from "@/lib/cache";
import { deleteReceipt } from "@/lib/notion";

export const runtime = "nodejs";

/** POST /api/notion/delete — 刪除記錄（archive 到 Notion 垃圾桶）。 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return badRequest("缺少記錄 id");

    await deleteReceipt(id);
    cacheInvalidate(RECEIPTS_CACHE_KEY);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}

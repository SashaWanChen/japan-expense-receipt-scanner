import { NextResponse } from "next/server";
import { errorResponse, toReceiptInput } from "@/lib/api";
import { cacheGet, cacheInvalidate, cacheSet, RECEIPTS_CACHE_KEY } from "@/lib/cache";
import { createReceipt, listReceipts } from "@/lib/notion";
import type { Receipt } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notion — 取得所有記錄（in-memory cache，TTL 3 分鐘）。 */
export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    if (refresh) cacheInvalidate(RECEIPTS_CACHE_KEY);

    const cached = cacheGet<Receipt[]>(RECEIPTS_CACHE_KEY);
    if (cached) return NextResponse.json({ receipts: cached, cached: true });

    const receipts = await listReceipts();
    cacheSet(RECEIPTS_CACHE_KEY, receipts);
    return NextResponse.json({ receipts, cached: false });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/notion — 新增一筆記錄。 */
export async function POST(request: Request) {
  try {
    const input = toReceiptInput(await request.json());
    const id = await createReceipt(input);
    cacheInvalidate(RECEIPTS_CACHE_KEY);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}

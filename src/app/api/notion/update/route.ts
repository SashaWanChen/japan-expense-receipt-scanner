import { NextResponse } from "next/server";
import { badRequest, errorResponse, toReceiptInput } from "@/lib/api";
import { cacheInvalidate, RECEIPTS_CACHE_KEY } from "@/lib/cache";
import { updateReceipt } from "@/lib/notion";

export const runtime = "nodejs";

/** POST /api/notion/update — 更新既有記錄。 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return badRequest("缺少記錄 id");

    await updateReceipt(id, toReceiptInput(body));
    cacheInvalidate(RECEIPTS_CACHE_KEY);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}

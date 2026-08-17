import { NextResponse } from "next/server";
import { badRequest, errorResponse } from "@/lib/api";
import { cacheInvalidate, RECEIPTS_CACHE_KEY } from "@/lib/cache";
import { renameUser } from "@/lib/notion";

export const runtime = "nodejs";

/** POST /api/notion/rename-user — 批次把「用戶」欄位從舊名改成新名。 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { oldName?: string; newName?: string };
    const oldName = (body.oldName ?? "").trim();
    const newName = (body.newName ?? "").trim();
    if (!oldName || !newName) return badRequest("缺少舊名或新名");
    if (oldName === newName) return NextResponse.json({ ok: true, updated: 0 });

    const updated = await renameUser(oldName, newName);
    cacheInvalidate(RECEIPTS_CACHE_KEY);
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    return errorResponse(error);
  }
}

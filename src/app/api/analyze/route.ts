import { NextResponse } from "next/server";
import { errorResponse, badRequest } from "@/lib/api";
import { analyzeReceipt } from "@/lib/gemini";

export const runtime = "nodejs";
/** Gemini 辨識可能較久，放寬時間上限。 */
export const maxDuration = 60;

/** POST /api/analyze — 收據圖片（base64）→ Gemini 辨識結果 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { image?: string; mimeType?: string };
    const raw = typeof body.image === "string" ? body.image : "";
    if (!raw) return badRequest("缺少圖片內容");

    // 相容帶 data: prefix 的傳法
    const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
    const mimeType = body.mimeType ?? "image/jpeg";

    const { result, model } = await analyzeReceipt(base64, mimeType);
    return NextResponse.json({ result, model });
  } catch (error) {
    return errorResponse(error);
  }
}

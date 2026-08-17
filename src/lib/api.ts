/** API route 共用：統一錯誤格式與輸入正規化。 */
import { NextResponse } from "next/server";
import { MissingApiKeyError } from "./gemini";
import { MissingNotionConfigError } from "./notion";
import {
  CATEGORIES,
  PAYMENT_METHODS,
  type Category,
  type PaymentMethod,
  type ReceiptInput,
} from "./types";

/** 缺環境變數時回 503 並附上引導，不直接 crash。 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof MissingApiKeyError || error instanceof MissingNotionConfigError) {
    return NextResponse.json(
      { error: error.message, hint: "請參考 docs/SETUP.md 設定環境變數，或改用 Demo 模式。" },
      { status: 503 },
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** 把 request body 正規化成 ReceiptInput，避免髒資料進 Notion。 */
export function toReceiptInput(body: unknown): ReceiptInput {
  const data = (body ?? {}) as Record<string, unknown>;
  const amount = Number(data.amountJPY);
  const category = str(data.category);
  const paymentMethod = str(data.paymentMethod);

  return {
    title: str(data.title),
    storeName: str(data.storeName),
    storeNameJa: str(data.storeNameJa),
    itemsJa: str(data.itemsJa),
    date: str(data.date).slice(0, 10),
    amountJPY: Number.isFinite(amount) ? Math.round(amount) : 0,
    category: (CATEGORIES as readonly string[]).includes(category)
      ? (category as Category)
      : "",
    paymentMethod: (PAYMENT_METHODS as readonly string[]).includes(paymentMethod)
      ? (paymentMethod as PaymentMethod)
      : "",
    region: str(data.region),
    user: str(data.user),
    note: str(data.note),
  };
}

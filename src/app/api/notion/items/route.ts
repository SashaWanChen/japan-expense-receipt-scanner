import { NextResponse } from "next/server";
import { badRequest, errorResponse, toReceiptInput } from "@/lib/api";
import { cacheInvalidate, RECEIPTS_CACHE_KEY } from "@/lib/cache";
import { allocateAmounts, createReceipts } from "@/lib/notion";
import type { ReceiptInput } from "@/lib/types";

export const runtime = "nodejs";

interface ItemPayload {
  name?: string;
  nameJa?: string;
  price?: number;
  user?: string;
}

/**
 * POST /api/notion/items — 逐品項寫入。
 * 一張收據拆成多筆記錄，按品項金額比例分攤稅額，
 * 加總必定等於收據總額（四捨五入誤差補到最後一項）。
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { items?: ItemPayload[] } & Record<string, unknown>;
    const base = toReceiptInput(body);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return badRequest("缺少品項清單");

    const prices = items.map((item) => ({ price: Number(item.price) || 0 }));
    const amounts = allocateAmounts(prices, base.amountJPY);

    const inputs: ReceiptInput[] = items.map((item, index) => {
      const name = (item.name ?? "").trim();
      const nameJa = (item.nameJa ?? "").trim();
      return {
        ...base,
        title: name || nameJa || `品項 ${index + 1}`,
        itemsJa: nameJa,
        amountJPY: amounts[index],
        user: (item.user ?? "").trim() || base.user,
        note: [base.note, `逐品項寫入 ${index + 1}/${items.length}（總額 ¥${base.amountJPY}）`]
          .filter(Boolean)
          .join(" / "),
      };
    });

    const ids = await createReceipts(inputs);
    cacheInvalidate(RECEIPTS_CACHE_KEY);
    return NextResponse.json({ ok: true, ids, count: ids.length, amounts });
  } catch (error) {
    return errorResponse(error);
  }
}

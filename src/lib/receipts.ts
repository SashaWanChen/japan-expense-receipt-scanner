/**
 * 前端資料存取層：Demo 模式讀寫 localStorage，否則呼叫 /api/notion。
 * 頁面只跟這一層互動，不用自己判斷 Demo 模式。
 */
import {
  demoCreate,
  demoCreateMany,
  demoDelete,
  demoList,
  demoRenameUser,
  demoUpdate,
  isDemoMode,
} from "./demo-mode";
import type { AnalyzeResult, Receipt, ReceiptInput, ReceiptItem } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const payload = data as { error?: string; hint?: string };
    throw new Error([payload.error, payload.hint].filter(Boolean).join("\n") || "請求失敗");
  }
  return data as T;
}

export async function fetchReceipts(refresh = false): Promise<Receipt[]> {
  if (isDemoMode()) return demoList();
  const data = await request<{ receipts: Receipt[] }>(
    `/api/notion${refresh ? "?refresh=1" : ""}`,
  );
  return data.receipts;
}

export async function createReceipt(input: ReceiptInput): Promise<void> {
  if (isDemoMode()) {
    demoCreate(input);
    return;
  }
  await request("/api/notion", { method: "POST", body: JSON.stringify(input) });
}

/** 逐品項寫入：多筆記錄，稅額按比例分攤。 */
export async function createReceiptItems(
  base: ReceiptInput,
  items: ReceiptItem[],
): Promise<void> {
  if (isDemoMode()) {
    const total = Math.round(base.amountJPY);
    const sum = items.reduce((acc, item) => acc + Math.max(0, item.price), 0);
    let allocated = 0;
    const inputs: ReceiptInput[] = items.map((item, index) => {
      const amount =
        index === items.length - 1
          ? total - allocated
          : Math.round((sum > 0 ? Math.max(0, item.price) / sum : 1 / items.length) * total);
      allocated += amount;
      return {
        ...base,
        title: item.name || item.nameJa || `品項 ${index + 1}`,
        itemsJa: item.nameJa,
        amountJPY: amount,
      };
    });
    demoCreateMany(inputs);
    return;
  }
  await request("/api/notion/items", {
    method: "POST",
    body: JSON.stringify({ ...base, items }),
  });
}

export async function updateReceipt(id: string, input: ReceiptInput): Promise<void> {
  if (isDemoMode()) {
    demoUpdate(id, input);
    return;
  }
  await request("/api/notion/update", {
    method: "POST",
    body: JSON.stringify({ id, ...input }),
  });
}

export async function deleteReceipt(id: string): Promise<void> {
  if (isDemoMode()) {
    demoDelete(id);
    return;
  }
  await request("/api/notion/delete", { method: "POST", body: JSON.stringify({ id }) });
}

/** 改名時批次同步 Notion 的「用戶」欄位，回傳更新筆數。 */
export async function renameUserRecords(oldName: string, newName: string): Promise<number> {
  if (isDemoMode()) return demoRenameUser(oldName, newName);
  const data = await request<{ updated: number }>("/api/notion/rename-user", {
    method: "POST",
    body: JSON.stringify({ oldName, newName }),
  });
  return data.updated;
}

export async function analyzeImage(
  base64: string,
  mimeType: string,
): Promise<{ result: AnalyzeResult; model: string }> {
  return request<{ result: AnalyzeResult; model: string }>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ image: base64, mimeType }),
  });
}

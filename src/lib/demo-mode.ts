/**
 * Demo 模式：開啟時所有資料都在 localStorage，
 * 不呼叫 Notion / Gemini，沒有 API key 也能瀏覽完整 UI。
 */
import { generateMockReceipts } from "./mock-data";
import { loadSettings } from "./settings";
import type { AnalyzeResult, Receipt, ReceiptInput } from "./types";

const DEMO_RECEIPTS_KEY = "jrs.demo-receipts";

export function isDemoMode(): boolean {
  return loadSettings().demoMode;
}

function readStore(): Receipt[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_RECEIPTS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Receipt[]) : null;
  } catch {
    return null;
  }
}

function writeStore(receipts: Receipt[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_RECEIPTS_KEY, JSON.stringify(receipts));
}

function sortByDateDesc(receipts: Receipt[]): Receipt[] {
  return [...receipts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** 讀取 Demo 資料，第一次會自動塞入 55 筆假資料。 */
export function demoList(): Receipt[] {
  const existing = readStore();
  if (existing) return sortByDateDesc(existing);
  const seeded = generateMockReceipts(loadSettings().users.map((u) => u.name));
  writeStore(seeded);
  return seeded;
}

export function demoCreate(input: ReceiptInput): Receipt {
  const receipts = demoList();
  const receipt: Receipt = { ...input, id: `demo-${Date.now()}-${receipts.length}` };
  writeStore([receipt, ...receipts]);
  return receipt;
}

export function demoCreateMany(inputs: ReceiptInput[]): Receipt[] {
  const receipts = demoList();
  const created = inputs.map((input, i) => ({
    ...input,
    id: `demo-${Date.now()}-${receipts.length + i}`,
  }));
  writeStore([...created, ...receipts]);
  return created;
}

export function demoUpdate(id: string, input: ReceiptInput): void {
  writeStore(demoList().map((r) => (r.id === id ? { ...input, id } : r)));
}

export function demoDelete(id: string): void {
  writeStore(demoList().filter((r) => r.id !== id));
}

export function demoRenameUser(oldName: string, newName: string): number {
  const receipts = demoList();
  let count = 0;
  const next = receipts.map((r) => {
    if (r.user !== oldName) return r;
    count += 1;
    return { ...r, user: newName };
  });
  writeStore(next);
  return count;
}

/** 重設 Demo 資料為原始 55 筆。 */
export function demoReset(): void {
  writeStore(generateMockReceipts(loadSettings().users.map((u) => u.name)));
}

/** Demo 模式下的假辨識結果，取代 Gemini 回傳。 */
export function demoAnalyze(): AnalyzeResult {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  return {
    storeName: "全家便利商店",
    storeNameJa: "ファミリーマート",
    items: "飯糰, 綠茶, 布丁",
    itemsJa: "おにぎり, 緑茶, プリン",
    itemList: [
      { name: "飯糰", nameJa: "おにぎり", price: 150, taxRate: 8 },
      { name: "綠茶", nameJa: "緑茶", price: 130, taxRate: 8 },
      { name: "布丁", nameJa: "プリン", price: 152, taxRate: 8 },
    ],
    amountJPY: 432,
    taxType: "内税",
    category: "餐飲",
    paymentMethod: "現金",
    date,
    note: "Demo 模式假資料：内税 8%（外帶）",
  };
}

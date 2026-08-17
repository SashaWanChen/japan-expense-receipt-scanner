/** 統計計算：Dashboard 與 Stats 頁共用。 */
import type { Receipt } from "./types";

export function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function sumAmount(receipts: Receipt[]): number {
  return receipts.reduce((acc, r) => acc + (Number.isFinite(r.amountJPY) ? r.amountJPY : 0), 0);
}

export function filterByUser(receipts: Receipt[], user: string): Receipt[] {
  if (!user) return receipts;
  return receipts.filter((r) => r.user === user);
}

export interface Bucket {
  key: string;
  amount: number;
  count: number;
}

function toBuckets(map: Map<string, Bucket>): Bucket[] {
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function groupBy(receipts: Receipt[], pick: (r: Receipt) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const receipt of receipts) {
    const key = pick(receipt) || "未分類";
    const bucket = map.get(key) ?? { key, amount: 0, count: 0 };
    bucket.amount += receipt.amountJPY;
    bucket.count += 1;
    map.set(key, bucket);
  }
  return toBuckets(map);
}

export function byCategory(receipts: Receipt[]): Bucket[] {
  return groupBy(receipts, (r) => r.category);
}

export function byPaymentMethod(receipts: Receipt[]): Bucket[] {
  return groupBy(receipts, (r) => r.paymentMethod);
}

export function byRegion(receipts: Receipt[]): Bucket[] {
  return groupBy(receipts, (r) => r.region);
}

export function byUser(receipts: Receipt[]): Bucket[] {
  return groupBy(receipts, (r) => r.user);
}

/** 每日花費，日期由舊到新。 */
export function byDay(receipts: Receipt[]): Bucket[] {
  return groupBy(receipts, (r) => r.date || "未填日期").sort((a, b) =>
    a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
  );
}

export function topSpending(receipts: Receipt[], limit = 10): Receipt[] {
  return [...receipts].sort((a, b) => b.amountJPY - a.amountJPY).slice(0, limit);
}

/** 取得所有出現過的用戶名稱（含 Notion 上已刪除的舊用戶）。 */
export function usedUserNames(receipts: Receipt[]): string[] {
  return Array.from(new Set(receipts.map((r) => r.user).filter(Boolean)));
}

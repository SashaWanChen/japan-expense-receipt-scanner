/** 共用型別定義。 */

export const CATEGORIES = [
  "餐飲",
  "交通",
  "購物",
  "門票",
  "住宿",
  "藥品",
  "其他",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PAYMENT_METHODS = [
  "現金",
  "信用卡",
  "Suica",
  "PayPay",
  "其他",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const TAX_TYPES = ["外税", "内税", "免税"] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const TAX_RATES = [10, 8, 0] as const;
export type TaxRate = (typeof TAX_RATES)[number];

/** Gemini 逐品項辨識結果。 */
export interface ReceiptItem {
  name: string;
  nameJa: string;
  price: number;
  taxRate: TaxRate;
}

/** Gemini Vision 回傳的收據辨識結果。 */
export interface AnalyzeResult {
  storeName: string;
  storeNameJa: string;
  items: string;
  itemsJa: string;
  itemList: ReceiptItem[];
  amountJPY: number;
  taxType: TaxType;
  category: Category;
  paymentMethod: PaymentMethod;
  date: string;
  note: string;
}

/** 一筆收據記錄（對應 Notion 一個 page）。 */
export interface Receipt {
  id: string;
  title: string;
  storeName: string;
  storeNameJa: string;
  itemsJa: string;
  date: string;
  amountJPY: number;
  category: Category | "";
  paymentMethod: PaymentMethod | "";
  region: string;
  user: string;
  note: string;
}

/** 建立 / 更新記錄時送出的資料。 */
export type ReceiptInput = Omit<Receipt, "id">;

/** 虛擬用戶（純 localStorage 標籤，不需登入）。 */
export interface VirtualUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

/** 應用設定，全部存在 localStorage。 */
export interface AppSettings {
  budget: number;
  budgetNote: string;
  exchangeRate: number;
  tripDays: number;
  tripSchedule: string;
  users: VirtualUser[];
  demoMode: boolean;
}

/** 行程表解析後的地區區間。 */
export interface TripSegment {
  region: string;
  start: string;
  end: string;
}

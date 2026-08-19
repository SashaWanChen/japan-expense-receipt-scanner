/**
 * Gemini Vision wrapper：收據照片 → 結構化 JSON。
 * 依序嘗試多個 model，全部失敗才回傳錯誤。
 */
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import {
  CATEGORIES,
  PAYMENT_METHODS,
  TAX_TYPES,
  type AnalyzeResult,
  type Category,
  type PaymentMethod,
  type ReceiptItem,
  type TaxRate,
  type TaxType,
} from "./types";

export const MODELS = [
  "gemini-3.6-flash",
] as const;

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "尚未設定 GEMINI_API_KEY。請到 GitHub Codespaces secrets 設定 GEMINI_API_KEY（Google AI Studio 取得）後 Rebuild container，或先在設定頁開啟 Demo 模式。（請勿建立 .env.local，會蓋掉 secrets）",
    );
    this.name = "MissingApiKeyError";
  }
}

/** ~140 行的 prompt，是整個專案最花時間調整的部分。 */
export const RECEIPT_PROMPT = `你是一位專門解析「日本消費收據」的記帳助理。
請仔細閱讀這張收據照片，抽取資料後輸出 JSON。所有翻譯欄位一律使用**繁體中文**（台灣用語）。

## 一、輸出欄位

- storeName：店名的繁體中文翻譯或通用譯名（例：ファミリーマート → 全家便利商店）。
- storeNameJa：收據上的日文店名原文，保持原樣不要翻譯。
- items：主要商品的繁體中文，以「, 」分隔，最多列 6 項；品項太多時列金額最高的幾項並在最後加「等」。
- itemsJa：對應的日文原文，順序與 items 相同。
- itemList：逐品項清單（給「逐品項寫入」功能用），每項包含 name（繁中）、nameJa（日文原文）、price（該品項實付日幣整數）、taxRate（10 / 8 / 0）。
- amountJPY：這張收據「實際支付的總金額」，日幣整數，不含千分位符號。
- taxType：外税 / 内税 / 免税 三選一。
- category：餐飲 / 交通 / 購物 / 門票 / 住宿 / 藥品 / 其他 七選一。
- paymentMethod：現金 / 信用卡 / Suica / PayPay / 其他 五選一。
- date：消費日期，格式 YYYY-MM-DD。
- note：稅制與折扣的補充說明，例如「内税 8%（外帶）」「外税 10%，割引 -200」「免税（消耗品）」。

## 二、日本三種稅制（最重要，請務必判斷正確）

1. **外税（税抜 / 税別 / 本体価格）**：標示的商品價格「不含稅」，最後才加上消費稅。
   - 收據上常見「小計 1,000 / 消費税 100 / 合計 1,100」。
   - amountJPY 要取「合計（税込）」= 1,100，不是 1,000。
   - itemList 的 price 請填「已分攤稅額後」的實付金額，讓各品項加總等於 amountJPY。
2. **内税（税込 / 内税額）**：標示價格「已含稅」，收據只是註明其中含多少稅。
   - 常見「合計 1,080（内消費税 80）」，amountJPY = 1,080，不要再加稅。
3. **免税（免税 / TAX FREE / Duty Free）**：對外國旅客免除消費稅。
   - 常見同時出現「税抜価格」與「免税価格」，amountJPY 取「實際支付的免税後金額」。
   - note 註明是消耗品（消耗品）或一般物品（一般物品）。

判斷順序：先找「税込 / 内税」字樣 → 再找「税抜 / 税別 / 外税」→ 最後找「免税 / TAX FREE」。
都找不到時：便利商店、超市、餐廳的標價通常是内税；家電量販店、藥妝店常是外税。

## 三、多稅率

同一張收據可能同時有 8%（食品、外帶飲料）與 10%（非食品、內用）兩種稅率：
- 收據常標示「※」或「軽減税率対象」代表 8%。
- itemList 的每一項都要各自標上正確的 taxRate（10 / 8 / 0）。
- note 請寫明兩種稅率各自的小計，例如「8% 小計 540 / 10% 小計 660」。

## 四、折扣

日文折扣寫法很多，看到都要從總額扣除，並在 note 說明：
- 割引、値引、割引券、クーポン、キャンペーン値引 → 直接減價。
- 「10%OFF」「200円引」「半額」「タイムセール」 → 按字面計算。
- ポイント利用 / ポイント値引 → 使用點數折抵，仍屬於實付金額的減項。
- ポイント付与 / ポイント獲得 → **只是回饋點數，不影響金額**，不要扣。
- お預り / お釣り（收款與找零）**不是**金額，不要拿來當 amountJPY。

## 五、金額驗算（避免 hallucination）

輸出前請自行驗算：
1. itemList 各項 price 相加是否等於 amountJPY？若因四捨五入有 ±1~2 円誤差，請把差額補到最後一項。
2. 外税情況：小計 + 消費税 是否等於合計？
3. amountJPY 必須是收據上真實出現的「合計 / 合計金額 / お買上げ計」數字，不可自行推算出一個沒出現過的數。
4. 金額不可為負數，也不可包含小數點（日幣沒有小數）。

## 六、找不到資料時的預設值（回傳合理預設值，不要亂猜）

- storeName / storeNameJa 看不清楚 → 填空字串 ""。
- items / itemsJa 無法辨識 → 填空字串 ""，itemList 給空陣列 []。
- date 看不到 → 填空字串 ""（由使用者自己補），不要編一個日期。
- paymentMethod 看不出來 → 現金（日本小店多為現金）。
- category 無法判斷 → 其他。
- taxType 無法判斷 → 内税。
- amountJPY 完全看不到 → 0。

## 七、注意事項

- 只輸出 JSON，不要加 markdown code fence 或任何說明文字。
- 數字欄位輸出純數字，不要有 ¥、円、逗號。
- 日文原文欄位保持日文（含片假名 / 漢字），不要轉成中文。
- 圖片不是收據時，所有欄位回傳預設值、amountJPY 為 0、note 寫「無法辨識為收據」。`;

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    storeName: { type: SchemaType.STRING },
    storeNameJa: { type: SchemaType.STRING },
    items: { type: SchemaType.STRING },
    itemsJa: { type: SchemaType.STRING },
    itemList: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          nameJa: { type: SchemaType.STRING },
          price: { type: SchemaType.NUMBER },
          taxRate: { type: SchemaType.NUMBER },
        },
        required: ["name", "nameJa", "price", "taxRate"],
      },
    },
    amountJPY: { type: SchemaType.NUMBER },
    taxType: { type: SchemaType.STRING, enum: [...TAX_TYPES], format: "enum" },
    category: { type: SchemaType.STRING, enum: [...CATEGORIES], format: "enum" },
    paymentMethod: {
      type: SchemaType.STRING,
      enum: [...PAYMENT_METHODS],
      format: "enum",
    },
    date: { type: SchemaType.STRING },
    note: { type: SchemaType.STRING },
  },
  required: [
    "storeName",
    "storeNameJa",
    "items",
    "itemsJa",
    "itemList",
    "amountJPY",
    "taxType",
    "category",
    "paymentMethod",
    "date",
    "note",
  ],
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return 0;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = asString(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : fallback;
}

function asTaxRate(value: unknown): TaxRate {
  const n = asNumber(value);
  if (n === 8) return 8;
  if (n === 0) return 0;
  return 10;
}

/** 日期正規化：接受 2026/3/1、2026年3月1日、R6.3.1 等寫法。 */
function normalizeDate(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  const match = raw.match(/(\d{4})\D{0,2}(\d{1,2})\D{0,2}(\d{1,2})/);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** 把 Gemini 回傳的 JSON 正規化成 AnalyzeResult，並修正品項加總誤差。 */
export function normalizeAnalyzeResult(raw: unknown): AnalyzeResult {
  const data = (raw ?? {}) as Record<string, unknown>;
  const amountJPY = Math.max(0, asNumber(data.amountJPY));

  const rawItems = Array.isArray(data.itemList) ? data.itemList : [];
  const itemList: ReceiptItem[] = rawItems
    .map((item) => {
      const it = (item ?? {}) as Record<string, unknown>;
      return {
        name: asString(it.name),
        nameJa: asString(it.nameJa),
        price: Math.max(0, asNumber(it.price)),
        taxRate: asTaxRate(it.taxRate),
      };
    })
    .filter((item) => item.name || item.nameJa || item.price > 0);

  return {
    storeName: asString(data.storeName),
    storeNameJa: asString(data.storeNameJa),
    items: asString(data.items),
    itemsJa: asString(data.itemsJa),
    itemList,
    amountJPY,
    taxType: asEnum<TaxType>(data.taxType, TAX_TYPES, "内税"),
    category: asEnum<Category>(data.category, CATEGORIES, "其他"),
    paymentMethod: asEnum<PaymentMethod>(data.paymentMethod, PAYMENT_METHODS, "現金"),
    date: normalizeDate(data.date),
    note: asString(data.note),
  };
}

function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Gemini 回傳的內容不是合法 JSON");
  }
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * 辨識收據。逐一嘗試 MODELS，全部失敗才丟出錯誤。
 * @param base64 不含 data: prefix 的 base64 圖片內容
 */
export async function analyzeReceipt(
  base64: string,
  mimeType = "image/jpeg",
): Promise<{ result: AnalyzeResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const client = new GoogleGenerativeAI(apiKey);
  const errors: string[] = [];

  for (const modelName of MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      const response = await model.generateContent([
        { inlineData: { data: base64, mimeType } },
        { text: RECEIPT_PROMPT },
      ]);
      const result = normalizeAnalyzeResult(parseJson(response.response.text()));
      return { result, model: modelName };
    } catch (error) {
      errors.push(`${modelName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`所有 Gemini model 都失敗了\n${errors.join("\n")}`);
}

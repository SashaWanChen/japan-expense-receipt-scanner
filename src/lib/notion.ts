/**
 * Notion API client。
 * - 分頁：每次最多 100 筆，用 start_cursor 迴圈取完
 * - Property 型別對應：title / rich_text / number / date / select 讀寫格式不同
 * - Schema 相容：欄位型別若被改過（title ↔ rich_text）讀寫都容錯
 * - 「金額 (TWD)」是 Notion formula，程式端不寫入
 */
import { Client } from "@notionhq/client";
import type { Receipt, ReceiptInput } from "./types";

export const PROP = {
  title: "項目",
  storeName: "商店名稱",
  storeNameJa: "商店日文",
  itemsJa: "商品日文",
  date: "日期",
  amountJPY: "金額 (JPY)",
  amountTWD: "金額 (TWD)",
  category: "類別",
  paymentMethod: "支付方式",
  region: "地區",
  user: "用戶",
  note: "備註",
} as const;

export class MissingNotionConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `尚未設定 ${missing.join("、")}。請在 .env.local（或 Codespaces secrets）補齊後重新啟動，或先在設定頁開啟 Demo 模式。`,
    );
    this.name = "MissingNotionConfigError";
  }
}

export function notionConfigStatus(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.NOTION_TOKEN) missing.push("NOTION_TOKEN");
  if (!process.env.NOTION_DATABASE_ID) missing.push("NOTION_DATABASE_ID");
  return { ok: missing.length === 0, missing };
}

function getClient(): { client: Client; databaseId: string } {
  const status = notionConfigStatus();
  if (!status.ok) throw new MissingNotionConfigError(status.missing);
  return {
    client: new Client({ auth: process.env.NOTION_TOKEN }),
    databaseId: process.env.NOTION_DATABASE_ID as string,
  };
}

/* -------------------------------------------------------------------------- */
/* data source 解析（Notion API 2025-09-03 起 query 走 data source）            */
/* -------------------------------------------------------------------------- */

let dataSourceCache: { databaseId: string; dataSourceId: string } | null = null;

async function resolveDataSourceId(client: Client, databaseId: string): Promise<string> {
  if (dataSourceCache?.databaseId === databaseId) return dataSourceCache.dataSourceId;
  const database = (await client.databases.retrieve({ database_id: databaseId })) as {
    data_sources?: Array<{ id: string }>;
  };
  const dataSourceId = database.data_sources?.[0]?.id ?? databaseId;
  dataSourceCache = { databaseId, dataSourceId };
  return dataSourceId;
}

type PropertySchema = Record<string, { type: string }>;
let schemaCache: { dataSourceId: string; schema: PropertySchema } | null = null;

async function getSchema(client: Client, dataSourceId: string): Promise<PropertySchema> {
  if (schemaCache?.dataSourceId === dataSourceId) return schemaCache.schema;
  const dataSource = (await client.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as { properties?: Record<string, { type?: string }> };
  const schema: PropertySchema = {};
  for (const [name, value] of Object.entries(dataSource.properties ?? {})) {
    schema[name] = { type: value?.type ?? "rich_text" };
  }
  schemaCache = { dataSourceId, schema };
  return schema;
}

/* -------------------------------------------------------------------------- */
/* 讀取：Property 型別容錯                                                      */
/* -------------------------------------------------------------------------- */

type AnyProperty = Record<string, unknown>;

function plainText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      const rich = item as { plain_text?: string; text?: { content?: string } };
      return rich.plain_text ?? rich.text?.content ?? "";
    })
    .join("")
    .trim();
}

/** 同時支援 title / rich_text / select / number / date，避免 schema 改過就爆炸。 */
function readText(properties: AnyProperty, name: string): string {
  const prop = properties[name] as AnyProperty | undefined;
  if (!prop) return "";
  if (Array.isArray(prop.title)) return plainText(prop.title);
  if (Array.isArray(prop.rich_text)) return plainText(prop.rich_text);
  const select = prop.select as { name?: string } | null | undefined;
  if (select && typeof select.name === "string") return select.name;
  if (typeof prop.number === "number") return String(prop.number);
  const date = prop.date as { start?: string } | null | undefined;
  if (date?.start) return date.start;
  if (typeof prop.url === "string") return prop.url;
  return "";
}

function readNumber(properties: AnyProperty, name: string): number {
  const prop = properties[name] as AnyProperty | undefined;
  if (!prop) return 0;
  if (typeof prop.number === "number") return prop.number;
  const formula = prop.formula as { number?: number } | undefined;
  if (formula && typeof formula.number === "number") return formula.number;
  const text = readText(properties, name).replace(/[^\d.-]/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readDate(properties: AnyProperty, name: string): string {
  const prop = properties[name] as AnyProperty | undefined;
  if (!prop) return "";
  const date = prop.date as { start?: string } | null | undefined;
  if (date?.start) return date.start.slice(0, 10);
  return readText(properties, name).slice(0, 10);
}

function pageToReceipt(page: { id: string; properties?: AnyProperty }): Receipt {
  const properties = page.properties ?? {};
  return {
    id: page.id,
    title: readText(properties, PROP.title),
    storeName: readText(properties, PROP.storeName),
    storeNameJa: readText(properties, PROP.storeNameJa),
    itemsJa: readText(properties, PROP.itemsJa),
    date: readDate(properties, PROP.date),
    amountJPY: Math.round(readNumber(properties, PROP.amountJPY)),
    category: readText(properties, PROP.category) as Receipt["category"],
    paymentMethod: readText(properties, PROP.paymentMethod) as Receipt["paymentMethod"],
    region: readText(properties, PROP.region),
    user: readText(properties, PROP.user),
    note: readText(properties, PROP.note),
  };
}

/* -------------------------------------------------------------------------- */
/* 寫入：依實際 schema 型別產生 property value                                  */
/* -------------------------------------------------------------------------- */

function textValue(type: string, text: string): unknown {
  const rich = text ? [{ type: "text" as const, text: { content: text.slice(0, 2000) } }] : [];
  switch (type) {
    case "title":
      return { title: rich };
    case "select":
      return { select: text ? { name: text } : null };
    case "number": {
      const n = Number(text.replace(/[^\d.-]/g, ""));
      return { number: Number.isFinite(n) ? n : null };
    }
    case "date":
      return { date: text ? { start: text } : null };
    default:
      return { rich_text: rich };
  }
}

function buildProperties(schema: PropertySchema, input: ReceiptInput): Record<string, unknown> {
  const values: Array<[string, string]> = [
    [PROP.title, input.title],
    [PROP.storeName, input.storeName],
    [PROP.storeNameJa, input.storeNameJa],
    [PROP.itemsJa, input.itemsJa],
    [PROP.category, input.category],
    [PROP.paymentMethod, input.paymentMethod],
    [PROP.region, input.region],
    [PROP.user, input.user],
    [PROP.note, input.note],
  ];

  const properties: Record<string, unknown> = {};
  for (const [name, text] of values) {
    const type = schema[name]?.type;
    if (!type) continue; // 資料庫沒有這個欄位就跳過，不要 400
    properties[name] = textValue(type, text);
  }

  const dateType = schema[PROP.date]?.type;
  if (dateType) {
    properties[PROP.date] =
      dateType === "date"
        ? { date: input.date ? { start: input.date } : null }
        : textValue(dateType, input.date);
  }

  const amountType = schema[PROP.amountJPY]?.type;
  if (amountType) {
    properties[PROP.amountJPY] =
      amountType === "number"
        ? { number: Math.round(input.amountJPY) }
        : textValue(amountType, String(Math.round(input.amountJPY)));
  }

  // 金額 (TWD) 是 formula，永遠不寫入
  delete properties[PROP.amountTWD];
  return properties;
}

/* -------------------------------------------------------------------------- */
/* 對外 API                                                                    */
/* -------------------------------------------------------------------------- */

/** 取得所有記錄（自動分頁，每頁 100 筆）。 */
export async function listReceipts(): Promise<Receipt[]> {
  const { client, databaseId } = getClient();
  const dataSourceId = await resolveDataSourceId(client, databaseId);

  const receipts: Receipt[] = [];
  let cursor: string | undefined;

  do {
    const response = await client.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
      sorts: [{ property: PROP.date, direction: "descending" }],
    });
    for (const page of response.results) {
      if ("properties" in page) receipts.push(pageToReceipt(page));
    }
    cursor = response.next_cursor ?? undefined;
  } while (cursor);

  return receipts;
}

/** 新增一筆記錄。 */
export async function createReceipt(input: ReceiptInput): Promise<string> {
  const ids = await createReceipts([input]);
  return ids[0];
}

/** 批次新增（逐品項寫入用）。 */
export async function createReceipts(inputs: ReceiptInput[]): Promise<string[]> {
  const { client, databaseId } = getClient();
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  const schema = await getSchema(client, dataSourceId);

  const ids: string[] = [];
  for (const input of inputs) {
    const page = await client.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: buildProperties(schema, input) as never,
    });
    ids.push(page.id);
  }
  return ids;
}

/** 更新既有記錄。 */
export async function updateReceipt(pageId: string, input: ReceiptInput): Promise<void> {
  const { client, databaseId } = getClient();
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  const schema = await getSchema(client, dataSourceId);
  await client.pages.update({
    page_id: pageId,
    properties: buildProperties(schema, input) as never,
  });
}

/** 刪除＝移到 Notion 垃圾桶（archive）。 */
export async function deleteReceipt(pageId: string): Promise<void> {
  const { client } = getClient();
  await client.pages.update({ page_id: pageId, in_trash: true });
}

/** 批次把「用戶」欄位從舊名改成新名，回傳更新筆數。 */
export async function renameUser(oldName: string, newName: string): Promise<number> {
  const { client, databaseId } = getClient();
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  const schema = await getSchema(client, dataSourceId);
  const userType = schema[PROP.user]?.type;
  if (!userType) return 0;

  const receipts = await listReceipts();
  const targets = receipts.filter((r) => r.user === oldName);
  for (const receipt of targets) {
    await client.pages.update({
      page_id: receipt.id,
      properties: { [PROP.user]: textValue(userType, newName) } as never,
    });
  }
  return targets.length;
}

/** 健康檢查：回傳資料庫標題與欄位清單，不洩漏任何 key。 */
export async function checkNotion(): Promise<{
  databaseTitle: string;
  properties: Array<{ name: string; type: string }>;
}> {
  const { client, databaseId } = getClient();
  const database = (await client.databases.retrieve({ database_id: databaseId })) as {
    title?: Array<{ plain_text?: string }>;
  };
  const dataSourceId = await resolveDataSourceId(client, databaseId);
  const schema = await getSchema(client, dataSourceId);
  return {
    databaseTitle: plainText(database.title) || "(未命名資料庫)",
    properties: Object.entries(schema).map(([name, value]) => ({ name, type: value.type })),
  };
}

/* -------------------------------------------------------------------------- */
/* 逐品項稅額分攤                                                              */
/* -------------------------------------------------------------------------- */

export interface AllocatableItem {
  price: number;
}

/**
 * 按品項金額比例把收據總額（含稅）分攤到各品項，
 * 四捨五入誤差補到最後一項，確保加總 === total。
 */
export function allocateAmounts(items: AllocatableItem[], total: number): number[] {
  if (items.length === 0) return [];
  const roundedTotal = Math.round(total);
  const sum = items.reduce((acc, item) => acc + Math.max(0, item.price), 0);

  if (sum <= 0) {
    // 沒有單價資訊時平均分攤
    const base = Math.floor(roundedTotal / items.length);
    const amounts = items.map(() => base);
    amounts[amounts.length - 1] += roundedTotal - base * items.length;
    return amounts;
  }

  const amounts = items.map((item) =>
    Math.round((Math.max(0, item.price) / sum) * roundedTotal),
  );
  const diff = roundedTotal - amounts.reduce((acc, n) => acc + n, 0);
  amounts[amounts.length - 1] += diff;
  return amounts;
}

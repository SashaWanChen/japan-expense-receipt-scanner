/** 50+ 筆假資料，Demo 模式使用（不呼叫 Notion / Gemini）。 */
import type { Category, PaymentMethod, Receipt } from "./types";

interface Seed {
  title: string;
  storeName: string;
  storeNameJa: string;
  itemsJa: string;
  amountJPY: number;
  category: Category;
  paymentMethod: PaymentMethod;
  note: string;
}

const SEEDS: Seed[] = [
  { title: "飯糰, 綠茶", storeName: "全家便利商店", storeNameJa: "ファミリーマート", itemsJa: "おにぎり, 緑茶", amountJPY: 432, category: "餐飲", paymentMethod: "現金", note: "内税 8%" },
  { title: "咖啡拿鐵", storeName: "羅多倫咖啡", storeNameJa: "ドトールコーヒー", itemsJa: "カフェラテ", amountJPY: 380, category: "餐飲", paymentMethod: "Suica", note: "内税 10%（內用）" },
  { title: "拉麵", storeName: "一蘭拉麵", storeNameJa: "一蘭", amountJPY: 1180, itemsJa: "ラーメン", category: "餐飲", paymentMethod: "現金", note: "内税 10%" },
  { title: "地鐵車票", storeName: "名古屋市營地鐵", storeNameJa: "名古屋市営地下鉄", itemsJa: "乗車券", amountJPY: 240, category: "交通", paymentMethod: "Suica", note: "" },
  { title: "新幹線車票", storeName: "JR東海", storeNameJa: "JR東海", itemsJa: "新幹線特急券", amountJPY: 6380, category: "交通", paymentMethod: "信用卡", note: "免税不適用" },
  { title: "藥妝：面膜, 眼藥水", storeName: "松本清", storeNameJa: "マツモトキヨシ", itemsJa: "フェイスマスク, 目薬", amountJPY: 3480, category: "藥品", paymentMethod: "信用卡", note: "免税（消耗品）" },
  { title: "T恤, 襪子", storeName: "優衣庫", storeNameJa: "ユニクロ", itemsJa: "Tシャツ, 靴下", amountJPY: 2990, category: "購物", paymentMethod: "信用卡", note: "外税 10%" },
  { title: "城堡門票", storeName: "名古屋城", storeNameJa: "名古屋城", itemsJa: "入場券", amountJPY: 500, category: "門票", paymentMethod: "現金", note: "" },
  { title: "商務旅館住宿", storeName: "東橫INN", storeNameJa: "東横イン", itemsJa: "宿泊料", amountJPY: 7800, category: "住宿", paymentMethod: "信用卡", note: "含稅與住宿稅" },
  { title: "便當, 味噌湯", storeName: "7-11", storeNameJa: "セブン-イレブン", itemsJa: "弁当, 味噌汁", amountJPY: 756, category: "餐飲", paymentMethod: "PayPay", note: "内税 8%（外帶）" },
  { title: "章魚燒", storeName: "築地銀章魚燒", storeNameJa: "築地銀だこ", itemsJa: "たこ焼き", amountJPY: 580, category: "餐飲", paymentMethod: "現金", note: "内税 8%" },
  { title: "咖啡豆", storeName: "星巴克", storeNameJa: "スターバックス", itemsJa: "コーヒー豆", amountJPY: 1420, category: "購物", paymentMethod: "信用卡", note: "外税 8%" },
  { title: "紀念品：鑰匙圈", storeName: "土產店", storeNameJa: "お土産処", itemsJa: "キーホルダー", amountJPY: 880, category: "購物", paymentMethod: "現金", note: "内税 10%" },
  { title: "巴士車資", storeName: "濃飛巴士", storeNameJa: "濃飛バス", itemsJa: "バス運賃", amountJPY: 2600, category: "交通", paymentMethod: "現金", note: "" },
  { title: "壽司套餐", storeName: "壽司郎", storeNameJa: "スシロー", itemsJa: "寿司セット", amountJPY: 2860, category: "餐飲", paymentMethod: "信用卡", note: "内税 10%（內用）" },
  { title: "溫泉入浴券", storeName: "白鷺之湯", storeNameJa: "白鷺の湯", itemsJa: "入浴券", amountJPY: 700, category: "門票", paymentMethod: "現金", note: "" },
  { title: "礦泉水, 零食", storeName: "羅森", storeNameJa: "ローソン", itemsJa: "水, お菓子", amountJPY: 356, category: "餐飲", paymentMethod: "現金", note: "内税 8%（割引 -20）" },
  { title: "扭蛋", storeName: "扭蛋會館", storeNameJa: "ガシャポンのデパート", itemsJa: "ガチャガチャ", amountJPY: 400, category: "購物", paymentMethod: "現金", note: "" },
  { title: "感冒藥", storeName: "SUGI藥局", storeNameJa: "スギ薬局", itemsJa: "風邪薬", amountJPY: 1680, category: "藥品", paymentMethod: "信用卡", note: "免税（消耗品）" },
  { title: "咖哩飯", storeName: "CoCo壹番屋", storeNameJa: "CoCo壱番屋", itemsJa: "カレーライス", amountJPY: 990, category: "餐飲", paymentMethod: "PayPay", note: "内税 10%" },
];

const REGIONS = ["名古屋", "靜岡", "松本", "高山", "金澤"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * 產生 55 筆假資料。
 * 以 `endDate` 為最後一天往回鋪 11 天，資料固定（不用亂數）方便截圖比對。
 */
export function generateMockReceipts(
  users: string[] = ["我", "旅伴"],
  endDate: Date = new Date(),
): Receipt[] {
  const receipts: Receipt[] = [];
  const dayCount = 11;
  const names = users.length > 0 ? users : ["我"];

  for (let i = 0; i < 55; i += 1) {
    const seed = SEEDS[i % SEEDS.length];
    const dayOffset = dayCount - 1 - (i % dayCount);
    const d = new Date(endDate);
    d.setDate(d.getDate() - dayOffset);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    // 讓金額稍有變化，但仍然是可預期的固定值
    const amountJPY = seed.amountJPY + (i % 5) * 30;

    receipts.push({
      id: `demo-${i + 1}`,
      title: seed.title,
      storeName: seed.storeName,
      storeNameJa: seed.storeNameJa,
      itemsJa: seed.itemsJa,
      date,
      amountJPY,
      category: seed.category,
      paymentMethod: seed.paymentMethod,
      region: REGIONS[i % REGIONS.length],
      user: names[i % names.length],
      note: seed.note,
    });
  }

  return receipts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 設定管理：全部存在 localStorage，不需要後端。 */
import type { AppSettings } from "./types";
import { defaultUsers } from "./users";

export const SETTINGS_KEY = "jrs.settings";
/** 設定變更時廣播，讓其他分頁 / 元件同步。 */
export const SETTINGS_EVENT = "jrs:settings-changed";

export function defaultSettings(): AppSettings {
  return {
    budget: 300000,
    budgetNote: "",
    exchangeRate: 0.21,
    tripDays: 7,
    tripSchedule: "",
    users: defaultUsers(),
    demoMode: false,
  };
}

function coerce(raw: unknown): AppSettings {
  const base = defaultSettings();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<AppSettings>;
  const users = Array.isArray(data.users)
    ? data.users.filter((u) => u && typeof u.id === "string" && typeof u.name === "string")
    : [];
  return {
    budget: Number.isFinite(Number(data.budget)) ? Number(data.budget) : base.budget,
    budgetNote: typeof data.budgetNote === "string" ? data.budgetNote : base.budgetNote,
    exchangeRate:
      Number.isFinite(Number(data.exchangeRate)) && Number(data.exchangeRate) > 0
        ? Number(data.exchangeRate)
        : base.exchangeRate,
    tripDays:
      Number.isFinite(Number(data.tripDays)) && Number(data.tripDays) > 0
        ? Math.floor(Number(data.tripDays))
        : base.tripDays,
    tripSchedule: typeof data.tripSchedule === "string" ? data.tripSchedule : base.tripSchedule,
    users: users.length > 0 ? users : base.users,
    demoMode: Boolean(data.demoMode),
  };
}

/** 讀取設定；SSR 或資料毀損時回傳預設值。 */
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return coerce(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
}

/** 日幣換算台幣。 */
export function toTWD(amountJPY: number, exchangeRate: number): number {
  return Math.round(amountJPY * exchangeRate);
}

export function formatJPY(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("zh-TW")}`;
}

export function formatTWD(amount: number): string {
  return `NT$${Math.round(amount).toLocaleString("zh-TW")}`;
}

/** `¥1,000 ≈ NT$210` 這種雙幣別顯示。 */
export function formatMoney(amountJPY: number, exchangeRate: number): string {
  return `${formatJPY(amountJPY)} ≈ ${formatTWD(toTWD(amountJPY, exchangeRate))}`;
}

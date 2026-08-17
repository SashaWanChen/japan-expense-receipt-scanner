/** 虛擬用戶管理：純 localStorage 標籤，不需帳號密碼。 */
import type { VirtualUser } from "./types";

/** 頭像預設色票。 */
export const USER_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export const USER_EMOJIS = [
  "",
  "🐱",
  "🐶",
  "🦊",
  "🐼",
  "🐨",
  "🦁",
  "🐧",
  "🍣",
  "🍜",
  "🚅",
  "⛩️",
] as const;

export function createUserId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 建立新用戶，顏色依序輪替。 */
export function createUser(name: string, existing: VirtualUser[] = []): VirtualUser {
  return {
    id: createUserId(),
    name: name.trim() || `旅伴 ${existing.length + 1}`,
    color: USER_COLORS[existing.length % USER_COLORS.length],
  };
}

/** 首次使用時的預設用戶。 */
export function defaultUsers(): VirtualUser[] {
  return [{ id: createUserId(), name: "我", color: USER_COLORS[5], emoji: "🐱" }];
}

export function findUserByName(users: VirtualUser[], name: string): VirtualUser | undefined {
  return users.find((u) => u.name === name);
}

/** 頭像顯示文字：優先 emoji，否則名稱首字。 */
export function userInitial(user: Pick<VirtualUser, "name" | "emoji">): string {
  if (user.emoji) return user.emoji;
  return user.name.trim().slice(0, 1) || "?";
}

/** 依名稱推導穩定顏色，用於顯示已刪除 / 未知用戶。 */
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return USER_COLORS[hash % USER_COLORS.length];
}

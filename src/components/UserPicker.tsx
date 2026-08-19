"use client";

import { useMemo } from "react";
import Avatar from "./Avatar";
import type { VirtualUser } from "@/lib/types";

interface Props {
  users: VirtualUser[];
  /** Notion 既有記錄用過、但本機設定沒有的名字，一併列為可選項。 */
  knownNames?: string[];
  value: string;
  onChange: (name: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

/** 選「誰付的」：彩色圓形頭像。 */
export default function UserPicker({
  users,
  knownNames = [],
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "全部",
}: Props) {
  // 去重以名稱為準，settings.users 優先
  const extraNames = useMemo(() => {
    const owned = new Set(users.map((u) => u.name));
    return Array.from(new Set(knownNames.filter((name) => name && !owned.has(name))));
  }, [users, knownNames]);

  return (
    <div className="flex flex-wrap gap-2">
      {allowEmpty && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`chip ${value === "" ? "chip-active" : ""}`}
        >
          {emptyLabel}
        </button>
      )}
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onChange(user.name)}
          className={`chip ${value === user.name ? "chip-active" : ""}`}
        >
          <Avatar user={user} size={20} />
          {user.name}
        </button>
      ))}
      {extraNames.map((name) => (
        <button
          key={`known-${name}`}
          type="button"
          onClick={() => onChange(name)}
          className={`chip ${value === name ? "chip-active" : ""}`}
        >
          <Avatar name={name} size={20} />
          {name}
        </button>
      ))}
      {users.length === 0 && extraNames.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          尚未建立用戶，請到設定頁新增。
        </p>
      )}
    </div>
  );
}

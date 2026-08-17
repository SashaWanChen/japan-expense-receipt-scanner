"use client";

import Avatar from "./Avatar";
import type { VirtualUser } from "@/lib/types";

interface Props {
  users: VirtualUser[];
  value: string;
  onChange: (name: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

/** 選「誰付的」：彩色圓形頭像。 */
export default function UserPicker({
  users,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "全部",
}: Props) {
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
      {users.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          尚未建立用戶，請到設定頁新增。
        </p>
      )}
    </div>
  );
}

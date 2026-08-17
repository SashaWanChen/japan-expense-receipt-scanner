import { colorForName, userInitial } from "@/lib/users";
import type { VirtualUser } from "@/lib/types";

interface Props {
  user?: Pick<VirtualUser, "name" | "color" | "emoji">;
  name?: string;
  size?: number;
  title?: string;
}

/** 彩色圓形頭像：優先顯示 emoji，否則顯示名稱首字。 */
export default function Avatar({ user, name, size = 32, title }: Props) {
  const displayName = user?.name ?? name ?? "?";
  const color = user?.color ?? colorForName(displayName);
  const label = userInitial({ name: displayName, emoji: user?.emoji });

  return (
    <span
      title={title ?? displayName}
      aria-label={displayName}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * 0.45),
      }}
    >
      {label}
    </span>
  );
}

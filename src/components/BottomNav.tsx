"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "總覽", icon: "🏠" },
  { href: "/scan", label: "掃描", icon: "📷" },
  { href: "/history", label: "歷史", icon: "🧾" },
  { href: "/stats", label: "統計", icon: "📊" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

/** 底部固定導覽列（手機直式優先）。 */
export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主導覽"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[11px]"
                style={{ color: active ? "var(--color-primary)" : "var(--color-muted)" }}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

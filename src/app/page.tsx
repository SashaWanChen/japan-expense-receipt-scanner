"use client";

import Link from "next/link";
import { useMemo } from "react";
import Avatar from "@/components/Avatar";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import StatBar from "@/components/StatBar";
import { useReceipts, useSettings } from "@/lib/hooks";
import { formatJPY, formatMoney, formatTWD, toTWD } from "@/lib/settings";
import { byCategory, byUser, sumAmount, todayISO } from "@/lib/stats";

const SHORTCUTS = [
  { href: "/scan", label: "掃描收據", icon: "📷", hint: "拍照 AI 辨識" },
  { href: "/add", label: "手動輸入", icon: "✍️", hint: "沒有收據時" },
  { href: "/history", label: "歷史記錄", icon: "🧾", hint: "編輯 / 刪除" },
  { href: "/stats", label: "統計分析", icon: "📊", hint: "趨勢 / 佔比" },
  { href: "/settings", label: "設定", icon: "⚙️", hint: "預算 / 用戶" },
];

export default function DashboardPage() {
  const { settings, ready } = useSettings();
  const { receipts, loading, error } = useReceipts(ready);

  const today = todayISO();
  const todayTotal = useMemo(
    () => sumAmount(receipts.filter((r) => r.date === today)),
    [receipts, today],
  );
  const total = useMemo(() => sumAmount(receipts), [receipts]);
  const categories = useMemo(() => byCategory(receipts).slice(0, 5), [receipts]);
  const users = useMemo(() => byUser(receipts), [receipts]);

  const remaining = settings.budget - total;
  const dailyBudget = settings.tripDays > 0 ? Math.round(settings.budget / settings.tripDays) : 0;
  const maxCategory = categories[0]?.amount ?? 0;

  return (
    <main>
      <PageHeader
        title="日本旅行記帳"
        subtitle={settings.demoMode ? "Demo 模式（假資料，不會寫入 Notion）" : "AI 收據記帳"}
      />

      {error && <Notice tone="error">{error}</Notice>}

      <section className="card mb-4 p-4">
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          今日花費（{today}）
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatJPY(todayTotal)}</p>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          ≈ {formatTWD(toTWD(todayTotal, settings.exchangeRate))}
          {dailyBudget > 0 && `　每日預算 ${formatJPY(dailyBudget)}`}
        </p>

        <hr className="my-3" style={{ borderColor: "var(--color-border)" }} />

        <div className="flex items-baseline justify-between">
          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
            旅程累計
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(total, settings.exchangeRate)}
          </span>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
          共 {receipts.length} 筆{loading ? "（載入中…）" : ""}
        </p>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-base font-semibold">現金預算進度</h2>
        <StatBar
          label={`已用 ${formatJPY(total)} / ${formatJPY(settings.budget)}`}
          value={`${settings.budget > 0 ? Math.round((total / settings.budget) * 100) : 0}%`}
          ratio={settings.budget > 0 ? total / settings.budget : 0}
          color={
            remaining < 0
              ? "var(--color-danger)"
              : total / Math.max(1, settings.budget) > 0.8
                ? "var(--color-warning)"
                : "var(--color-success)"
          }
          hint={
            remaining >= 0
              ? `剩餘 ${formatMoney(remaining, settings.exchangeRate)}`
              : `已超支 ${formatMoney(-remaining, settings.exchangeRate)}`
          }
        />
        {settings.budgetNote && (
          <p className="mt-2 text-xs whitespace-pre-wrap" style={{ color: "var(--color-muted)" }}>
            {settings.budgetNote}
          </p>
        )}
      </section>

      {users.length > 0 && (
        <section className="card mb-4 p-4">
          <h2 className="mb-3 text-base font-semibold">各用戶花費</h2>
          <ul className="space-y-2">
            {users.map((bucket) => (
              <li key={bucket.key} className="flex items-center gap-2">
                <Avatar
                  user={settings.users.find((u) => u.name === bucket.key)}
                  name={bucket.key}
                  size={28}
                />
                <span className="flex-1 truncate text-sm">{bucket.key}</span>
                <span className="text-sm tabular-nums">{formatJPY(bucket.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {categories.length > 0 && (
        <section className="card mb-4 p-4">
          <h2 className="mb-3 text-base font-semibold">類別 TOP 5</h2>
          {categories.map((bucket) => (
            <StatBar
              key={bucket.key}
              label={bucket.key}
              value={formatJPY(bucket.amount)}
              ratio={maxCategory > 0 ? bucket.amount / maxCategory : 0}
            />
          ))}
        </section>
      )}

      <section className="mb-4 grid grid-cols-2 gap-3">
        {SHORTCUTS.map((item) => (
          <Link key={item.href} href={item.href} className="card p-4">
            <span className="text-2xl">{item.icon}</span>
            <p className="mt-1 font-semibold">{item.label}</p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              {item.hint}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}

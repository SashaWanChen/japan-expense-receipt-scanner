"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import StatBar from "@/components/StatBar";
import { useReceipts, useSettings } from "@/lib/hooks";
import { formatJPY, formatMoney } from "@/lib/settings";
import {
  byCategory,
  byDay,
  byPaymentMethod,
  byRegion,
  filterByUser,
  sumAmount,
  topSpending,
  usedUserNames,
} from "@/lib/stats";

/** 類別佔比用的色票（純 CSS 圓餅圖）。 */
const PIE_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function StatsPage() {
  const { settings, ready } = useSettings();
  const { receipts, loading, error } = useReceipts(ready);
  const [user, setUser] = useState("");

  const userNames = useMemo(
    () => Array.from(new Set([...settings.users.map((u) => u.name), ...usedUserNames(receipts)])),
    [settings.users, receipts],
  );

  const scoped = useMemo(() => filterByUser(receipts, user), [receipts, user]);
  const total = useMemo(() => sumAmount(scoped), [scoped]);
  const daily = useMemo(() => byDay(scoped), [scoped]);
  const categories = useMemo(() => byCategory(scoped), [scoped]);
  const payments = useMemo(() => byPaymentMethod(scoped), [scoped]);
  const regions = useMemo(() => byRegion(scoped), [scoped]);
  const top10 = useMemo(() => topSpending(scoped, 10), [scoped]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.amount));
  const dailyBudget = settings.tripDays > 0 ? settings.budget / settings.tripDays : 0;
  const remaining = settings.budget - total;

  // 類別佔比：用 conic-gradient 手刻圓餅圖，不引入圖表庫
  const pieStops = useMemo(() => {
    if (total <= 0) return "var(--color-surface-muted) 0 100%";
    let acc = 0;
    return categories
      .map((bucket, index) => {
        const start = (acc / total) * 100;
        acc += bucket.amount;
        const end = (acc / total) * 100;
        return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${end}%`;
      })
      .join(", ");
  }, [categories, total]);

  return (
    <main>
      <PageHeader
        title="統計分析"
        subtitle={`${scoped.length} 筆　${formatMoney(total, settings.exchangeRate)}`}
        backHref="/"
      />

      {error && <Notice tone="error">{error}</Notice>}
      {loading && <p className="py-4 text-center text-sm">載入中…</p>}

      <section className="card mb-4 p-4">
        <span className="field-label">按用戶篩選</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip ${user === "" ? "chip-active" : ""}`}
            onClick={() => setUser("")}
          >
            全部
          </button>
          {userNames.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip ${user === name ? "chip-active" : ""}`}
              onClick={() => setUser(name)}
            >
              <Avatar user={settings.users.find((u) => u.name === name)} name={name} size={20} />
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-base font-semibold">預算消化進度</h2>
        <StatBar
          label={`已用 ${formatJPY(total)} / ${formatJPY(settings.budget)}`}
          value={`${settings.budget > 0 ? Math.round((total / settings.budget) * 100) : 0}%`}
          ratio={settings.budget > 0 ? total / settings.budget : 0}
          color={remaining < 0 ? "var(--color-danger)" : "var(--color-success)"}
          hint={
            remaining >= 0
              ? `剩餘 ${formatMoney(remaining, settings.exchangeRate)}　每日預算 ${formatJPY(dailyBudget)}`
              : `已超支 ${formatMoney(-remaining, settings.exchangeRate)}`
          }
        />
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-base font-semibold">每日花費趨勢</h2>
        {daily.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            尚無資料。
          </p>
        ) : (
          <>
            <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1">
              {daily.map((bucket) => (
                <div key={bucket.key} className="flex w-8 shrink-0 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--color-muted)" }}>
                    {Math.round(bucket.amount / 1000)}k
                  </span>
                  <div
                    className="w-full rounded-t"
                    title={`${bucket.key} ${formatJPY(bucket.amount)}`}
                    style={{
                      height: `${Math.max(4, (bucket.amount / maxDaily) * 100)}%`,
                      background:
                        dailyBudget > 0 && bucket.amount > dailyBudget
                          ? "var(--color-warning)"
                          : "var(--color-primary)",
                    }}
                  />
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {bucket.key.slice(5)}
                  </span>
                </div>
              ))}
            </div>
            {dailyBudget > 0 && (
              <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
                橘色代表超過每日預算 {formatJPY(dailyBudget)}
              </p>
            )}
          </>
        )}
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-base font-semibold">類別佔比</h2>
        {categories.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            尚無資料。
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div
              className="h-28 w-28 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${pieStops})`,
                mask: "radial-gradient(circle, transparent 46%, black 47%)",
                WebkitMask: "radial-gradient(circle, transparent 46%, black 47%)",
              }}
              role="img"
              aria-label="類別佔比圓餅圖"
            />
            <ul className="min-w-0 flex-1 space-y-1 text-sm">
              {categories.map((bucket, index) => (
                <li key={bucket.key} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 truncate">{bucket.key}</span>
                  <span className="tabular-nums" style={{ color: "var(--color-muted)" }}>
                    {total > 0 ? Math.round((bucket.amount / total) * 100) : 0}%
                  </span>
                  <span className="tabular-nums">{formatJPY(bucket.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-base font-semibold">支付方式分布</h2>
        {payments.map((bucket) => (
          <StatBar
            key={bucket.key}
            label={`${bucket.key}（${bucket.count} 筆）`}
            value={formatJPY(bucket.amount)}
            ratio={total > 0 ? bucket.amount / total : 0}
            color="var(--color-accent)"
          />
        ))}
        {payments.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            尚無資料。
          </p>
        )}
      </section>

      {regions.length > 0 && (
        <section className="card mb-4 p-4">
          <h2 className="mb-3 text-base font-semibold">地區分布</h2>
          {regions.map((bucket) => (
            <StatBar
              key={bucket.key}
              label={`${bucket.key}（${bucket.count} 筆）`}
              value={formatJPY(bucket.amount)}
              ratio={total > 0 ? bucket.amount / total : 0}
              color="var(--color-success)"
            />
          ))}
        </section>
      )}

      <section className="card mb-6 p-4">
        <h2 className="mb-3 text-base font-semibold">TOP 10 消費</h2>
        <ol className="space-y-2">
          {top10.map((receipt, index) => (
            <li key={receipt.id} className="flex items-center gap-2 text-sm">
              <span
                className="w-5 shrink-0 text-center tabular-nums"
                style={{ color: "var(--color-muted)" }}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {receipt.title || receipt.storeName || "(未命名)"}
                <span className="ml-1 text-xs" style={{ color: "var(--color-muted)" }}>
                  {receipt.date}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatJPY(receipt.amountJPY)}</span>
            </li>
          ))}
        </ol>
        {top10.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            尚無資料。
          </p>
        )}
      </section>
    </main>
  );
}

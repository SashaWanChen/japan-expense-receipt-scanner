"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import ReceiptForm from "@/components/ReceiptForm";
import { useReceipts, useSettings } from "@/lib/hooks";
import { deleteReceipt, updateReceipt } from "@/lib/receipts";
import { formatJPY, formatMoney } from "@/lib/settings";
import { sumAmount, usedUserNames } from "@/lib/stats";
import { CATEGORIES, type Receipt, type ReceiptInput } from "@/lib/types";

function toInput(receipt: Receipt): ReceiptInput {
  const { id: _id, ...rest } = receipt;
  void _id;
  return rest;
}

export default function HistoryPage() {
  const { settings, ready } = useSettings();
  const { receipts, loading, error, reload } = useReceipts(ready);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [user, setUser] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const userNames = useMemo(
    () =>
      Array.from(new Set([...settings.users.map((u) => u.name), ...usedUserNames(receipts)])),
    [settings.users, receipts],
  );

  const filtered = useMemo(
    () =>
      receipts.filter((r) => {
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        if (category && r.category !== category) return false;
        if (user && r.user !== user) return false;
        return true;
      }),
    [receipts, dateFrom, dateTo, category, user],
  );

  async function save(id: string) {
    if (!draft) return;
    setBusy(true);
    setActionError("");
    try {
      await updateReceipt(id, draft);
      setEditing(null);
      setDraft(null);
      await reload(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(receipt: Receipt) {
    if (!window.confirm(`確定刪除「${receipt.title || receipt.storeName}」？`)) return;
    setBusy(true);
    setActionError("");
    try {
      await deleteReceipt(receipt.id);
      await reload(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="歷史記錄"
        subtitle={`${filtered.length} 筆　${formatJPY(sumAmount(filtered))}`}
        backHref="/"
        action={
          <button type="button" className="chip" onClick={() => void reload(true)}>
            重新整理
          </button>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}
      {actionError && <Notice tone="error">{actionError}</Notice>}

      <section className="card mb-4 p-4">
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="h-from">
              起始日期
            </label>
            <input
              id="h-from"
              type="date"
              className="field-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="h-to">
              結束日期
            </label>
            <input
              id="h-to"
              type="date"
              className="field-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <span className="field-label">類別</span>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip ${category === "" ? "chip-active" : ""}`}
            onClick={() => setCategory("")}
          >
            全部
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? "chip-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <span className="field-label">用戶</span>
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

      {loading && <p className="py-6 text-center text-sm">載入中…</p>}

      {!loading && filtered.length === 0 && (
        <p className="py-6 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          沒有符合條件的記錄。
        </p>
      )}

      <ul className="mb-6 space-y-3">
        {filtered.map((receipt) => (
          <li key={receipt.id} className="card p-4">
            {editing === receipt.id && draft ? (
              <>
                <ReceiptForm
                  value={draft}
                  onChange={(patch) => setDraft({ ...draft, ...patch })}
                  settings={settings}
                  knownUserNames={userNames}
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="btn btn-secondary flex-1"
                    onClick={() => {
                      setEditing(null);
                      setDraft(null);
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    disabled={busy}
                    onClick={() => void save(receipt.id)}
                  >
                    {busy ? "儲存中…" : "儲存"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {receipt.title || receipt.storeName || "(未命名)"}
                    </p>
                    <p className="truncate text-sm" style={{ color: "var(--color-muted)" }}>
                      {receipt.storeName}
                      {receipt.storeNameJa && `（${receipt.storeNameJa}）`}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-semibold tabular-nums">
                    {formatJPY(receipt.amountJPY)}
                  </p>
                </div>

                <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                  {formatMoney(receipt.amountJPY, settings.exchangeRate)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">{receipt.date || "無日期"}</span>
                  {receipt.category && <span className="chip">{receipt.category}</span>}
                  {receipt.paymentMethod && <span className="chip">{receipt.paymentMethod}</span>}
                  {receipt.region && <span className="chip">{receipt.region}</span>}
                  {receipt.user && (
                    <span className="chip">
                      <Avatar
                        user={settings.users.find((u) => u.name === receipt.user)}
                        name={receipt.user}
                        size={18}
                      />
                      {receipt.user}
                    </span>
                  )}
                </div>

                {receipt.note && (
                  <p className="mt-2 text-xs whitespace-pre-wrap" style={{ color: "var(--color-muted)" }}>
                    {receipt.note}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setEditing(receipt.id);
                      setDraft(toInput(receipt));
                    }}
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    className="chip"
                    style={{ color: "var(--color-danger)" }}
                    disabled={busy}
                    onClick={() => void remove(receipt)}
                  >
                    刪除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

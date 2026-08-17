"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import { demoReset } from "@/lib/demo-mode";
import { useSettings } from "@/lib/hooks";
import { renameUserRecords } from "@/lib/receipts";
import { parseTripSchedule } from "@/lib/region";
import { createUser, USER_COLORS, USER_EMOJIS } from "@/lib/users";
import type { VirtualUser } from "@/lib/types";

interface DebugInfo {
  passwordProtection: string;
  gemini: { ok: boolean; detail: string };
  notion: { ok: boolean; detail: string };
  database: { title: string; properties: Array<{ name: string; type: string }> } | null;
}

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const segments = parseTripSchedule(settings.tripSchedule);

  function patchUser(id: string, patch: Partial<VirtualUser>) {
    update({ users: settings.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  }

  /** 改名：id 不變，僅同步 Notion 既有記錄的「用戶」欄位。 */
  async function commitRename(user: VirtualUser, newName: string) {
    const name = newName.trim();
    if (!name || name === user.name) return;
    const oldName = user.name;
    patchUser(user.id, { name });
    setError("");

    if (!window.confirm(`要把既有記錄中的「${oldName}」一併改成「${name}」嗎？`)) {
      setMessage(`已改名為「${name}」，既有記錄維持原樣。`);
      return;
    }
    try {
      const updated = await renameUserRecords(oldName, name);
      setMessage(`已改名為「${name}」，同步更新 ${updated} 筆記錄。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeUser(user: VirtualUser) {
    const keep = window.confirm(
      `刪除「${user.name}」後，既有記錄仍會保留這個名字。\n\n按「確定」＝一併改成其他名稱；按「取消」＝維持原樣。`,
    );
    if (keep) {
      const replacement = window.prompt("既有記錄要改成哪個名稱？", "共同支出");
      if (replacement && replacement.trim()) {
        try {
          const updated = await renameUserRecords(user.name, replacement.trim());
          setMessage(`已更新 ${updated} 筆記錄為「${replacement.trim()}」。`);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
      }
    }
    update({ users: settings.users.filter((u) => u.id !== user.id) });
  }

  async function runDebug() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/debug");
      setDebug((await response.json()) as DebugInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <main>
      <PageHeader title="設定" subtitle="全部存在這台裝置的 localStorage" backHref="/" />

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-base font-semibold">預算與匯率</h2>

        <label className="field-label" htmlFor="s-budget">
          總預算 (JPY)
        </label>
        <input
          id="s-budget"
          type="number"
          inputMode="numeric"
          className="field-input mb-3"
          value={String(settings.budget)}
          onChange={(e) => update({ budget: Math.max(0, Number(e.target.value) || 0) })}
        />

        <label className="field-label" htmlFor="s-budget-note">
          預算備註
        </label>
        <textarea
          id="s-budget-note"
          rows={2}
          className="field-input mb-3"
          placeholder="例：287,000 現鈔 + 5,000 Suica"
          value={settings.budgetNote}
          onChange={(e) => update({ budgetNote: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="s-rate">
              匯率（JPY → TWD）
            </label>
            <input
              id="s-rate"
              type="number"
              step="0.001"
              className="field-input"
              value={String(settings.exchangeRate)}
              onChange={(e) => update({ exchangeRate: Number(e.target.value) || 0.21 })}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="s-days">
              旅行天數
            </label>
            <input
              id="s-days"
              type="number"
              inputMode="numeric"
              min={1}
              className="field-input"
              value={String(settings.tripDays)}
              onChange={(e) => update({ tripDays: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-1 text-base font-semibold">行程表</h2>
        <p className="mb-2 text-xs" style={{ color: "var(--color-muted)" }}>
          每行一個地區，格式「名古屋 2/23-2/28」。掃描收據時會依日期自動判定地區。
        </p>
        <textarea
          rows={5}
          className="field-input"
          aria-label="行程表"
          placeholder={"名古屋 2/23-2/28\n高山 2/28-3/2\n金澤 3/2-3/5"}
          value={settings.tripSchedule}
          onChange={(e) => update({ tripSchedule: e.target.value })}
        />
        {segments.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--color-muted)" }}>
            {segments.map((segment) => (
              <li key={`${segment.region}-${segment.start}`}>
                {segment.region}：{segment.start} ~ {segment.end}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-1 text-base font-semibold">虛擬用戶</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--color-muted)" }}>
          純粹是記帳標籤，數量不限，不需要帳號密碼。
        </p>

        <ul className="mb-3 space-y-3">
          {settings.users.map((user) => (
            <li key={user.id} className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <Avatar user={user} size={36} />
                <input
                  className="field-input"
                  defaultValue={user.name}
                  aria-label={`用戶名稱：${user.name}`}
                  onBlur={(e) => void commitRename(user, e.target.value)}
                />
                <button
                  type="button"
                  className="chip"
                  style={{ color: "var(--color-danger)" }}
                  onClick={() => void removeUser(user)}
                >
                  刪除
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {USER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`選擇顏色 ${color}`}
                    className="h-6 w-6 rounded-full border-2"
                    style={{
                      background: color,
                      borderColor: user.color === color ? "var(--color-fg)" : "transparent",
                    }}
                    onClick={() => patchUser(user.id, { color })}
                  />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {USER_EMOJIS.map((emoji) => (
                  <button
                    key={emoji || "none"}
                    type="button"
                    className={`chip ${(user.emoji ?? "") === emoji ? "chip-active" : ""}`}
                    onClick={() => patchUser(user.id, { emoji: emoji || undefined })}
                  >
                    {emoji || "無"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            className="field-input"
            placeholder="新增用戶名稱"
            aria-label="新增用戶名稱"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              update({ users: [...settings.users, createUser(newUserName, settings.users)] });
              setNewUserName("");
            }}
          >
            新增
          </button>
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-1 text-base font-semibold">Demo 模式</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--color-muted)" }}>
          開啟後使用 55 筆假資料，不呼叫 Notion / Gemini，沒有 API key 也能瀏覽完整 UI。
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.demoMode}
            onChange={(e) => update({ demoMode: e.target.checked })}
          />
          啟用 Demo 模式
        </label>
        {settings.demoMode && (
          <button
            type="button"
            className="btn btn-secondary mt-3 w-full"
            onClick={() => {
              demoReset();
              setMessage("已重設 Demo 假資料。");
            }}
          >
            重設 Demo 資料
          </button>
        )}
      </section>

      <section className="card mb-6 p-4">
        <h2 className="mb-1 text-base font-semibold">連線健康檢查</h2>
        <p className="mb-3 text-xs" style={{ color: "var(--color-muted)" }}>
          呼叫 /api/debug 檢查 Gemini 與 Notion 設定狀態（不會顯示 key 內容）。
        </p>
        <button
          type="button"
          className="btn btn-secondary w-full"
          disabled={checking}
          onClick={() => void runDebug()}
        >
          {checking ? "檢查中…" : "執行檢查"}
        </button>

        {debug && (
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-semibold">Gemini</dt>
              <dd style={{ color: debug.gemini.ok ? "var(--color-success)" : "var(--color-danger)" }}>
                {debug.gemini.ok ? "✅" : "⚠️"} {debug.gemini.detail}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Notion</dt>
              <dd style={{ color: debug.notion.ok ? "var(--color-success)" : "var(--color-danger)" }}>
                {debug.notion.ok ? "✅" : "⚠️"} {debug.notion.detail}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">密碼保護</dt>
              <dd style={{ color: "var(--color-muted)" }}>{debug.passwordProtection}</dd>
            </div>
            {debug.database && (
              <div>
                <dt className="font-semibold">資料庫欄位</dt>
                <dd className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {debug.database.properties.map((p) => `${p.name}（${p.type}）`).join("、")}
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>
    </main>
  );
}

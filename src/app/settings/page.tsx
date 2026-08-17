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

interface SetupResult {
  databaseId: string;
  url: string;
  title: string;
  properties: Array<{ name: string; type: string }>;
}

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [setupPage, setSetupPage] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);

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

  /** 一鍵在指定 Notion 頁面底下建立資料庫，成功後顯示可複製的 Database ID。 */
  async function runSetup() {
    setSetupBusy(true);
    setSetupResult(null);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/notion/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: setupPage, exchangeRate: settings.exchangeRate }),
      });
      const data = (await response.json()) as SetupResult & { error?: string; hint?: string };
      if (!response.ok) {
        throw new Error([data.error, data.hint].filter(Boolean).join("\n") || "建立失敗");
      }
      setSetupResult(data);
      setCopied(false);
      setMessage("資料庫建立成功！請複製下方 Database ID 填入 NOTION_DATABASE_ID 後重啟。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSetupBusy(false);
    }
  }

  async function copyDatabaseId() {
    if (!setupResult) return;
    try {
      await navigator.clipboard.writeText(setupResult.databaseId);
      setCopied(true);
    } catch {
      setCopied(false);
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

      <section className="card mb-4 p-4">
        <h2 className="mb-1 text-base font-semibold">自動建立 Notion 資料庫</h2>
        <p className="mb-2 text-xs" style={{ color: "var(--color-muted)" }}>
          不想手動建 12 個欄位？貼上一個 Notion 頁面網址，一鍵建立好整個資料庫（含類別 / 支付方式選項與 TWD 公式）。
        </p>
        <ol
          className="mb-3 list-decimal space-y-1 pl-5 text-xs"
          style={{ color: "var(--color-muted)" }}
        >
          <li>先設定好 NOTION_TOKEN 並重啟（Demo 模式免此步）。</li>
          <li>在 Notion 建立一個空白頁面，右上角「⋯ → 連結 / Connections」把你的 integration 加進去。</li>
          <li>複製該頁面網址貼到下方，按「建立資料庫」。</li>
          <li>把產生的 Database ID 填入 NOTION_DATABASE_ID 後重啟。</li>
        </ol>
        <input
          className="field-input mb-2"
          placeholder="https://www.notion.so/你的頁面-xxxxxxxx..."
          aria-label="Notion 頁面網址或 ID"
          value={setupPage}
          onChange={(e) => setSetupPage(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={setupBusy || !setupPage.trim()}
          onClick={() => void runSetup()}
        >
          {setupBusy ? "建立中…" : "建立資料庫"}
        </button>

        {setupResult && (
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <span className="font-semibold">已建立資料庫「{setupResult.title}」</span>
            </div>
            <div>
              <div className="mb-1 text-xs" style={{ color: "var(--color-muted)" }}>
                NOTION_DATABASE_ID（填進 .env.local 或 Codespaces secret 後重啟）
              </div>
              <div className="flex gap-2">
                <code
                  className="field-input flex-1 overflow-x-auto text-xs"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {setupResult.databaseId}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void copyDatabaseId()}
                >
                  {copied ? "已複製" : "複製"}
                </button>
              </div>
            </div>
            {setupResult.url && (
              <a
                href={setupResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs underline"
                style={{ color: "var(--color-accent)" }}
              >
                在 Notion 開啟這個資料庫 →
              </a>
            )}
          </div>
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

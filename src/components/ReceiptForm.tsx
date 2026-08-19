"use client";

import { useMemo } from "react";
import UserPicker from "./UserPicker";
import { formatMoney } from "@/lib/settings";
import { regionsFromSchedule } from "@/lib/region";
import {
  CATEGORIES,
  PAYMENT_METHODS,
  type AppSettings,
  type Category,
  type PaymentMethod,
  type ReceiptInput,
} from "@/lib/types";

interface Props {
  value: ReceiptInput;
  onChange: (patch: Partial<ReceiptInput>) => void;
  settings: AppSettings;
  /** Notion 既有記錄出現過的用戶名（不在本機設定裡也能選） */
  knownUserNames?: string[];
  /** AI 辨識的日文原文欄位（手動輸入頁不需要顯示日文原文時可關閉） */
  showJapanese?: boolean;
}

/** 收據欄位表單：確認 AI 結果、手動輸入、歷史編輯共用，每個欄位皆可手動修正。 */
export default function ReceiptForm({
  value,
  onChange,
  settings,
  knownUserNames,
  showJapanese = true,
}: Props) {
  const regions = useMemo(
    () => regionsFromSchedule(settings.tripSchedule),
    [settings.tripSchedule],
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="field-label" htmlFor="f-title">
          項目（商品，繁體中文）
        </label>
        <input
          id="f-title"
          className="field-input"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="例：飯糰, 綠茶"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="f-store">
            店名
          </label>
          <input
            id="f-store"
            className="field-input"
            value={value.storeName}
            onChange={(e) => onChange({ storeName: e.target.value })}
            placeholder="全家便利商店"
          />
        </div>
        {showJapanese && (
          <div>
            <label className="field-label" htmlFor="f-store-ja">
              店名日文原文
            </label>
            <input
              id="f-store-ja"
              className="field-input"
              value={value.storeNameJa}
              onChange={(e) => onChange({ storeNameJa: e.target.value })}
              placeholder="ファミリーマート"
            />
          </div>
        )}
      </div>

      {showJapanese && (
        <div>
          <label className="field-label" htmlFor="f-items-ja">
            商品日文原文
          </label>
          <input
            id="f-items-ja"
            className="field-input"
            value={value.itemsJa}
            onChange={(e) => onChange({ itemsJa: e.target.value })}
            placeholder="おにぎり, 緑茶"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="f-amount">
            金額 (JPY)
          </label>
          <input
            id="f-amount"
            type="number"
            inputMode="numeric"
            min={0}
            className="field-input"
            value={String(value.amountJPY)}
            onChange={(e) => onChange({ amountJPY: Math.max(0, Number(e.target.value) || 0) })}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            {formatMoney(value.amountJPY, settings.exchangeRate)}
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="f-date">
            日期
          </label>
          <input
            id="f-date"
            type="date"
            className="field-input"
            value={value.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor="f-category">
            類別
          </label>
          <select
            id="f-category"
            className="field-input"
            value={value.category}
            onChange={(e) => onChange({ category: e.target.value as Category })}
          >
            <option value="">未分類</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="f-payment">
            支付方式
          </label>
          <select
            id="f-payment"
            className="field-input"
            value={value.paymentMethod}
            onChange={(e) => onChange({ paymentMethod: e.target.value as PaymentMethod })}
          >
            <option value="">未指定</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="f-region">
          地區{regions.length > 0 ? "（依行程日期自動判定，可修改）" : ""}
        </label>
        <input
          id="f-region"
          className="field-input"
          list="region-options"
          value={value.region}
          onChange={(e) => onChange({ region: e.target.value })}
          placeholder={regions.length > 0 ? regions.join(" / ") : "例：名古屋"}
        />
        <datalist id="region-options">
          {regions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </div>

      <div>
        <span className="field-label">用戶（誰付的）</span>
        <UserPicker
          users={settings.users}
          knownNames={knownUserNames}
          value={value.user}
          onChange={(user) => onChange({ user })}
          allowEmpty
          emptyLabel="未指定"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="f-note">
          備註（稅制、折扣資訊）
        </label>
        <textarea
          id="f-note"
          className="field-input"
          rows={3}
          value={value.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="例：内税 8%（外帶），割引 -200"
        />
      </div>
    </div>
  );
}

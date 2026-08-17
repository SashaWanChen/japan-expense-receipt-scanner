"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import ReceiptForm from "@/components/ReceiptForm";
import { useSettings } from "@/lib/hooks";
import { createReceipt, createReceiptItems } from "@/lib/receipts";
import { regionForDate } from "@/lib/region";
import {
  clearScanPayload,
  getScanServerSnapshot,
  getScanSnapshot,
  subscribeScan,
} from "@/lib/scan-store";
import { formatJPY, formatMoney } from "@/lib/settings";
import { todayISO } from "@/lib/stats";
import {
  TAX_RATES,
  TAX_TYPES,
  type ReceiptInput,
  type ReceiptItem,
  type TaxRate,
  type TaxType,
} from "@/lib/types";

export default function ScanConfirmPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const payload = useSyncExternalStore(subscribeScan, getScanSnapshot, getScanServerSnapshot);

  // AI 結果當作預設值，使用者改過的欄位存在 edits，兩者合併後就是表單內容
  const [edits, setEdits] = useState<Partial<ReceiptInput>>({});
  const [itemEdits, setItemEdits] = useState<ReceiptItem[] | null>(null);
  const [taxEdit, setTaxEdit] = useState<TaxType | null>(null);
  const [mode, setMode] = useState<"single" | "items">("single");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const form = useMemo<ReceiptInput | null>(() => {
    if (!payload) return null;
    const result = payload.result;
    const date = edits.date ?? result.date ?? "";
    const base: ReceiptInput = {
      title: result.items,
      storeName: result.storeName,
      storeNameJa: result.storeNameJa,
      itemsJa: result.itemsJa,
      date: date || todayISO(),
      amountJPY: result.amountJPY,
      category: result.category,
      paymentMethod: result.paymentMethod,
      region: "",
      user: settings.users[0]?.name ?? "",
      note: result.note,
    };
    const merged = { ...base, ...edits };
    if (!merged.region) merged.region = regionForDate(merged.date, settings.tripSchedule);
    return merged;
  }, [payload, edits, settings.tripSchedule, settings.users]);

  const items = useMemo(
    () => itemEdits ?? payload?.result.itemList ?? [],
    [itemEdits, payload],
  );
  const taxType = taxEdit ?? payload?.result.taxType ?? "内税";

  const itemsTotal = useMemo(
    () => items.reduce((acc, item) => acc + (Number(item.price) || 0), 0),
    [items],
  );

  function patch(next: Partial<ReceiptInput>) {
    setEdits((prev) => {
      const merged = { ...prev, ...next };
      // 日期改變時重新判定地區（使用者已手動填寫則保留）
      if (next.date && !next.region && !prev.region) {
        merged.region = regionForDate(next.date, settings.tripSchedule);
      }
      return merged;
    });
  }

  function patchItem(index: number, next: Partial<ReceiptItem>) {
    setItemEdits(items.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const note = form.note.includes(taxType)
        ? form.note
        : [taxType, form.note].filter(Boolean).join("／");
      const input: ReceiptInput = { ...form, note };

      if (mode === "items") {
        const valid = items.filter((item) => item.name || item.nameJa);
        if (valid.length === 0) throw new Error("沒有可寫入的品項，請改用一般寫入");
        await createReceiptItems(input, valid);
      } else {
        await createReceipt(input);
      }
      clearScanPayload();
      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  if (!payload || !form) {
    return (
      <main>
        <PageHeader title="確認辨識結果" backHref="/scan" />
        <Notice tone="error">
          找不到辨識結果，可能是重新整理造成的。請回到掃描頁重新拍一張。
        </Notice>
        <Link href="/scan" className="btn btn-primary w-full">
          回到掃描
        </Link>
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        title="確認辨識結果"
        subtitle={`每個欄位都可以手動修正　·　model: ${payload.model}`}
        backHref="/scan"
      />

      {error && <Notice tone="error">{error}</Notice>}

      {payload.preview && (
        <details className="card mb-4 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
            查看收據照片
          </summary>
          <Image
            src={payload.preview}
            alt="收據照片"
            width={1024}
            height={1024}
            unoptimized
            className="h-auto w-full"
          />
        </details>
      )}

      <section className="card mb-4 p-4">
        <label className="field-label" htmlFor="f-taxtype">
          稅制
        </label>
        <select
          id="f-taxtype"
          className="field-input"
          value={taxType}
          onChange={(e) => setTaxEdit(e.target.value as TaxType)}
        >
          {TAX_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
          外税：標價未含稅／内税：標價已含稅／免税：旅客退稅。儲存時會寫入備註。
        </p>
      </section>

      <section className="card mb-4 p-4">
        <ReceiptForm value={form} onChange={patch} settings={settings} />
      </section>

      <section className="card mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">品項明細</h2>
          <button
            type="button"
            className="chip"
            onClick={() => setItemEdits([...items, { name: "", nameJa: "", price: 0, taxRate: 10 }])}
          >
            ＋ 新增品項
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            沒有辨識到品項，只能用一般寫入。
          </p>
        )}

        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="field-input"
                  value={item.name}
                  placeholder="品名（繁中）"
                  aria-label={`品項 ${index + 1} 名稱`}
                  onChange={(e) => patchItem(index, { name: e.target.value })}
                />
                <input
                  className="field-input"
                  value={item.nameJa}
                  placeholder="品名（日文）"
                  aria-label={`品項 ${index + 1} 日文名稱`}
                  onChange={(e) => patchItem(index, { nameJa: e.target.value })}
                />
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  value={String(item.price)}
                  aria-label={`品項 ${index + 1} 金額`}
                  onChange={(e) => patchItem(index, { price: Number(e.target.value) || 0 })}
                />
                <select
                  className="field-input"
                  value={String(item.taxRate)}
                  aria-label={`品項 ${index + 1} 稅率`}
                  onChange={(e) => patchItem(index, { taxRate: Number(e.target.value) as TaxRate })}
                >
                  {TAX_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      稅率 {rate}%
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="mt-2 text-xs"
                style={{ color: "var(--color-danger)" }}
                onClick={() => setItemEdits(items.filter((_, i) => i !== index))}
              >
                移除這一項
              </button>
            </li>
          ))}
        </ul>

        {items.length > 0 && (
          <p className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
            品項合計 {formatJPY(itemsTotal)}／收據總額 {formatJPY(form.amountJPY)}
            {itemsTotal !== form.amountJPY && "（逐品項寫入時會按比例分攤，差額補到最後一項）"}
          </p>
        )}
      </section>

      <section className="card mb-4 p-4">
        <h2 className="mb-2 text-base font-semibold">寫入方式</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className={`chip ${mode === "single" ? "chip-active" : ""}`}
            onClick={() => setMode("single")}
          >
            一般寫入（一筆）
          </button>
          <button
            type="button"
            className={`chip ${mode === "items" ? "chip-active" : ""}`}
            onClick={() => setMode("items")}
            disabled={items.length === 0}
          >
            逐品項寫入（{items.length} 筆）
          </button>
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
          {formatMoney(form.amountJPY, settings.exchangeRate)}
        </p>
      </section>

      <div className="mb-6 flex gap-3">
        <Link href="/scan" className="btn btn-secondary flex-1">
          重拍
        </Link>
        <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={() => void save()}>
          {saving ? "儲存中…" : "儲存"}
        </button>
      </div>
    </main>
  );
}

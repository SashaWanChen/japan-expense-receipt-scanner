"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import ReceiptForm from "@/components/ReceiptForm";
import { useSettings } from "@/lib/hooks";
import { createReceipt } from "@/lib/receipts";
import { regionForDate } from "@/lib/region";
import { todayISO } from "@/lib/stats";
import type { ReceiptInput } from "@/lib/types";

function emptyReceipt(): ReceiptInput {
  return {
    title: "",
    storeName: "",
    storeNameJa: "",
    itemsJa: "",
    date: todayISO(),
    amountJPY: 0,
    category: "餐飲",
    paymentMethod: "現金",
    region: "",
    user: "",
    note: "",
  };
}

export default function AddPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [form, setForm] = useState<ReceiptInput>(() => emptyReceipt());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 地區與用戶用「衍生預設值」處理：使用者沒填時自動帶入，填了就以填的為準
  const effective = useMemo<ReceiptInput>(
    () => ({
      ...form,
      region: form.region || regionForDate(form.date, settings.tripSchedule),
      user: form.user || (settings.users[0]?.name ?? ""),
    }),
    [form, settings.tripSchedule, settings.users],
  );

  function patch(next: Partial<ReceiptInput>) {
    setForm((prev) => {
      const merged = { ...prev, ...next };
      if (next.date && next.date !== prev.date && !next.region) {
        const auto = regionForDate(next.date, settings.tripSchedule);
        if (auto) merged.region = auto;
      }
      return merged;
    });
  }

  async function save() {
    if (!effective.title.trim() && !effective.storeName.trim()) {
      setError("請至少填寫項目或店名");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createReceipt(effective);
      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader title="手動輸入" subtitle="沒有收據時直接填表新增" backHref="/" />

      {error && <Notice tone="error">{error}</Notice>}

      <section className="card mb-4 p-4">
        <ReceiptForm value={effective} onChange={patch} settings={settings} />
      </section>

      <div className="mb-6 flex gap-3">
        <button
          type="button"
          className="btn btn-secondary flex-1"
          onClick={() => setForm(emptyReceipt())}
        >
          清空
        </button>
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "儲存中…" : "儲存"}
        </button>
      </div>
    </main>
  );
}

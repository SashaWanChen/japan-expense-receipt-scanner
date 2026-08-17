"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import { demoAnalyze } from "@/lib/demo-mode";
import { useSettings } from "@/lib/hooks";
import { compressImage, formatBytes, MAX_EDGE, type CompressedImage } from "@/lib/image";
import { analyzeImage } from "@/lib/receipts";
import { saveScanPayload } from "@/lib/scan-store";

export default function ScanPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [preview, setPreview] = useState<CompressedImage | null>(null);
  const [status, setStatus] = useState<"idle" | "compressing" | "analyzing">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStatus("compressing");
    try {
      const image = await compressImage(file);
      setPreview(image);
      setStatus("analyzing");

      const payload = settings.demoMode
        ? { result: demoAnalyze(), model: "demo" }
        : await analyzeImage(image.base64, image.mimeType);

      saveScanPayload({ ...payload, preview: image.dataUrl });
      router.push("/scan/confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <main>
      <PageHeader title="掃描收據" subtitle="拍照或從相簿選一張收據" backHref="/" />

      {error && <Notice tone="error">{error}</Notice>}
      {settings.demoMode && <Notice>Demo 模式：不會呼叫 Gemini，會回傳一筆示範辨識結果。</Notice>}

      <section className="card mb-4 p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          📷 開啟相機 / 選擇照片
        </button>
        <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
          上傳前會在手機端壓縮到最長邊 {MAX_EDGE}px、JPEG 品質 0.8，加快辨識速度。
        </p>
      </section>

      {preview && (
        <section className="card mb-4 overflow-hidden">
          <Image
            src={preview.dataUrl}
            alt="收據預覽"
            width={preview.width}
            height={preview.height}
            unoptimized
            className="h-auto w-full"
          />
          <p className="p-3 text-xs" style={{ color: "var(--color-muted)" }}>
            壓縮後 {preview.width}×{preview.height}、約 {formatBytes(preview.bytes)}
          </p>
        </section>
      )}

      {busy && (
        <section className="card p-4 text-center">
          <div
            className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
          />
          <p className="text-sm">
            {status === "compressing" ? "壓縮圖片中…" : "AI 辨識中，約需 3-8 秒…"}
          </p>
        </section>
      )}
    </main>
  );
}

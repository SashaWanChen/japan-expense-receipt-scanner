/** 掃描結果暫存（sessionStorage），/scan → /scan/confirm 之間傳遞。 */
import type { AnalyzeResult } from "./types";

const SCAN_RESULT_KEY = "jrs.scan-result";

export interface ScanPayload {
  result: AnalyzeResult;
  model: string;
  preview?: string;
}

export function saveScanPayload(payload: ScanPayload): void {
  sessionStorage.setItem(SCAN_RESULT_KEY, JSON.stringify(payload));
}

export function readScanPayload(): ScanPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SCAN_RESULT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScanPayload;
  } catch {
    return null;
  }
}

export function clearScanPayload(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SCAN_RESULT_KEY);
  cachedRaw = null;
  cachedPayload = null;
}

let cachedRaw: string | null = null;
let cachedPayload: ScanPayload | null = null;

/** useSyncExternalStore 用：snapshot 需參照穩定，用原始字串當快取 key。 */
export function getScanSnapshot(): ScanPayload | null {
  const raw = sessionStorage.getItem(SCAN_RESULT_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPayload = readScanPayload();
  }
  return cachedPayload;
}

export function getScanServerSnapshot(): ScanPayload | null {
  return null;
}

/** sessionStorage 不會主動變動，訂閱僅需回傳 cleanup。 */
export function subscribeScan(): () => void {
  return () => {};
}

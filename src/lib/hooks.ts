"use client";

/** 共用 React hooks：設定與收據資料。 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { fetchReceipts } from "./receipts";
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  SETTINGS_EVENT,
  SETTINGS_KEY,
} from "./settings";
import type { AppSettings, Receipt } from "./types";

/* -------------------------------------------------------------------------- */
/* 設定：把 localStorage 當作 external store                                    */
/* -------------------------------------------------------------------------- */

const serverSnapshot = defaultSettings();
let cachedRaw: string | null = null;
let cachedSettings: AppSettings | null = null;

function subscribe(onChange: () => void): () => void {
  // 第一次訂閱時把預設值寫入，之後 snapshot 才會穩定
  if (!window.localStorage.getItem(SETTINGS_KEY)) saveSettings(defaultSettings());
  window.addEventListener(SETTINGS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** useSyncExternalStore 要求 snapshot 參照穩定，所以用原始字串當快取 key。 */
function getSettingsSnapshot(): AppSettings {
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (raw !== cachedRaw || !cachedSettings) {
    cachedRaw = raw;
    cachedSettings = loadSettings();
  }
  return cachedSettings;
}

function getServerSettingsSnapshot(): AppSettings {
  return serverSnapshot;
}

/** 讀取 localStorage 設定；hydration 完成前先用預設值避免 SSR 不一致。 */
export function useSettings(): {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => AppSettings;
  ready: boolean;
} {
  const settings = useSyncExternalStore(
    subscribe,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...loadSettings(), ...patch };
    saveSettings(next);
    return next;
  }, []);

  return { settings, update, ready };
}

/* -------------------------------------------------------------------------- */
/* 收據資料                                                                    */
/* -------------------------------------------------------------------------- */

export interface ReceiptsState {
  receipts: Receipt[];
  loading: boolean;
  error: string;
  reload: (refresh?: boolean) => Promise<void>;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 載入收據列表（Demo 模式自動改讀假資料）。 */
export function useReceipts(enabled = true): ReceiptsState {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const reload = useCallback(async (refresh = false) => {
    setLoading(true);
    setError("");
    try {
      setReceipts(await fetchReceipts(refresh));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchReceipts();
        if (!cancelled) {
          setReceipts(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(toMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { receipts, loading, error, reload };
}

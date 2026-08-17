"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Notice from "@/components/Notice";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "登入失敗");
      }
      const next = searchParams.get("next") ?? "/";
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="card p-5">
      <h1 className="mb-1 text-xl font-bold">日本旅行記帳</h1>
      <p className="mb-4 text-sm" style={{ color: "var(--color-muted)" }}>
        這個網址有設定密碼保護，請輸入 APP_PASSWORD。
      </p>

      {error && <Notice tone="error">{error}</Notice>}

      <label className="field-label" htmlFor="password">
        密碼
      </label>
      <input
        id="password"
        type="password"
        className="field-input mb-4"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "登入中…" : "登入"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="pt-10">
      <Suspense fallback={<p className="text-center text-sm">載入中…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

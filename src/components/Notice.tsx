interface Props {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
}

/** 提示 / 錯誤訊息區塊。 */
export default function Notice({ tone = "info", children }: Props) {
  const color =
    tone === "error"
      ? "var(--color-danger)"
      : tone === "success"
        ? "var(--color-success)"
        : "var(--color-accent)";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="mb-4 rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color: "var(--color-fg)",
      }}
    >
      {children}
    </div>
  );
}

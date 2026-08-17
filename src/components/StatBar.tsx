interface Props {
  label: string;
  value: string;
  ratio: number;
  color?: string;
  hint?: string;
}

/** 純 CSS 進度條 / 橫向長條圖（不引入圖表庫）。 */
export default function StatBar({ label, value, ratio, color, hint }: Props) {
  const percent = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0)) * 100;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums" style={{ color: "var(--color-muted)" }}>
          {value}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--color-surface-muted)" }}
        role="img"
        aria-label={`${label} ${percent.toFixed(0)}%`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, background: color ?? "var(--color-primary)" }}
        />
      </div>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

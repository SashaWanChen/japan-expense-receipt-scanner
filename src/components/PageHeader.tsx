import Link from "next/link";

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
}

/** 頁面標題列，可帶返回鍵與右側操作。 */
export default function PageHeader({ title, subtitle, backHref, action }: Props) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {backHref && (
            <Link
              href={backHref}
              aria-label="返回"
              className="text-lg"
              style={{ color: "var(--color-muted)" }}
            >
              ←
            </Link>
          )}
          <h1 className="truncate text-xl font-bold">{title}</h1>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

import type { ReactNode } from "react";

export function CmsPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CmsPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-card ${className}`}>
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="font-sans text-sm font-semibold text-card-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function CmsStat({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight text-card-foreground">
        {value}
      </div>
      {detail && (
        <div
          className={`mt-2 text-xs ${
            trend === "up"
              ? "text-cat-green"
              : trend === "down"
                ? "text-crimson"
                : "text-muted-foreground"
          }`}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

export function CmsStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-cat-green/12 text-cat-green",
    warning: "bg-gold/15 text-gold",
    danger: "bg-crimson/12 text-crimson",
    info: "bg-cat-blue/12 text-cat-blue",
  };
  return (
    <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function CmsEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const cmsButton =
  "inline-flex h-9 items-center justify-center gap-2 border border-transparent bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50";

export const cmsSecondaryButton =
  "inline-flex h-9 items-center justify-center gap-2 border border-input bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

export const cmsInput =
  "h-9 w-full border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring";

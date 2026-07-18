import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function CmsPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function CmsPanel({
  title,
  description,
  action,
  children,
  className = "",
  padded = false,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden border border-border bg-card shadow-[var(--cms-shadow)]",
        className,
      )}
    >
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border bg-muted/25 px-5 py-3.5">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-sans text-[13px] font-semibold tracking-tight text-card-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function CmsStat({
  label,
  value,
  detail,
  trend,
  icon: Icon,
  changePercent,
  className,
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  /** Period-over-period change, e.g. 12.5 for +12.5% */
  changePercent?: number | null;
  className?: string;
}) {
  const changeTone =
    changePercent == null || Number.isNaN(changePercent)
      ? "neutral"
      : changePercent > 0
        ? "up"
        : changePercent < 0
          ? "down"
          : "neutral";
  const resolvedTrend = trend ?? changeTone;

  return (
    <div
      className={cn(
        "group border border-border bg-card p-4 shadow-[var(--cms-shadow)] cms-transition hover:border-foreground/20 hover:shadow-[var(--cms-shadow-hover)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow text-[10px]">{label}</div>
        {Icon ? (
          <div className="flex h-8 w-8 items-center justify-center bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background cms-transition">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="cms-metric mt-2.5 text-[1.75rem] font-semibold leading-none text-card-foreground sm:text-[2rem]">
        {value}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {changePercent != null && !Number.isNaN(changePercent) ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              changeTone === "up" && "text-cat-green",
              changeTone === "down" && "text-crimson",
              changeTone === "neutral" && "text-muted-foreground",
            )}
          >
            {changePercent > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : changePercent < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {changePercent > 0 ? "+" : ""}
            {changePercent.toFixed(1)}%
          </span>
        ) : null}
        {detail ? (
          <span
            className={cn(
              "text-[11px] font-medium",
              resolvedTrend === "up" && !changePercent && "text-cat-green",
              resolvedTrend === "down" && !changePercent && "text-crimson",
              (resolvedTrend === "neutral" || changePercent != null) && "text-muted-foreground",
            )}
          >
            {detail}
          </span>
        ) : null}
      </div>
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
    neutral: "bg-muted text-muted-foreground ring-1 ring-border",
    success: "bg-cat-green/12 text-cat-green ring-1 ring-cat-green/20",
    warning: "bg-gold/15 text-gold ring-1 ring-gold/25",
    danger: "bg-crimson/12 text-crimson ring-1 ring-crimson/20",
    info: "bg-cat-blue/12 text-cat-blue ring-1 ring-cat-blue/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function CmsEmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center border border-border bg-muted/60 text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="font-sans text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CmsAlert({
  children,
  tone = "danger",
  className,
}: {
  children: ReactNode;
  tone?: "danger" | "warning" | "info" | "success";
  className?: string;
}) {
  const tones = {
    danger: "border-crimson/30 bg-crimson/10 text-crimson",
    warning: "border-gold/30 bg-gold/10 text-gold",
    info: "border-cat-blue/30 bg-cat-blue/10 text-cat-blue",
    success: "border-cat-green/30 bg-cat-green/10 text-cat-green",
  };
  return (
    <div className={cn("border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

export const cmsButton = cn(
  "inline-flex h-9 items-center justify-center gap-2 border border-transparent bg-primary px-3.5",
  "text-xs font-semibold text-primary-foreground cms-transition",
  "hover:opacity-90 active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const cmsSecondaryButton = cn(
  "inline-flex h-9 items-center justify-center gap-2 border border-input bg-background px-3.5",
  "text-xs font-semibold text-foreground cms-transition",
  "hover:border-foreground/25 hover:bg-accent active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const cmsGhostButton = cn(
  "inline-flex h-9 items-center justify-center gap-2 border border-transparent px-3",
  "text-xs font-semibold text-muted-foreground cms-transition",
  "hover:bg-accent hover:text-foreground",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const cmsInput = cn(
  "h-9 w-full border border-input bg-background px-3 text-sm text-foreground outline-none",
  "placeholder:text-muted-foreground cms-transition",
  "hover:border-foreground/20 focus:border-ring focus:ring-1 focus:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Inbox,
  Minus,
  Siren,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CmsStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

const STATUS_ICONS: Partial<Record<string, LucideIcon>> = {
  published: CheckCircle2,
  approved: CheckCircle2,
  active: CheckCircle2,
  verified: CheckCircle2,
  draft: CircleDashed,
  review: Clock3,
  pending: Clock3,
  scheduled: Clock3,
  archived: Archive,
  breaking: Siren,
};

export function CmsPageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3 opacity-60" /> : null}
                {crumb.href ? (
                  <a href={crumb.href} className="font-medium hover:text-primary">
                    {crumb.label}
                  </a>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? "font-semibold text-foreground" : ""}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <div className="eyebrow text-primary/70">{eyebrow}</div> : null}
        <h1 className="font-sans text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.85rem]">
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
        "overflow-hidden rounded-xl border border-border/80 bg-card shadow-[var(--cms-shadow)]",
        className,
      )}
    >
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border/70 bg-muted/30 px-5 py-3.5">
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

const ICON_TONES = [
  "bg-primary/12 text-primary",
  "bg-cat-indigo/12 text-cat-indigo",
  "bg-cat-purple/12 text-cat-purple",
  "bg-cat-sky/12 text-cat-sky",
  "bg-cat-green/12 text-cat-green",
  "bg-cat-amber/12 text-cat-amber",
] as const;

function iconToneForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash + label.charCodeAt(i) * (i + 1)) % ICON_TONES.length;
  return ICON_TONES[hash];
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
        "group rounded-xl border border-border/80 bg-card p-4 shadow-[var(--cms-shadow)] cms-transition",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--cms-shadow-hover)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow text-[10px] text-muted-foreground">{label}</div>
        {Icon ? (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg cms-transition",
              iconToneForLabel(label),
            )}
          >
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
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              changeTone === "up" && "bg-cat-green/12 text-cat-green",
              changeTone === "down" && "bg-cat-rose/12 text-cat-rose",
              changeTone === "neutral" && "bg-muted text-muted-foreground",
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
              resolvedTrend === "up" && changePercent == null && "text-cat-green",
              resolvedTrend === "down" && changePercent == null && "text-cat-rose",
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
  icon,
  status,
}: {
  children: ReactNode;
  tone?: CmsStatusTone;
  icon?: LucideIcon | false;
  status?: string;
}) {
  const tones: Record<CmsStatusTone, string> = {
    neutral: "bg-muted text-muted-foreground ring-1 ring-border/80",
    success: "bg-cat-green/12 text-cat-green ring-1 ring-cat-green/20",
    warning: "bg-cat-amber/15 text-cat-amber ring-1 ring-cat-amber/25",
    danger: "bg-cat-rose/12 text-cat-rose ring-1 ring-cat-rose/20",
    info: "bg-cat-sky/14 text-cat-sky ring-1 ring-cat-sky/25",
    accent: "bg-cat-purple/12 text-cat-purple ring-1 ring-cat-purple/20",
  };
  const StatusIcon =
    icon === false
      ? null
      : icon ?? (status ? STATUS_ICONS[status.toLowerCase()] : undefined) ?? null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
        tones[tone],
      )}
    >
      {StatusIcon ? <StatusIcon className="h-3 w-3 shrink-0 opacity-90" /> : null}
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
        "flex min-h-56 flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted text-primary shadow-[var(--cms-shadow)]">
          {icon ?? <Inbox className="h-6 w-6" />}
        </div>
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
    danger: "border-cat-rose/30 bg-cat-rose/10 text-cat-rose",
    warning: "border-cat-amber/30 bg-cat-amber/10 text-cat-amber",
    info: "border-cat-sky/30 bg-cat-sky/10 text-cat-sky",
    success: "border-cat-green/30 bg-cat-green/10 text-cat-green",
  };
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export const cmsButton = cn(
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-3.5",
  "text-xs font-semibold text-primary-foreground shadow-sm cms-transition",
  "hover:opacity-90 hover:shadow-[0_0_0_3px_var(--cms-glow)] active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const cmsSecondaryButton = cn(
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3.5",
  "text-xs font-semibold text-foreground cms-transition",
  "hover:border-primary/30 hover:bg-accent active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const cmsGhostButton = cn(
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-transparent px-3",
  "text-xs font-semibold text-muted-foreground cms-transition",
  "hover:bg-accent hover:text-foreground",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const cmsInput = cn(
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none",
  "placeholder:text-muted-foreground cms-transition",
  "hover:border-foreground/20 focus:border-ring focus:ring-2 focus:ring-ring/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

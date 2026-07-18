import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { CmsEmptyState, CmsPanel, cmsButton } from "@/components/cms-ui";
import { MetricCard, PageHeader, RoleGuard, StatusBadge } from "@/components/cms";
import { CmsPageSkeleton, CmsTableSkeleton } from "@/components/cms/loading";
import { cn } from "@/lib/utils";

/** Phase 12 aliases — reuse existing CMS primitives, do not duplicate. */
export const StatCard = MetricCard;
export const DashboardHeader = PageHeader;
export const SkeletonLoader = CmsPageSkeleton;
export const TableSkeletonLoader = CmsTableSkeleton;

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="font-sans text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  params,
  permission,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  params?: Record<string, string>;
  permission?: Parameters<typeof RoleGuard>[0]["permission"];
}) {
  const card = (
    <Link
      to={href}
      params={params}
      className="group rounded-xl border border-border/80 bg-card p-5 shadow-[var(--cms-shadow)] cms-transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--cms-shadow-hover)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary cms-transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
  if (!permission) return card;
  return <RoleGuard permission={permission}>{card}</RoleGuard>;
}

export function ActivityFeed({
  items,
  emptyTitle = "No activity",
  emptyDescription = "Updates will appear here.",
}: {
  items: Array<{
    id: string;
    title: string;
    detail: string;
    meta?: string;
    href?: string;
    status?: string;
  }>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!items.length) {
    return <CmsEmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const body = (
          <>
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-foreground/40" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
              {item.meta ? (
                <div className="mt-1 cms-metric text-[11px] text-muted-foreground">{item.meta}</div>
              ) : null}
            </div>
            {item.status ? <StatusBadge status={item.status}>{item.status}</StatusBadge> : null}
          </>
        );
        if (item.href?.startsWith("/admin/articles/")) {
          const id = item.href.split("/").pop()!;
          return (
            <Link
              key={item.id}
              to="/admin/articles/$id"
              params={{ id }}
              className="flex items-start gap-3 px-5 py-4 cms-transition hover:bg-accent/50"
            >
              {body}
            </Link>
          );
        }
        if (item.href) {
          return (
            <a
              key={item.id}
              href={item.href}
              className="flex items-start gap-3 px-5 py-4 cms-transition hover:bg-accent/50"
            >
              {body}
            </a>
          );
        }
        return (
          <div key={item.id} className="flex items-start gap-3 px-5 py-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function PipelineBar({
  stages,
}: {
  stages: Array<{ label: string; value: number; tone?: string }>;
}) {
  const total = Math.max(
    stages.reduce((sum, stage) => sum + stage.value, 0),
    1,
  );
  return (
    <div className="space-y-3 p-5">
      <div className="flex h-3 overflow-hidden border border-border bg-muted">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className={cn("h-full", stage.tone ?? "bg-foreground/70")}
            style={{ width: `${(stage.value / total) * 100}%` }}
            title={`${stage.label}: ${stage.value}`}
          />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{stage.label}</span>
            <span className="cms-metric font-semibold text-foreground">{stage.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FloatingQuickActions({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[min(100vw-2rem,20rem)] rounded-2xl border border-border/80 bg-card/95 p-3 shadow-[var(--cms-shadow-hover)] backdrop-blur-xl">
          <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quick actions
          </div>
          <div className="grid gap-2">{children}</div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        className={cn(cmsButton, "h-12 w-12 rounded-2xl p-0 text-lg shadow-[var(--cms-shadow-hover)]")}
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        {open ? "×" : "+"}
      </button>
    </div>
  );
}

export { CmsPanel as ChartPanel };

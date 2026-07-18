import type { ReactNode } from "react";
import { cmsGhostButton, cmsSecondaryButton } from "@/components/cms-ui";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  onClear,
  clearLabel = "Clear filters",
  trailing,
  className,
}: {
  children: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 border-b border-border bg-muted/20 p-4", className)}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</div>
      {(onClear || trailing) && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {onClear && (
            <button type="button" className={cmsSecondaryButton} onClick={onClear}>
              {clearLabel}
            </button>
          )}
          {trailing}
        </div>
      )}
    </div>
  );
}

export function FilterChip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 border px-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] cms-transition",
        active
          ? "border-foreground bg-foreground text-background shadow-[var(--cms-shadow)]"
          : "border-input bg-background text-muted-foreground hover:border-foreground/30 hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 border border-border bg-muted/30 p-1",
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function SegmentedItem({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold cms-transition",
        active
          ? "bg-card text-foreground shadow-[var(--cms-shadow)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export { cmsGhostButton };

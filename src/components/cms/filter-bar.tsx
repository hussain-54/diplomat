import type { ReactNode } from "react";
import { cmsSecondaryButton } from "@/components/cms-ui";
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
    <div className={cn("space-y-3 border-b border-border p-4", className)}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
      {(onClear || trailing) && (
        <div className="flex flex-wrap items-center gap-2">
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
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 border px-3 text-xs font-semibold uppercase tracking-wide",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-input bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

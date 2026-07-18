import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CmsPageSkeleton({
  metrics = 4,
  panels = 2,
  className,
}: {
  metrics?: number;
  panels?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)} aria-label="Loading" aria-busy="true">
      <div className="space-y-2 border-b border-border pb-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: metrics }).map((_, index) => (
          <div key={index} className="space-y-3 border border-border bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className={cn("grid gap-6", panels > 1 && "xl:grid-cols-2")}>
        {Array.from({ length: panels }).map((_, index) => (
          <div key={index} className="space-y-3 border border-border bg-card p-5">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 5 }).map((__, row) => (
              <Skeleton key={row} className="h-11 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CmsTableSkeleton({
  rows = 8,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0 border border-border bg-card", className)} aria-busy="true">
      <div className="flex gap-3 border-b border-border bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3 border-b border-border px-4 py-4 last:border-0">
          {Array.from({ length: cols }).map((__, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

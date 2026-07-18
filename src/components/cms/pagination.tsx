import { ChevronLeft, ChevronRight } from "lucide-react";
import { cmsGhostButton, cmsSecondaryButton } from "@/components/cms-ui";
import { cn } from "@/lib/utils";

export function CmsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        <span className="cms-metric font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="cms-metric font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cmsSecondaryButton}
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(safePage, totalPages).map((item, index) =>
            item === "…" ? (
              <span key={`e-${index}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={cn(
                  cmsGhostButton,
                  "h-8 min-w-8 px-2",
                  item === safePage && "bg-foreground text-background hover:bg-foreground hover:text-background",
                )}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className={cmsSecondaryButton}
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function pageWindow(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 3) return [1, 2, 3, 4, "…", totalPages];
  if (page >= totalPages - 2) {
    return [1, "…", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "…", page - 1, page, page + 1, "…", totalPages];
}

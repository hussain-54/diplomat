import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { CmsEmptyState } from "@/components/cms-ui";
import { cn } from "@/lib/utils";

export type DataTableColumn = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | false;
  onSort?: () => void;
};

export function DataTable({
  columns,
  children,
  empty,
  toolbar,
  footer,
  minWidth = "960px",
  maxHeight = "min(70vh, 720px)",
  className,
  dense = false,
  stickyHeader = true,
}: {
  columns: DataTableColumn[];
  children: ReactNode;
  empty?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
  /** Enables sticky header scrolling when set */
  maxHeight?: string;
  className?: string;
  dense?: boolean;
  stickyHeader?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      {toolbar}
      <div
        className="overflow-auto"
        style={stickyHeader ? { maxHeight } : undefined}
      >
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead
            className={cn(
              "z-10 border-b border-border bg-muted/80 text-[10px] uppercase tracking-[0.1em] text-muted-foreground backdrop-blur",
              stickyHeader && "sticky top-0",
            )}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 font-semibold",
                    dense ? "py-2.5" : "py-3",
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.className,
                  )}
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    column.sortable
                      ? column.sortDirection === "asc"
                        ? "ascending"
                        : column.sortDirection === "desc"
                          ? "descending"
                          : "none"
                      : undefined
                  }
                >
                  {column.sortable && column.onSort ? (
                    <button
                      type="button"
                      onClick={column.onSort}
                      className={cn(
                        "inline-flex items-center gap-1 uppercase tracking-[0.1em] cms-transition hover:text-foreground",
                        column.align === "right" && "ml-auto",
                        column.sortDirection && "text-foreground",
                      )}
                    >
                      <span>{column.header}</span>
                      {column.sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : column.sortDirection === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">{children}</tbody>
        </table>
      </div>
      {empty}
      {footer}
    </div>
  );
}

export function DataTableRow({
  children,
  className,
  onClick,
  selected,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      className={cn(
        "cms-transition hover:bg-accent/60",
        selected && "bg-accent/80",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      data-selected={selected || undefined}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  align = "left",
  className,
  colSpan,
  mono,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  colSpan?: number;
  mono?: boolean;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3.5 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "cms-metric text-[13px]",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function DataTableEmpty({
  title = "No results",
  description = "Nothing matches the current filters.",
  colSpan,
  action,
}: {
  title?: string;
  description?: string;
  colSpan: number;
  action?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <CmsEmptyState title={title} description={description} action={action} />
      </td>
    </tr>
  );
}

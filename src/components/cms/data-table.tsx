import type { ReactNode } from "react";
import { CmsEmptyState } from "@/components/cms-ui";
import { cn } from "@/lib/utils";

export type DataTableColumn = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
};

export function DataTable({
  columns,
  children,
  empty,
  toolbar,
  footer,
  minWidth = "960px",
  className,
  dense = false,
}: {
  columns: DataTableColumn[];
  children: ReactNode;
  empty?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      {toolbar}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 border-b border-border bg-muted/70 text-[10px] uppercase tracking-[0.1em] text-muted-foreground backdrop-blur">
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
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
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

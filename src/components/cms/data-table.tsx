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
  minWidth = "960px",
  className,
}: {
  columns: DataTableColumn[];
  children: ReactNode;
  empty?: ReactNode;
  toolbar?: ReactNode;
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      {toolbar}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 font-semibold",
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
    </div>
  );
}

export function DataTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn("hover:bg-muted/30", onClick && "cursor-pointer", className)}
      onClick={onClick}
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
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-4 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
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
}: {
  title?: string;
  description?: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <CmsEmptyState title={title} description={description} />
      </td>
    </tr>
  );
}

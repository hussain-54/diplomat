import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  cmsInput,
} from "@/components/cms";
import { DataTable, DataTableCell, DataTableRow } from "@/components/cms/data-table";
import { listCategoryActivity } from "@/lib/admin.functions";

export function CategoryActivityPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const logsQ = useQuery({
    queryKey: ["category-activity", action, page],
    queryFn: () => listCategoryActivity({ data: { action: action || undefined, page, pageSize: 30 } }),
  });

  if (logsQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  const rows = logsQ.data?.items ?? [];

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title="Category activity logs"
        description="Audit trail for category create, update, import, and archive actions."
      />

      <div className="flex flex-wrap gap-2">
        <select className={cmsInput} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          <option value="category.create">Create</option>
          <option value="category.update">Update</option>
          <option value="category.delete">Delete</option>
          <option value="category.import">Import</option>
          <option value="category.archive">Archive</option>
        </select>
      </div>

      <CmsPanel>
        <DataTable
          columns={[
            { key: "user", header: "User" },
            { key: "action", header: "Action" },
            { key: "details", header: "Details" },
            { key: "date", header: "Date & time" },
          ]}
          empty={<CmsEmptyState title="No activity yet" description="Category actions will appear here." />}
          footer={
            (logsQ.data?.total ?? 0) > 30 ? (
              <div className="flex justify-end gap-2 border-t px-3 py-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-xs font-semibold">
                  Previous
                </button>
                <button type="button" onClick={() => setPage((p) => p + 1)} className="text-xs font-semibold">
                  Next
                </button>
              </div>
            ) : undefined
          }
        >
          {rows.map((row) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return (
              <DataTableRow key={row.id}>
                <DataTableCell>{profile?.name ?? profile?.email ?? "Staff"}</DataTableCell>
                <DataTableCell className="font-medium">{row.action}</DataTableCell>
                <DataTableCell className="max-w-md truncate text-muted-foreground">{row.details ?? "—"}</DataTableCell>
                <DataTableCell className="text-muted-foreground whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTable>
      </CmsPanel>
    </div>
  );
}

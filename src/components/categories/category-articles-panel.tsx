import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { useState } from "react";
import {
  CmsEmptyState,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
} from "@/components/cms";
import { DataTable, DataTableCell, DataTableRow } from "@/components/cms/data-table";
import { listCategoryArticles } from "@/lib/admin.functions";

export function CategoryArticlesPanel({ categoryId }: { categoryId: string }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const articlesQ = useQuery({
    queryKey: ["category-articles", categoryId, status, page],
    queryFn: () =>
      listCategoryArticles({
        data: { section_id: categoryId, status: status || null, page, pageSize: 20 },
      }),
  });

  if (articlesQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  const rows = articlesQ.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select className={cmsInput} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
          <Plus className="h-4 w-4" /> Add article
        </Link>
      </div>

      <CmsPanel>
        <DataTable
          columns={[
            { key: "title", header: "Article" },
            { key: "author", header: "Author" },
            { key: "status", header: "Status" },
            { key: "views", header: "Views", align: "right" },
            { key: "date", header: "Published" },
            { key: "actions", header: "", align: "right" },
          ]}
          empty={
            <CmsEmptyState
              title="No articles in this category"
              description="Assign articles or create a new story."
              action={
                <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                  Add article
                </Link>
              }
            />
          }
        >
          {rows.map((row) => (
            <DataTableRow key={row.id}>
              <DataTableCell>
                <Link to="/admin/articles/$id" params={{ id: row.id }} className="font-medium hover:text-primary">
                  {row.title}
                </Link>
              </DataTableCell>
              <DataTableCell className="text-muted-foreground">{row.authorName}</DataTableCell>
              <DataTableCell>
                <CmsStatus tone={row.status === "published" ? "success" : "neutral"}>{row.status}</CmsStatus>
              </DataTableCell>
              <DataTableCell align="right" className="text-muted-foreground">—</DataTableCell>
              <DataTableCell className="text-muted-foreground">
                {row.published_at ? new Date(row.published_at).toLocaleDateString() : "—"}
              </DataTableCell>
              <DataTableCell align="right">
                <Link to="/admin/articles/$id" params={{ id: row.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      </CmsPanel>
    </div>
  );
}

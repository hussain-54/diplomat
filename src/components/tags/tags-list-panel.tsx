import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteTag,
  getTagsSidebarWidgets,
  listTagsTable,
} from "@/lib/admin.functions";
import type { TagListFilters } from "@/lib/tag-types";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsGhostButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "@/components/cms/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TagsListPanel() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TagListFilters>({
    page: 1,
    pageSize: 20,
    sort: "name",
    sortDir: "asc",
    status: "all",
  });

  const tableQ = useQuery({
    queryKey: ["tags-table", filters],
    queryFn: () => listTagsTable({ data: filters }),
    staleTime: 10_000,
  });
  const widgetsQ = useQuery({
    queryKey: ["tags-sidebar-widgets"],
    queryFn: getTagsSidebarWidgets,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTag({ data: { id } }),
    onSuccess: () => {
      toast.success("Tag deleted");
      void qc.invalidateQueries({ queryKey: ["tags-table"] });
      void qc.invalidateQueries({ queryKey: ["tags-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["tags-library-counts"] });
      void qc.invalidateQueries({ queryKey: ["tags-sidebar-widgets"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (tableQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  const rows = tableQ.data?.items ?? [];
  const totalPages = tableQ.data?.totalPages ?? 1;
  const widgets = widgetsQ.data;

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title="All tags"
        description="Search, filter, and manage the newsroom tag library."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/tags/import-export" className={cmsSecondaryButton}>
              Import
            </Link>
            <Link to="/admin/tags/import-export" className={cmsSecondaryButton}>
              Export
            </Link>
            <Link to="/admin/tags/create" className={cmsButton}>
              Create Tag
            </Link>
          </div>
        }
      />

      {tableQ.error ? <CmsAlert>{tableQ.error.message}</CmsAlert> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4 min-w-0">
          <div className="sticky top-14 z-20 flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-background/95 p-3 backdrop-blur-sm">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Search tags
              </label>
              <input
                className={cmsInput}
                placeholder="Name or slug…"
                value={filters.search ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              />
            </div>
            <FilterSelect
              label="Status"
              value={filters.status ?? "all"}
              onChange={(v) =>
                setFilters((f) => ({ ...f, status: v as TagListFilters["status"], page: 1 }))
              }
              options={[
                { value: "all", label: "All" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Draft" },
                { value: "scheduled", label: "Scheduled" },
              ]}
            />
            <FilterSelect
              label="Language"
              value={filters.language ?? ""}
              onChange={(v) => setFilters((f) => ({ ...f, language: v || null, page: 1 }))}
              options={[
                { value: "", label: "Any" },
                { value: "en", label: "English" },
                { value: "ar", label: "Arabic" },
                { value: "fr", label: "French" },
              ]}
            />
            <FilterSelect
              label="SEO Score"
              value={filters.seo_min != null ? String(filters.seo_min) : ""}
              onChange={(v) =>
                setFilters((f) => ({ ...f, seo_min: v ? Number(v) : null, page: 1 }))
              }
              options={[
                { value: "", label: "Any" },
                { value: "70", label: "70+" },
                { value: "50", label: "50+" },
                { value: "90", label: "90+" },
              ]}
            />
            <FilterSelect
              label="AI Optimized"
              value={filters.ai_optimized === true ? "yes" : filters.ai_optimized === false ? "no" : ""}
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  ai_optimized: v === "yes" ? true : v === "no" ? false : null,
                  page: 1,
                }))
              }
              options={[
                { value: "", label: "Any" },
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                From
              </label>
              <input
                type="date"
                className={cmsInput}
                value={filters.date_from ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || null, page: 1 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                To
              </label>
              <input
                type="date"
                className={cmsInput}
                value={filters.date_to ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || null, page: 1 }))}
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <CmsEmptyState title="No tags found" description="Adjust filters or create a new tag." />
          ) : (
            <DataTable
              columns={[
                { key: "tag", header: "Tag" },
                { key: "articles", header: "Articles", align: "right" },
                { key: "volume", header: "Search Volume", align: "right", className: "hidden lg:table-cell" },
                { key: "traffic", header: "Traffic", align: "right", className: "hidden lg:table-cell" },
                { key: "seo", header: "SEO", align: "center" },
                { key: "ai", header: "AI", className: "hidden md:table-cell" },
                { key: "status", header: "Status" },
                { key: "updated", header: "Updated", className: "hidden md:table-cell" },
                { key: "actions", header: "Actions", align: "right", width: "48px" },
              ]}
            >
              {rows.map((row) => (
                  <DataTableRow key={row.id}>
                    <DataTableCell>
                      <Link
                        to="/admin/tags/$id"
                        params={{ id: row.id }}
                        className="font-medium hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">/{row.slug}</div>
                    </DataTableCell>
                    <DataTableCell className="tabular-nums text-right">{row.articles}</DataTableCell>
                    <DataTableCell className="hidden text-muted-foreground lg:table-cell text-right">—</DataTableCell>
                    <DataTableCell className="hidden text-muted-foreground lg:table-cell text-right">—</DataTableCell>
                    <DataTableCell className="text-center">
                      <CmsStatus tone={row.seo_score >= 70 ? "success" : row.seo_score >= 50 ? "warning" : "neutral"}>
                        {row.seo_score}
                      </CmsStatus>
                    </DataTableCell>
                    <DataTableCell className="hidden md:table-cell">
                      {row.ai_optimized ? "Yes" : "No"}
                    </DataTableCell>
                    <DataTableCell>
                      <CmsStatus
                        tone={
                          row.status === "published"
                            ? "success"
                            : row.status === "scheduled"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {row.status}
                      </CmsStatus>
                    </DataTableCell>
                    <DataTableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {new Date(row.updated_at).toLocaleDateString()}
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className={cmsGhostButton} aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate({ to: "/admin/tags/$id", params: { id: row.id } })}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate({ to: "/admin/tags/$id/edit", params: { id: row.id } })}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({ to: "/admin/tags/$id/analytics", params: { id: row.id } })
                            }
                          >
                            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (window.confirm(`Delete tag “${row.name}”?`)) remove.mutate(row.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DataTableCell>
                  </DataTableRow>
              ))}
            </DataTable>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {filters.page ?? 1} of {totalPages} · {tableQ.data?.total ?? 0} tags
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={cmsSecondaryButton}
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </button>
              <button
                type="button"
                className={cmsSecondaryButton}
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <CmsPanel title="Top tags by traffic">
            {(widgets?.topByTraffic.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {widgets?.topByTraffic.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <Link to="/admin/tags/$id" params={{ id: t.id }} className="hover:text-primary">
                      {t.name}
                    </Link>
                    <span className="tabular-nums text-muted-foreground">{t.articles}</span>
                  </li>
                ))}
              </ul>
            )}
          </CmsPanel>
          <CmsPanel title="Trending tags">
            {(widgets?.trending.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No trends this week.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {widgets?.trending.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <Link to="/admin/tags/$id" params={{ id: t.id }} className="hover:text-primary">
                      {t.name}
                    </Link>
                    <span className="tabular-nums text-emerald-600">+{t.growthPct}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CmsPanel>
          <CmsPanel title="SEO recommendations">
            {(widgets?.recommendations.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">All tags look healthy.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {widgets?.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </CmsPanel>
          <CmsPanel title="Quick stats">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="tabular-nums font-medium">{widgets?.quickStats.total ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Published</dt>
                <dd className="tabular-nums font-medium">{widgets?.quickStats.published ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Avg SEO</dt>
                <dd className="tabular-nums font-medium">{widgets?.quickStats.avgSeo ?? 0}</dd>
              </div>
            </dl>
          </CmsPanel>
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <select className={cmsInput} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

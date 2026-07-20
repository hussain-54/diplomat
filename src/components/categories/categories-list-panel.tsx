import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BarChart3,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  archiveCategory,
  bulkArchiveCategories,
  deleteCategory,
  duplicateCategory,
  listCategories,
  listCategoriesTable,
} from "@/lib/admin.functions";
import type { CategoryListFilters } from "@/lib/category-types";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
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
import { parentOptions } from "@/lib/taxonomy";

export function CategoriesListPanel() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CategoryListFilters>({
    page: 1,
    pageSize: 20,
    sort: "name",
    sortDir: "asc",
    status: "all",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const parentsQ = useQuery({ queryKey: ["categories-all"], queryFn: listCategories, staleTime: 60_000 });
  const tableQ = useQuery({
    queryKey: ["categories-table", filters],
    queryFn: () => listCategoriesTable({ data: filters }),
    staleTime: 10_000,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["categories-table"] });
    void qc.invalidateQueries({ queryKey: ["categories-all"] });
    void qc.invalidateQueries({ queryKey: ["categories-dashboard"] });
    void qc.invalidateQueries({ queryKey: ["categories-library-counts"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const dup = useMutation({
    mutationFn: (id: string) => duplicateCategory({ data: { id } }),
    onSuccess: (row) => {
      toast.success("Category duplicated");
      invalidate();
      if (row?.id) navigate({ to: "/admin/categories/$id/edit", params: { id: row.id } });
    },
    onError: (e) => toast.error(e.message),
  });
  const arch = useMutation({
    mutationFn: (id: string) => archiveCategory({ data: { id } }),
    onSuccess: () => {
      toast.success("Category archived");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const bulkArch = useMutation({
    mutationFn: (ids: string[]) => bulkArchiveCategories({ data: { ids } }),
    onSuccess: () => {
      toast.success("Categories archived");
      setSelected(new Set());
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const parentOpts = useMemo(
    () => parentOptions((parentsQ.data ?? []) as import("@/lib/taxonomy").TaxonomyCategory[]),
    [parentsQ.data],
  );

  if (tableQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  const rows = tableQ.data?.items ?? [];
  const totalPages = tableQ.data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title="All categories"
        description="Manage taxonomy, hierarchy, and publishing metadata."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/categories/import-export" className={cmsSecondaryButton}>
              Import
            </Link>
            <Link to="/admin/categories/import-export" className={cmsSecondaryButton}>
              Export
            </Link>
            <Link to="/admin/categories/create" className={cmsButton}>
              Add new category
            </Link>
          </div>
        }
      />

      {tableQ.error ? <CmsAlert>{tableQ.error.message}</CmsAlert> : null}

      <div className="sticky top-14 z-20 flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-background/95 p-3 backdrop-blur-sm">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Search
          </label>
          <input
            className={cmsInput}
            placeholder="Name or slug…"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <FilterSelect
          label="Parent"
          value={filters.parent_id ?? ""}
          onChange={(v) => setFilters((f) => ({ ...f, parent_id: v || undefined, page: 1 }))}
          options={[{ value: "", label: "All parents" }, ...parentOpts.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <FilterSelect
          label="Status"
          value={filters.status ?? "all"}
          onChange={(v) => setFilters((f) => ({ ...f, status: v as CategoryListFilters["status"], page: 1 }))}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "hidden", label: "Hidden" },
          ]}
        />
        <FilterSelect
          label="Google News"
          value={filters.news_eligible ? "yes" : ""}
          onChange={(v) => setFilters((f) => ({ ...f, news_eligible: v === "yes" ? true : null, page: 1 }))}
          options={[
            { value: "", label: "Any" },
            { value: "yes", label: "Eligible" },
          ]}
        />
        <FilterSelect
          label="Discover"
          value={filters.discover_eligible ? "yes" : ""}
          onChange={(v) => setFilters((f) => ({ ...f, discover_eligible: v === "yes" ? true : null, page: 1 }))}
          options={[
            { value: "", label: "Any" },
            { value: "yes", label: "Eligible" },
          ]}
        />
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button
            type="button"
            className={cmsGhostButton}
            onClick={() => bulkArch.mutate([...selected])}
          >
            Archive
          </button>
          <button type="button" className={cmsGhostButton} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <DataTable
        columns={[
          { key: "sel", header: "", width: "40px" },
          { key: "name", header: "Category", sortable: true, onSort: () => toggleSort(filters, setFilters, "name") },
          { key: "parent", header: "Parent" },
          { key: "level", header: "Level", align: "center" },
          { key: "articles", header: "Articles", align: "right", sortable: true, onSort: () => toggleSort(filters, setFilters, "articles") },
          { key: "views", header: "Views", align: "right" },
          { key: "seo", header: "SEO", align: "center", sortable: true, onSort: () => toggleSort(filters, setFilters, "seo") },
          { key: "indexed", header: "Indexed", align: "center" },
          { key: "news", header: "News", align: "center" },
          { key: "discover", header: "Discover", align: "center" },
          { key: "status", header: "Status" },
          { key: "actions", header: "", align: "right", width: "48px" },
        ]}
        empty={
          <CmsEmptyState
            title="No categories match"
            description="Adjust filters or create a new category."
            action={
              <Link to="/admin/categories/create" className={cmsButton}>
                Add category
              </Link>
            }
          />
        }
        footer={
          totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Page {filters.page} of {totalPages} · {tableQ.data?.total ?? 0} total
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={cmsGhostButton}
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={cmsGhostButton}
                  disabled={(filters.page ?? 1) >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {rows.map((row) => (
          <DataTableRow key={row.id}>
            <DataTableCell>
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={(e) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(row.id);
                    else next.delete(row.id);
                    return next;
                  });
                }}
              />
            </DataTableCell>
            <DataTableCell>
              <div className="flex items-center gap-2">
                {row.color ? (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                ) : null}
                <Link
                  to="/admin/categories/$id"
                  params={{ id: row.id }}
                  className="font-medium hover:text-primary"
                >
                  {row.name}
                </Link>
                {row.featured ? (
                  <span className="text-[10px] font-semibold text-cat-amber">Featured</span>
                ) : null}
              </div>
            </DataTableCell>
            <DataTableCell className="text-muted-foreground">{row.parentName}</DataTableCell>
            <DataTableCell align="center">{row.level}</DataTableCell>
            <DataTableCell align="right" className="tabular-nums">
              {row.articles}
            </DataTableCell>
            <DataTableCell align="right" className="text-muted-foreground">
              —
            </DataTableCell>
            <DataTableCell align="center">
              <CmsStatus tone={(row.seo_score ?? 0) >= 70 ? "success" : "neutral"}>
                {row.seo_score ?? 0}
              </CmsStatus>
            </DataTableCell>
            <DataTableCell align="center">{row.indexed ? "Yes" : "No"}</DataTableCell>
            <DataTableCell align="center">{row.news_eligible ? "Yes" : "—"}</DataTableCell>
            <DataTableCell align="center">{row.discover_eligible ? "Yes" : "—"}</DataTableCell>
            <DataTableCell>
              <CmsStatus tone={row.visibility === "public" ? "success" : "neutral"}>
                {row.visibility === "public" ? "Active" : "Hidden"}
              </CmsStatus>
            </DataTableCell>
            <DataTableCell align="right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={cmsGhostButton} aria-label="Actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/admin/categories/$id" params={{ id: row.id }}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/categories/$id/edit" params={{ id: row.id }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/categories/$id/analytics" params={{ id: row.id }}>
                      <BarChart3 className="h-3.5 w-3.5" /> Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => dup.mutate(row.id)}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => arch.mutate(row.id)}>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-cat-rose"
                    onSelect={() => {
                      if (window.confirm(`Delete "${row.name}"?`)) remove.mutate(row.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
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
    <div className="min-w-[120px]">
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

function toggleSort(
  filters: CategoryListFilters,
  setFilters: React.Dispatch<React.SetStateAction<CategoryListFilters>>,
  field: CategoryListFilters["sort"],
) {
  setFilters((f) => ({
    ...f,
    sort: field,
    sortDir: f.sort === field && f.sortDir === "asc" ? "desc" : "asc",
    page: 1,
  }));
}

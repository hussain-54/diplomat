import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Copy,
  Eye,
  History,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ArticlesAdvancedFilters } from "@/components/articles/articles-advanced-filters";
import {
  DEFAULT_ARTICLES_FILTERS,
  isArticlesFilterActive,
  matchesArticlesFilters,
  type ArticlesFilterState,
} from "@/components/articles/articles-filters";
import {
  ARTICLES_LIBRARY_TABS,
  matchesLibraryTab,
} from "@/components/articles/library-tabs";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPanel,
  CmsPagination,
  CmsStatus,
  CmsTableSkeleton,
  DataTable,
  DataTableCell,
  DataTableEmpty,
  DataTableRow,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import {
  bulkManageArticles,
  duplicateArticle,
  getArticleViewTotals,
  getArticlesLibraryCounts,
  getMe,
  listAdminArticles,
  listTags,
  type ArticlesLibraryTab,
} from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ArticleStatus = Database["public"]["Enums"]["article_status"];
type BulkAction = "publish" | "archive" | "delete" | "reassign_category";

const PAGE_SIZE = 25;

const ARTICLE_COLUMNS = [
  { key: "select", header: "", width: "48px" },
  { key: "article", header: "Article" },
  { key: "author", header: "Author", width: "140px" },
  { key: "category", header: "Category", width: "140px" },
  { key: "status", header: "Status", width: "120px" },
  { key: "updated", header: "Updated", width: "160px" },
  { key: "actions", header: "Actions", align: "right" as const, width: "200px" },
];

export function ArticlesListPanel({
  title,
  description,
  eyebrow = "Articles",
  lockedStatus,
  badgeFilter,
  libraryMode = false,
  libraryTab = "all",
  onLibraryTabChange,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  lockedStatus?: ArticleStatus;
  badgeFilter?: Database["public"]["Enums"]["badge_type"];
  libraryMode?: boolean;
  libraryTab?: ArticlesLibraryTab;
  onLibraryTabChange?: (tab: ArticlesLibraryTab) => void;
}) {
  const queryClient = useQueryClient();
  const articles = useQuery({ queryKey: ["admin-articles"], queryFn: listAdminArticles });
  const views = useQuery({
    queryKey: ["article-view-totals"],
    queryFn: getArticleViewTotals,
    staleTime: 60_000,
  });
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags, staleTime: 60_000 });
  const counts = useQuery({
    queryKey: ["articles-library-counts"],
    queryFn: getArticlesLibraryCounts,
    enabled: libraryMode,
    staleTime: 20_000,
  });
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const sections = useQuery({
    queryKey: ["sections", "editorial"],
    queryFn: () => getSections({ includeHidden: true }),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState<ArticlesFilterState>(() => ({
    ...DEFAULT_ARTICLES_FILTERS,
    status: lockedStatus ?? "all",
  }));
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (lockedStatus) {
      setFilters((current) => ({ ...current, status: lockedStatus }));
    }
  }, [lockedStatus]);

  const refresh = () => {
    setSelected([]);
    void queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
    void queryClient.invalidateQueries({ queryKey: ["articles-library-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["article-view-totals"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-articles"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    void queryClient.invalidateQueries({ queryKey: ["articles-dashboard"] });
  };

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateArticle({ data: { id } }),
    onSuccess: refresh,
  });
  const bulk = useMutation({
    mutationFn: (value: {
      ids: string[];
      action: BulkAction;
      section_id?: string | null;
    }) => bulkManageArticles({ data: value }),
    onSuccess: refresh,
  });

  const roles = me.data?.roles;
  const canCreate = hasPermission(roles, "articles:create");
  const canPublish = hasPermission(roles, "articles:publish");
  const canDelete = hasPermission(roles, "articles:delete");
  const canReassign = hasPermission(roles, "articles:edit_all");
  const showStatusFilter = !lockedStatus && !(libraryMode && libraryTab !== "all");
  const ignoreStatusInFilters = Boolean(lockedStatus) || (libraryMode && libraryTab !== "all");

  const authorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const article of articles.data ?? []) {
      if (article.author_id) {
        map.set(article.author_id, authorName(article.author) || "Unnamed author");
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [articles.data]);

  const filtered = useMemo(() => {
    const viewTotals = views.data ?? {};
    return (articles.data ?? []).filter((article) => {
      if (libraryMode && !matchesLibraryTab(article, libraryTab)) return false;
      if (badgeFilter && article.badge_type !== badgeFilter) return false;
      if (lockedStatus && article.status !== lockedStatus) return false;
      return matchesArticlesFilters(
        article,
        filters,
        viewTotals[article.id] ?? 0,
        { ignoreStatus: ignoreStatusInFilters },
      );
    });
  }, [
    articles.data,
    badgeFilter,
    filters,
    ignoreStatusInFilters,
    libraryMode,
    libraryTab,
    lockedStatus,
    views.data,
  ]);

  useEffect(() => {
    setPage(1);
  }, [filters, lockedStatus, badgeFilter, libraryTab]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((article) => selected.includes(article.id));
  const error =
    articles.error ??
    me.error ??
    sections.error ??
    tags.error ??
    views.error ??
    duplicate.error ??
    bulk.error ??
    counts.error;
  const hasFilters = isArticlesFilterActive(filters, { ignoreStatus: ignoreStatusInFilters });

  const runBulk = (
    action: Exclude<BulkAction, "reassign_category">,
    ids = selected,
  ) => {
    if (!ids.length) return;
    const label = action === "delete" ? "permanently delete" : action;
    if (window.confirm(`${label[0].toUpperCase()}${label.slice(1)} ${ids.length} selected article(s)?`)) {
      bulk.mutate({ ids, action });
    }
  };

  const resetFilters = () => {
    setFilters({
      ...DEFAULT_ARTICLES_FILTERS,
      status: lockedStatus ?? "all",
    });
  };

  const tabCounts = counts.data;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          canCreate ? (
            <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
              <Plus className="h-4 w-4" /> Create article
            </Link>
          ) : null
        }
      />

      {error ? <CmsAlert>{error.message}</CmsAlert> : null}

      {libraryMode ? (
        <div className="overflow-x-auto border border-border bg-card">
          <div
            className="flex min-w-max gap-0 border-b border-border"
            role="tablist"
            aria-label="Article library tabs"
          >
            {ARTICLES_LIBRARY_TABS.map((tab) => {
              const active = libraryTab === tab.id;
              const count = tabCounts?.[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onLibraryTabChange?.(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold cms-transition",
                    active
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "cms-metric rounded-sm px-1.5 py-0.5 text-[11px] font-semibold",
                      active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count == null ? "—" : count.toLocaleString()}
                  </span>
                  {active ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gold" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <CmsPanel>
        <ArticlesAdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={resetFilters}
          authors={authorOptions}
          categories={(sections.data ?? []).map((section) => ({
            id: section.id,
            name: section.name,
          }))}
          tags={(tags.data ?? []).map((tag) => ({ id: tag.id, name: tag.name }))}
          showStatus={showStatusFilter}
        />

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
            <span className="mr-2 cms-metric text-xs font-semibold">{selected.length} selected</span>
            {canPublish ? (
              <>
                <button
                  type="button"
                  className={cmsSecondaryButton}
                  onClick={() => runBulk("publish")}
                  disabled={bulk.isPending}
                >
                  <Send className="h-3.5 w-3.5" /> Publish
                </button>
                <button
                  type="button"
                  className={cmsSecondaryButton}
                  onClick={() => runBulk("archive")}
                  disabled={bulk.isPending}
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className={cmsSecondaryButton}
                onClick={() => runBulk("delete")}
                disabled={bulk.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : null}
            {canReassign ? (
              <select
                className={`${cmsInput} w-auto min-w-48`}
                value=""
                disabled={bulk.isPending}
                onChange={(event) => {
                  if (!event.target.value) return;
                  bulk.mutate({
                    ids: selected,
                    action: "reassign_category",
                    section_id: event.target.value,
                  });
                }}
              >
                <option value="">Reassign category…</option>
                {(sections.data ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ) : null}

        {articles.isLoading ? (
          <CmsTableSkeleton rows={8} cols={6} />
        ) : (
          <DataTable
            columns={ARTICLE_COLUMNS}
            minWidth="1080px"
            footer={
              <CmsPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
              />
            }
          >
            {!pageRows.length ? (
              <DataTableEmpty
                colSpan={ARTICLE_COLUMNS.length}
                title="No matching articles"
                description={
                  hasFilters
                    ? "No articles match these filters. Clear filters or try a preset."
                    : "Adjust the filters or create a new article."
                }
                action={
                  canCreate ? (
                    <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                      <Plus className="h-4 w-4" /> Create article
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <>
                <DataTableRow className="bg-muted/20 hover:bg-muted/20">
                  <DataTableCell>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...new Set([...selected, ...pageRows.map((article) => article.id)])]
                            : selected.filter((id) => !pageRows.some((article) => article.id === id)),
                        )
                      }
                      aria-label="Select all visible articles"
                    />
                  </DataTableCell>
                  <DataTableCell colSpan={ARTICLE_COLUMNS.length - 1}>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {filtered.length} matching · page {page}
                      {bulk.isPending ? " · Applying bulk action…" : ""}
                    </span>
                  </DataTableCell>
                </DataTableRow>
                {pageRows.map((article) => (
                  <DataTableRow key={article.id} selected={selected.includes(article.id)}>
                    <DataTableCell>
                      <input
                        type="checkbox"
                        checked={selected.includes(article.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, article.id]
                              : current.filter((id) => id !== article.id),
                          )
                        }
                        aria-label={`Select ${article.title}`}
                      />
                    </DataTableCell>
                    <DataTableCell className="max-w-md">
                      <Link
                        to="/admin/articles/$id"
                        params={{ id: article.id }}
                        className="block truncate font-semibold text-foreground cms-transition hover:text-cat-blue"
                      >
                        {article.title}
                      </Link>
                      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        /article/{article.slug}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-xs text-muted-foreground">
                      {authorName(article.author) || "Unknown"}
                    </DataTableCell>
                    <DataTableCell className="text-xs text-muted-foreground">
                      {sectionName(article.sections)}
                    </DataTableCell>
                    <DataTableCell>
                      <CmsStatus tone={statusTone(article.status)}>
                        {statusLabel(article.status)}
                      </CmsStatus>
                      {article.status === "scheduled" && article.scheduled_at ? (
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {new Date(article.scheduled_at).toLocaleString()}
                        </div>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell mono className="text-xs text-muted-foreground">
                      {new Date(article.updated_at).toLocaleString()}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex justify-end gap-0.5">
                        <Link
                          to="/admin/articles/$id"
                          params={{ id: article.id }}
                          className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground"
                          title="Edit article"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/admin/articles/revisions/$articleId"
                          params={{ articleId: article.id }}
                          className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground"
                          title="Revision history"
                        >
                          <History className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/admin/articles/preview/$articleId"
                          params={{ articleId: article.id }}
                          className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canCreate ? (
                          <button
                            type="button"
                            className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground"
                            onClick={() => duplicate.mutate(article.id)}
                            title="Duplicate article"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canPublish && article.status !== "published" ? (
                          <button
                            type="button"
                            className="p-2 text-muted-foreground cms-transition hover:bg-cat-green/10 hover:text-cat-green"
                            onClick={() => runBulk("publish", [article.id])}
                            title="Publish article"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canPublish && article.status !== "archived" ? (
                          <button
                            type="button"
                            className="p-2 text-muted-foreground cms-transition hover:bg-gold/10 hover:text-gold"
                            onClick={() => runBulk("archive", [article.id])}
                            title="Archive article"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="p-2 text-muted-foreground cms-transition hover:bg-crimson/10 hover:text-crimson"
                            onClick={() => runBulk("delete", [article.id])}
                            title="Delete article"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </>
            )}
          </DataTable>
        )}
      </CmsPanel>
    </div>
  );
}

function authorName(author: { name?: string | null } | { name?: string | null }[] | null) {
  return Array.isArray(author) ? author[0]?.name : author?.name;
}

function sectionName(section: { name?: string } | { name?: string }[] | null) {
  return (Array.isArray(section) ? section[0]?.name : section?.name) ?? "Unassigned";
}

function statusLabel(status: ArticleStatus) {
  if (status === "review") return "In Review";
  return status[0].toUpperCase() + status.slice(1);
}

function statusTone(status: ArticleStatus): "neutral" | "warning" | "info" | "success" | "danger" {
  if (status === "published") return "success";
  if (status === "review") return "warning";
  if (status === "scheduled") return "info";
  if (status === "archived") return "danger";
  return "neutral";
}

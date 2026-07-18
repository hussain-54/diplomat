import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronDown,
  Columns3,
  Download,
  Eye,
  ImageIcon,
  Pencil,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArticlesAdvancedFilters } from "@/components/articles/articles-advanced-filters";
import { ArticleInspector } from "@/components/articles/article-inspector";
import {
  CategoryPill,
  TagOverflow,
} from "@/components/articles/articles-ui-bits";
import {
  DEFAULT_ARTICLES_FILTERS,
  computeArticleSeoScore,
  isArticlesFilterActive,
  matchesArticlesFilters,
  type ArticlesFilterState,
} from "@/components/articles/articles-filters";
import { matchesLibraryTab } from "@/components/articles/library-tabs";
import {
  ARTICLES_TABLE_COLUMNS,
  computeArticleContentScore,
  downloadCsv,
  loadColumnVisibility,
  parseCsv,
  saveColumnVisibility,
  scoreTone,
  type ArticlesSortKey,
  type ArticlesTableColumnKey,
} from "@/components/articles/articles-table";
import {
  CmsAlert,
  CmsPagination,
  CmsStatus,
  CmsTableSkeleton,
  DataTable,
  DataTableCell,
  DataTableEmpty,
  DataTableRow,
  cmsButton,
  cmsGhostButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  bulkManageArticles,
  duplicateArticle,
  getArticleCommentCounts,
  getArticleViewTotals,
  getMe,
  importArticlesCsv,
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
type AdminArticle = Awaited<ReturnType<typeof listAdminArticles>>[number];

const PAGE_SIZE = 25;

export function ArticlesListPanel({
  title,
  description = "",
  lockedStatus,
  badgeFilter,
  libraryMode = false,
  libraryTab = "all",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  lockedStatus?: ArticleStatus;
  badgeFilter?: Database["public"]["Enums"]["badge_type"];
  libraryMode?: boolean;
  libraryTab?: ArticlesLibraryTab;
  onLibraryTabChange?: (tab: ArticlesLibraryTab) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const articles = useQuery({ queryKey: ["admin-articles"], queryFn: listAdminArticles });
  const views = useQuery({
    queryKey: ["article-view-totals"],
    queryFn: getArticleViewTotals,
    staleTime: 60_000,
  });
  const comments = useQuery({
    queryKey: ["article-comment-counts"],
    queryFn: getArticleCommentCounts,
    staleTime: 60_000,
  });
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags, staleTime: 60_000 });
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
  const [sortKey, setSortKey] = useState<ArticlesSortKey>("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibility, setVisibility] = useState(loadColumnVisibility);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

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
    void queryClient.invalidateQueries({ queryKey: ["article-comment-counts"] });
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
  const importer = useMutation({
    mutationFn: importArticlesCsv,
    onSuccess: (result) => {
      refresh();
      const extra = result.errors.length ? ` ${result.errors.slice(0, 3).join(" ")}` : "";
      setImportMessage(`Imported ${result.created} draft(s).${extra}`);
    },
    onError: (error: Error) => setImportMessage(error.message),
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

  const enriched = useMemo(() => {
    const viewTotals = views.data ?? {};
    const commentTotals = comments.data ?? {};
    return (articles.data ?? []).map((article) => {
      const seo = computeArticleSeoScore(article);
      const content = computeArticleContentScore(article);
      return {
        ...article,
        views: viewTotals[article.id] ?? 0,
        comments: commentTotals[article.id] ?? 0,
        seoScore: seo,
        contentScore: content,
      };
    });
  }, [articles.data, comments.data, views.data]);

  const filtered = useMemo(() => {
    return enriched.filter((article) => {
      if (libraryMode && !matchesLibraryTab(article, libraryTab)) return false;
      if (badgeFilter && article.badge_type !== badgeFilter) return false;
      if (lockedStatus && article.status !== lockedStatus) return false;
      return matchesArticlesFilters(article, filters, article.views, {
        ignoreStatus: ignoreStatusInFilters,
      });
    });
  }, [
    badgeFilter,
    enriched,
    filters,
    ignoreStatusInFilters,
    libraryMode,
    libraryTab,
    lockedStatus,
  ]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const direction = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const value = (article: (typeof rows)[number]) => {
        switch (sortKey) {
          case "title":
            return article.title.toLowerCase();
          case "author":
            return (authorName(article.author) || "").toLowerCase();
          case "category":
            return sectionName(article.sections).toLowerCase();
          case "seo":
            return article.seoScore;
          case "content":
            return article.contentScore;
          case "views":
            return article.views;
          case "comments":
            return article.comments;
          case "status":
            return article.status;
          case "updated":
          default:
            return new Date(article.updated_at).getTime();
        }
      };
      const left = value(a);
      const right = value(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
      return String(left).localeCompare(String(right)) * direction;
    });
    return rows;
  }, [filtered, sortDir, sortKey]);

  useEffect(() => {
    setPage(1);
  }, [filters, lockedStatus, badgeFilter, libraryTab, sortKey, sortDir]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [page, sorted]);

  const visibleColumns = ARTICLES_TABLE_COLUMNS.filter((column) => visibility[column.key]);
  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((article) => selected.includes(article.id));
  const error =
    articles.error ??
    me.error ??
    sections.error ??
    tags.error ??
    views.error ??
    comments.error ??
    duplicate.error ??
    bulk.error ??
    importer.error;
  const hasFilters = isArticlesFilterActive(filters, { ignoreStatus: ignoreStatusInFilters });

  const toggleSort = (key: ArticlesSortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "title" || key === "author" || key === "category" ? "asc" : "desc");
  };

  const setColumnVisible = (key: ArticlesTableColumnKey, visible: boolean) => {
    setVisibility((current) => {
      const next = { ...current, [key]: visible, select: true, title: true, actions: true };
      saveColumnVisibility(next);
      return next;
    });
  };

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

  const exportRows = () => {
    const source = selected.length
      ? sorted.filter((article) => selected.includes(article.id))
      : sorted;
    downloadCsv("articles-export.csv", [
      ["id", "title", "slug", "author", "category", "tags", "seo_score", "content_score", "views", "comments", "status", "updated_at"],
      ...source.map((article) => [
        article.id,
        article.title,
        article.slug,
        authorName(article.author) || "",
        sectionName(article.sections),
        (article.tags ?? []).map((tag) => tag.name).join("|"),
        String(article.seoScore),
        String(article.contentScore),
        String(article.views),
        String(article.comments),
        article.status,
        article.updated_at,
      ]),
    ]);
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const matrix = parseCsv(text);
    if (!matrix.length) {
      setImportMessage("CSV is empty.");
      return;
    }
    const [header, ...body] = matrix;
    const index = Object.fromEntries(
      header.map((cell, i) => [cell.trim().toLowerCase(), i]),
    );
    const titleIdx = index.title ?? index.headline ?? 0;
    const rows = body.map((row) => ({
      title: row[titleIdx] ?? "",
      slug: index.slug != null ? row[index.slug] : undefined,
      deck: index.deck != null ? row[index.deck] : index.subtitle != null ? row[index.subtitle] : undefined,
      section:
        index.section != null
          ? row[index.section]
          : index.category != null
            ? row[index.category]
            : undefined,
    }));
    importer.mutate({ data: { rows } });
  };

  const sortProps = (key: ArticlesSortKey) => ({
    sortable: true as const,
    sortDirection: (sortKey === key ? sortDir : false) as "asc" | "desc" | false,
    onSort: () => toggleSort(key),
  });

  const tableColumns = visibleColumns.map((column) => {
    switch (column.key) {
      case "select":
        return { key: column.key, header: "", width: "48px" };
      case "thumbnail":
        return { key: column.key, header: "Thumb", width: "72px" };
      case "title":
        return { key: column.key, header: "Title", ...sortProps("title") };
      case "author":
        return { key: column.key, header: "Author", width: "130px", ...sortProps("author") };
      case "category":
        return { key: column.key, header: "Category", width: "120px", ...sortProps("category") };
      case "tags":
        return { key: column.key, header: "Tags", width: "160px" };
      case "seo":
        return { key: column.key, header: "SEO", width: "88px", align: "right" as const, ...sortProps("seo") };
      case "content":
        return {
          key: column.key,
          header: "Content",
          width: "96px",
          align: "right" as const,
          ...sortProps("content"),
        };
      case "views":
        return {
          key: column.key,
          header: "Views",
          width: "88px",
          align: "right" as const,
          ...sortProps("views"),
        };
      case "comments":
        return {
          key: column.key,
          header: "Comments",
          width: "100px",
          align: "right" as const,
          ...sortProps("comments"),
        };
      case "status":
        return { key: column.key, header: "Status", width: "120px", ...sortProps("status") };
      case "updated":
        return { key: column.key, header: "Updated", width: "150px", ...sortProps("updated") };
      case "actions":
        return { key: column.key, header: "", align: "right" as const, width: "88px" };
      default:
        return { key: column.key, header: column.label };
    }
  });

  const inspectSeed = useMemo(
    () => sorted.find((article) => article.id === inspectId) ?? null,
    [inspectId, sorted],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {error ? <CmsAlert>{error.message}</CmsAlert> : null}
      {importMessage ? <CmsAlert>{importMessage}</CmsAlert> : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 gap-y-3">
          <div className="min-w-0 flex-1">
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
          </div>

          <div className="relative flex shrink-0 items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cmsSecondaryButton}>
                  Actions <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => exportRows()}>
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </DropdownMenuItem>
                {canCreate ? (
                  <DropdownMenuItem
                    disabled={importer.isPending}
                    onSelect={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Import CSV
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => setColumnsOpen(true)}>
                  <Columns3 className="h-3.5 w-3.5" /> Manage columns
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {columnsOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 border border-border bg-card p-3 shadow-md">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Column visibility
                </div>
                <div className="space-y-2">
                  {ARTICLES_TABLE_COLUMNS.filter((column) => column.hideable).map((column) => (
                    <label key={column.key} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={visibility[column.key]}
                        onChange={(event) => setColumnVisible(column.key, event.target.checked)}
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${cmsGhostButton} mt-3 w-full justify-center`}
                  onClick={() => setColumnsOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : null}

            <span className="text-xs text-muted-foreground">
              {sorted.length.toLocaleString()} articles
            </span>
          </div>

          {canCreate ? (
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImportFile(file);
                event.target.value = "";
              }}
            />
          ) : null}
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-sm bg-muted/30 px-3 py-2">
            <span className="mr-1 text-xs text-muted-foreground">
              {selected.length} selected
              {bulk.isPending ? " · Applying…" : ""}
            </span>
            {canPublish ? (
              <>
                <button
                  type="button"
                  className={cmsGhostButton}
                  onClick={() => runBulk("publish")}
                  disabled={bulk.isPending}
                >
                  <Send className="h-3.5 w-3.5" /> Publish
                </button>
                <button
                  type="button"
                  className={cmsGhostButton}
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
                className={cmsGhostButton}
                onClick={() => runBulk("delete")}
                disabled={bulk.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : null}
            {canReassign ? (
              <select
                className={`${cmsInput} h-8 w-auto min-w-44 text-xs`}
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
          <CmsTableSkeleton rows={8} cols={8} />
        ) : (
          <DataTable
            columns={tableColumns}
            minWidth="1100px"
            stickyHeader
            className="border-t border-border/50"
            footer={
              <CmsPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={sorted.length}
                onPageChange={setPage}
              />
            }
          >
            {!pageRows.length ? (
              <DataTableEmpty
                colSpan={tableColumns.length}
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
                <DataTableRow className="bg-transparent hover:bg-transparent">
                  {visibility.select ? (
                    <DataTableCell>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...new Set([...selected, ...pageRows.map((article) => article.id)])]
                              : selected.filter(
                                  (id) => !pageRows.some((article) => article.id === id),
                                ),
                          )
                        }
                        aria-label="Select all visible articles"
                      />
                    </DataTableCell>
                  ) : null}
                  <DataTableCell colSpan={Math.max(tableColumns.length - (visibility.select ? 1 : 0), 1)}>
                    <span className="text-[11px] text-muted-foreground">
                      Page {page}
                      {bulk.isPending ? " · Applying bulk action…" : ""}
                    </span>
                  </DataTableCell>
                </DataTableRow>
                {pageRows.map((article) => (
                  <ArticleTableRow
                    key={article.id}
                    article={article}
                    visibility={visibility}
                    selected={selected.includes(article.id)}
                    inspecting={inspectId === article.id}
                    onSelect={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, article.id]
                          : current.filter((id) => id !== article.id),
                      )
                    }
                    onInspect={() => setInspectId(article.id)}
                  />
                ))}
              </>
            )}
          </DataTable>
        )}
      </div>

      <ArticleInspector
        articleId={inspectId}
        seed={inspectSeed}
        open={Boolean(inspectId)}
        onOpenChange={(open) => {
          if (!open) setInspectId(null);
        }}
        canCreate={canCreate}
        canPublish={canPublish}
        onDuplicate={() => {
          if (inspectId) duplicate.mutate(inspectId);
        }}
        onArchive={() => {
          if (inspectId) runBulk("archive", [inspectId]);
        }}
      />
    </div>
  );
}

function ArticleTableRow({
  article,
  visibility,
  selected,
  inspecting,
  onSelect,
  onInspect,
}: {
  article: AdminArticle & {
    views: number;
    comments: number;
    seoScore: number;
    contentScore: number;
    tags?: Array<{ id: string; name: string; slug: string }>;
    hero_image_url?: string | null;
  };
  visibility: Record<ArticlesTableColumnKey, boolean>;
  selected: boolean;
  inspecting: boolean;
  onSelect: (checked: boolean) => void;
  onInspect: () => void;
}) {
  return (
    <DataTableRow
      selected={selected || inspecting}
      onClick={onInspect}
      className={cn(
        "hover:bg-muted/40",
        inspecting && "bg-muted/50",
        selected && !inspecting && "bg-muted/30",
      )}
    >
      {visibility.select ? (
        <DataTableCell>
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onSelect(event.target.checked)}
            aria-label={`Select ${article.title}`}
          />
        </DataTableCell>
      ) : null}
      {visibility.thumbnail ? (
        <DataTableCell>
          {article.hero_image_url ? (
            <img
              src={article.hero_image_url}
              alt=""
              className="h-10 w-14 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-10 w-14 items-center justify-center bg-muted/60 text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
            </div>
          )}
        </DataTableCell>
      ) : null}
      {visibility.title ? (
        <DataTableCell className="max-w-sm">
          <Link
            to="/admin/articles/$id"
            params={{ id: article.id }}
            className="block truncate font-medium text-foreground cms-transition hover:text-cat-blue"
            onClick={(event) => event.stopPropagation()}
          >
            {article.title}
          </Link>
          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            /article/{article.slug}
          </div>
        </DataTableCell>
      ) : null}
      {visibility.author ? (
        <DataTableCell className="text-xs text-muted-foreground">
          {authorName(article.author) || "Unknown"}
        </DataTableCell>
      ) : null}
      {visibility.category ? (
        <DataTableCell>
          <CategoryPill name={sectionName(article.sections)} />
        </DataTableCell>
      ) : null}
      {visibility.tags ? (
        <DataTableCell>
          <TagOverflow tags={article.tags ?? []} max={2} />
        </DataTableCell>
      ) : null}
      {visibility.seo ? (
        <DataTableCell align="right">
          <CmsStatus tone={scoreTone(article.seoScore)}>{article.seoScore}</CmsStatus>
        </DataTableCell>
      ) : null}
      {visibility.content ? (
        <DataTableCell align="right">
          <CmsStatus tone={scoreTone(article.contentScore)}>{article.contentScore}</CmsStatus>
        </DataTableCell>
      ) : null}
      {visibility.views ? (
        <DataTableCell align="right" mono className="text-xs">
          {article.views.toLocaleString()}
        </DataTableCell>
      ) : null}
      {visibility.comments ? (
        <DataTableCell align="right" mono className="text-xs">
          {article.comments.toLocaleString()}
        </DataTableCell>
      ) : null}
      {visibility.status ? (
        <DataTableCell>
          <CmsStatus tone={statusTone(article.status)} status={article.status}>
            {statusLabel(article.status)}
          </CmsStatus>
          {article.status === "scheduled" && article.scheduled_at ? (
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {new Date(article.scheduled_at).toLocaleString()}
            </div>
          ) : null}
        </DataTableCell>
      ) : null}
      {visibility.updated ? (
        <DataTableCell mono className="text-xs text-muted-foreground">
          {new Date(article.updated_at).toLocaleString()}
        </DataTableCell>
      ) : null}
      {visibility.actions ? (
        <DataTableCell align="right">
          <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
            <Link
              to="/admin/articles/$id"
              params={{ id: article.id }}
              className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground"
              title="Edit article"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <Link
              to="/admin/articles/preview/$articleId"
              params={{ articleId: article.id }}
              className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </div>
        </DataTableCell>
      ) : null}
    </DataTableRow>
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

function statusTone(
  status: ArticleStatus,
): "neutral" | "warning" | "info" | "success" | "danger" | "accent" {
  if (status === "published") return "success";
  if (status === "review") return "warning";
  if (status === "scheduled") return "info";
  if (status === "archived") return "accent";
  return "neutral";
}

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  ImageIcon,
  Pencil,
} from "lucide-react";
import {
  ARTICLE_LANGUAGES,
  computeArticleSeoScore,
} from "@/components/articles/articles-filters";
import {
  computeArticleContentScore,
  scoreTone,
} from "@/components/articles/articles-table";
import {
  CmsStatus,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminArticle,
  getArticleCommentCounts,
  getArticleTags,
  getArticleViewTotals,
} from "@/lib/admin.functions";
import { blocksToPlainText, parseBody } from "@/lib/blocks";
import { absoluteUrl } from "@/lib/seo";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type ArticleStatus = Database["public"]["Enums"]["article_status"];
type InspectorSection = "overview" | "seo" | "analytics" | "social" | "workflow";

type ListArticle = {
  id: string;
  slug: string;
  title: string;
  deck?: string | null;
  status: ArticleStatus;
  badge_type?: string;
  hero_image_url?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  updated_at: string;
  language?: string | null;
  google_news?: boolean | null;
  google_discover?: boolean | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  robots_index?: boolean | null;
  author?: { name?: string | null } | { name?: string | null }[] | null;
  sections?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
  views?: number;
  comments?: number;
  seoScore?: number;
  contentScore?: number;
};

const WORKFLOW_STAGE: Record<ArticleStatus, string> = {
  draft: "Draft",
  review: "Editor Review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const SECTIONS: Array<{ id: InspectorSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "seo", label: "SEO" },
  { id: "analytics", label: "Analytics" },
  { id: "social", label: "Social" },
  { id: "workflow", label: "Workflow" },
];

export function ArticleInspector({
  articleId,
  seed,
  open,
  onOpenChange,
  canCreate,
  canPublish,
  onDuplicate,
  onArchive,
}: {
  articleId: string | null;
  seed?: ListArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate?: boolean;
  canPublish?: boolean;
  onDuplicate?: () => void;
  onArchive?: () => void;
}) {
  const [section, setSection] = useState<InspectorSection>("overview");

  useEffect(() => {
    if (open) setSection("overview");
  }, [open, articleId]);

  const detail = useQuery({
    queryKey: ["admin-article", articleId],
    queryFn: () => getAdminArticle({ data: { id: articleId! } }),
    enabled: open && Boolean(articleId),
    staleTime: 15_000,
  });
  const tags = useQuery({
    queryKey: ["article-tags", articleId],
    queryFn: () => getArticleTags({ data: { article_id: articleId! } }),
    enabled: open && Boolean(articleId),
    staleTime: 30_000,
  });
  const views = useQuery({
    queryKey: ["article-view-totals"],
    queryFn: getArticleViewTotals,
    enabled: open,
    staleTime: 60_000,
  });
  const comments = useQuery({
    queryKey: ["article-comment-counts"],
    queryFn: getArticleCommentCounts,
    enabled: open,
    staleTime: 60_000,
  });

  const loading = open && Boolean(articleId) && detail.isLoading && !seed;
  const full = detail.data;
  const article: ListArticle | null = seed
    ? {
        ...seed,
        ...(full
          ? {
              title: full.title,
              slug: full.slug,
              deck: full.deck,
              status: full.status,
              badge_type: full.badge_type,
              hero_image_url: full.hero_image_url,
              published_at: full.published_at,
              scheduled_at: full.scheduled_at,
              updated_at: full.updated_at,
              language: full.language ?? seed.language,
              google_news: full.google_news ?? seed.google_news,
              google_discover: full.google_discover ?? seed.google_discover,
              seo_title: full.seo_title,
              meta_description: full.meta_description,
              focus_keyword: full.focus_keyword,
              robots_index: full.robots_index,
              author: full.author ?? seed.author,
            }
          : null),
      }
    : full
      ? {
          id: full.id,
          slug: full.slug,
          title: full.title,
          deck: full.deck,
          status: full.status,
          badge_type: full.badge_type,
          hero_image_url: full.hero_image_url,
          published_at: full.published_at,
          scheduled_at: full.scheduled_at,
          updated_at: full.updated_at,
          language: full.language,
          google_news: full.google_news,
          google_discover: full.google_discover,
          seo_title: full.seo_title,
          meta_description: full.meta_description,
          focus_keyword: full.focus_keyword,
          robots_index: full.robots_index,
          author: full.author,
        }
      : null;

  const plain = full?.body ? blocksToPlainText(parseBody(full.body)) : "";
  const wordCount = plain ? plain.trim().split(/\s+/).filter(Boolean).length : null;
  const readingTime = wordCount != null ? Math.max(1, Math.ceil(wordCount / 220)) : null;

  const seoScore =
    article?.seoScore ??
    (article ? computeArticleSeoScore(article) : 0);
  const contentScore =
    article?.contentScore ??
    (article
      ? computeArticleContentScore({
          ...article,
          tags: tags.data ?? article.tags,
        })
      : 0);

  const author =
    article?.author == null
      ? "Unassigned"
      : Array.isArray(article.author)
        ? article.author[0]?.name ?? "Unassigned"
        : article.author.name ?? "Unassigned";
  const category =
    article?.sections == null
      ? "Unassigned"
      : Array.isArray(article.sections)
        ? article.sections[0]?.name ?? "Unassigned"
        : article.sections.name ?? "Unassigned";
  const languageLabel =
    ARTICLE_LANGUAGES.find((lang) => lang.id === (article?.language ?? "en"))?.label ??
    (article?.language ?? "English");
  const publicUrl = article ? absoluteUrl(`/article/${article.slug}`) : "";
  const tagList = tags.data ?? article?.tags ?? [];
  const viewCount = articleId ? (views.data?.[articleId] ?? article?.views ?? 0) : 0;
  const commentCount = articleId
    ? (comments.data?.[articleId] ?? article?.comments ?? 0)
    : 0;

  const toggleSection = (id: InspectorSection) => {
    setSection((current) => (current === id ? current : id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-l border-border bg-card p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
          <div>
            <SheetTitle className="text-base font-semibold tracking-tight">
              Article inspector
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Desk snapshot for the selected story
            </SheetDescription>
          </div>
        </SheetHeader>

        {loading || !article ? (
          <div className="space-y-4 p-5">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="border-b border-border">
              {article.hero_image_url ? (
                <img
                  src={article.hero_image_url}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="space-y-1 px-5 py-4">
              <h3 className="text-lg font-semibold leading-snug tracking-tight">
                {article.title}
              </h3>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1 truncate font-mono text-[11px] text-cat-blue hover:underline"
              >
                {publicUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>

            <div className="border-t border-border px-2 py-2">
              {SECTIONS.map((item) => {
                const openSection = section === item.id;
                return (
                  <div key={item.id} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold cms-transition",
                        openSection ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-expanded={openSection}
                      onClick={() => toggleSection(item.id)}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 opacity-60 transition-transform",
                          openSection && "rotate-180",
                        )}
                      />
                    </button>
                    {openSection ? (
                      <div className="space-y-3 px-3 pb-4">
                        {item.id === "overview" ? (
                          <dl className="space-y-3 text-sm">
                            <MetaRow label="Title" value={article.title} />
                            <MetaRow label="Author" value={author} />
                            <MetaRow label="Category" value={category} />
                            <MetaRow
                              label="Status"
                              value={
                                <CmsStatus tone={statusTone(article.status)}>
                                  {statusLabel(article.status)}
                                </CmsStatus>
                              }
                            />
                            <MetaRow label="Language" value={languageLabel} />
                            <MetaRow
                              label="Tags"
                              value={
                                tagList.length ? (
                                  <div className="flex flex-wrap justify-end gap-1">
                                    {tagList.map((tag: { id: string; name: string }) => (
                                      <span
                                        key={tag.id}
                                        className="bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  "—"
                                )
                              }
                            />
                            <MetaRow
                              label="Published"
                              value={
                                article.published_at
                                  ? new Date(article.published_at).toLocaleString()
                                  : "—"
                              }
                            />
                            <MetaRow
                              label="Updated"
                              value={new Date(article.updated_at).toLocaleString()}
                            />
                            <MetaRow
                              label="Hero"
                              value={article.hero_image_url ? "Set" : "Missing"}
                            />
                          </dl>
                        ) : null}

                        {item.id === "seo" ? (
                          <dl className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <ScoreTile label="SEO score" value={seoScore} />
                              <ScoreTile label="Content score" value={contentScore} />
                            </div>
                            <MetaRow
                              label="Focus keyword"
                              value={article.focus_keyword?.trim() || "—"}
                            />
                            <MetaRow
                              label="SEO title"
                              value={article.seo_title?.trim() || "—"}
                            />
                            <MetaRow
                              label="Meta description"
                              value={article.meta_description?.trim() || "—"}
                            />
                            <MetaRow
                              label="Robots index"
                              value={
                                <CmsStatus
                                  tone={article.robots_index === false ? "warning" : "success"}
                                >
                                  {article.robots_index === false ? "Noindex" : "Index"}
                                </CmsStatus>
                              }
                            />
                          </dl>
                        ) : null}

                        {item.id === "analytics" ? (
                          <dl className="space-y-3 text-sm">
                            <MetaRow label="Views" value={viewCount.toLocaleString()} mono />
                            <MetaRow label="Comments" value={commentCount.toLocaleString()} mono />
                            <MetaRow label="Shares" value="—" hint="Not instrumented yet" />
                            <MetaRow
                              label="Reading time"
                              value={readingTime != null ? `${readingTime} min` : "—"}
                              mono
                            />
                            <MetaRow
                              label="Word count"
                              value={wordCount != null ? wordCount.toLocaleString() : "—"}
                              mono
                            />
                          </dl>
                        ) : null}

                        {item.id === "social" ? (
                          <dl className="space-y-3 text-sm">
                            <MetaRow
                              label="Google News"
                              value={
                                <CmsStatus tone={article.google_news ? "success" : "neutral"}>
                                  {article.google_news ? "Eligible" : "Off"}
                                </CmsStatus>
                              }
                            />
                            <MetaRow
                              label="Google Discover"
                              value={
                                <CmsStatus tone={article.google_discover ? "success" : "neutral"}>
                                  {article.google_discover ? "Enabled" : "Off"}
                                </CmsStatus>
                              }
                            />
                          </dl>
                        ) : null}

                        {item.id === "workflow" ? (
                          <div className="space-y-4">
                            <dl className="space-y-3 text-sm">
                              <MetaRow
                                label="Workflow stage"
                                value={WORKFLOW_STAGE[article.status] ?? article.status}
                              />
                            </dl>
                            <div className="grid grid-cols-2 gap-2">
                              <Link
                                to="/admin/articles/$id"
                                params={{ id: article.id }}
                                className={cn(cmsButton, "justify-center")}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Link>
                              <Link
                                to="/admin/articles/preview/$articleId"
                                params={{ articleId: article.id }}
                                className={cn(cmsSecondaryButton, "justify-center")}
                              >
                                <Eye className="h-3.5 w-3.5" /> Preview
                              </Link>
                              {canCreate ? (
                                <button
                                  type="button"
                                  className={cn(cmsSecondaryButton, "justify-center")}
                                  onClick={onDuplicate}
                                >
                                  <Copy className="h-3.5 w-3.5" /> Duplicate
                                </button>
                              ) : (
                                <span />
                              )}
                              {canPublish && article.status !== "archived" ? (
                                <button
                                  type="button"
                                  className={cn(cmsSecondaryButton, "justify-center")}
                                  onClick={onArchive}
                                >
                                  <Archive className="h-3.5 w-3.5" /> Archive
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 mt-auto space-y-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/admin/articles/$id"
                  params={{ id: article.id }}
                  className={cn(cmsButton, "justify-center")}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
                <Link
                  to="/admin/articles/preview/$articleId"
                  params={{ articleId: article.id }}
                  className={cn(cmsSecondaryButton, "justify-center")}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {canCreate ? (
                  <button
                    type="button"
                    className={cn(cmsSecondaryButton, "justify-center")}
                    onClick={onDuplicate}
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                ) : (
                  <span />
                )}
                {canPublish && article.status !== "archived" ? (
                  <button
                    type="button"
                    className={cn(cmsSecondaryButton, "justify-center")}
                    onClick={onArchive}
                  >
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/70 bg-background px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="cms-metric text-2xl font-semibold">{value}</span>
        <CmsStatus tone={scoreTone(value)}>
          {value >= 75 ? "Strong" : value >= 50 ? "Fair" : "Weak"}
        </CmsStatus>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
  hint,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-2.5 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        {hint ? (
          <div className="mt-0.5 normal-case tracking-normal text-[10px] font-normal opacity-70">
            {hint}
          </div>
        ) : null}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm font-medium",
          mono && "cms-metric",
        )}
      >
        {value}
      </dd>
    </div>
  );
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

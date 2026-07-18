import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, ImagePlus, RotateCcw, X } from "lucide-react";
import {
  applyArticleWorkflowAction,
  duplicateArticle,
  getAdminArticle,
  getArticleRevisions,
  getArticleTags,
  getMe,
  listTags,
  recordArticleApproval,
  restoreArticleRevision,
  setArticleTags,
  unwrapRevisionSnapshot,
  updateArticleSeo,
  upsertArticle,
  uploadHeroImage,
  type ArticleApprovalAction,
  type ArticleSeoInput,
} from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";
import { CmsPanel, CmsStatus, cmsButton, cmsInput } from "@/components/cms-ui";
import { MediaUploader, RichEditor, SEOForm } from "@/components/cms";
import { ArticleBody } from "@/components/article-body";
import { ArticleAiAssistantPanel } from "@/components/articles/ai-assistant-panel";
import {
  ArticleApprovalHistoryPanel,
  ArticleNotesPanel,
  WorkflowActions,
} from "@/components/articles/article-edit-panels";
import {
  DocumentEditorBar,
  type DocumentViewMode,
} from "@/components/articles/document-editor-chrome";
import { computeArticleSeoScore } from "@/components/articles/articles-filters";
import {
  clearArticleDraftCache,
  loadArticleDraftCache,
  moveArticleDraftCache,
  saveArticleDraftCache,
  type ArticleDraftCachePayload,
} from "@/lib/article-draft-cache";
import { useArticleEditRealtime } from "@/hooks/useArticleEditRealtime";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";
import { parseBody, serializeBlocks, type Block } from "@/lib/blocks";
import { computeWritingStats } from "@/lib/writing-stats";
import { parseHreflang, seoLengthTone, siteUrl } from "@/lib/seo";
import { ARTICLES_STATIC_SEGMENTS } from "@/components/articles/nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ArticleStatus = Database["public"]["Enums"]["article_status"];

export const Route = createFileRoute("/_authenticated/admin/articles/$id")({
  beforeLoad: ({ context, params }) => {
    if (ARTICLES_STATIC_SEGMENTS.has(params.id)) {
      throw redirect({ href: `/admin/articles/${params.id}` });
    }
    requirePermissionRoute(
      context.roles,
      params.id === "new" ? "articles:create" : "articles:view",
    );
  },
  component: EditArticle,
});

const AUTOSAVE_DELAY_MS = 3000;

function EditArticle() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const rolesReady = meQ.isSuccess;
  const editorRoles = meQ.data?.roles ?? [];
  const isEditorialLeader = editorRoles.some((role) =>
    ["super_admin", "editor_in_chief", "managing_editor"].includes(role),
  );
  const isFactChecker = editorRoles.includes("fact_checker");
  const mayUploadMedia = hasPermission(editorRoles, "media:upload");
  const mayManageTags = hasPermission(editorRoles, "articles:create");

  const sectionsQ = useQuery({
    queryKey: ["sections", "editorial"],
    queryFn: () => getSections({ includeHidden: true }),
  });
  const articleQ = useQuery({
    queryKey: ["admin-article", id],
    queryFn: () => getAdminArticle({ data: { id } }),
    enabled: !isNew,
  });
  const revisionsQ = useQuery({
    queryKey: ["article-revisions", id],
    queryFn: () => getArticleRevisions({ data: { article_id: id } }),
    enabled: !isNew,
  });
  const articleTagsQ = useQuery({
    queryKey: ["article-tags", id],
    queryFn: () => getArticleTags({ data: { article_id: id } }),
    enabled: !isNew,
  });
  const allTagsQ = useQuery({ queryKey: ["all-tags"], queryFn: () => listTags() });

  const [form, setForm] = useState({
    title: "",
    deck: "",
    section_id: "",
    region: "",
    badge_type: "none",
    hero_image_url: "",
    status: "draft" as ArticleStatus,
    slug: "",
    scheduled_at: "",
  });
  const [seo, setSeo] = useState<ArticleSeoInput>({
    seo_title: "",
    meta_description: "",
    focus_keyword: "",
    canonical_url: "",
    robots_index: true,
    robots_follow: true,
    schema_type: "NewsArticle",
    og_title: "",
    og_description: "",
    og_image_url: "",
    twitter_card: "summary_large_image",
    twitter_title: "",
    twitter_description: "",
    twitter_image_url: "",
    rss_inclusion: true,
    hreflang: {},
  });
  const [hreflangRows, setHreflangRows] = useState<Array<{ locale: string; url: string }>>([]);
  const [blocks, setBlocks] = useState<Block[]>(() => parseBody(null));
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<ArticleDraftCachePayload | null>(null);
  const [viewMode, setViewMode] = useState<DocumentViewMode>("edit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("publishing");
  const hydratedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const cacheKey = isNew ? "new" : id;

  const { connected: realtimeConnected, remoteUpdatedAt } = useArticleEditRealtime(
    isNew ? null : id,
  );

  const writingStats = useMemo(
    () => computeWritingStats(form.title, form.deck, blocks),
    [form.title, form.deck, blocks],
  );
  const seoScore = useMemo(
    () =>
      computeArticleSeoScore({
        seo_title: seo.seo_title,
        meta_description: seo.meta_description,
        focus_keyword: seo.focus_keyword,
        robots_index: seo.robots_index,
      }),
    [seo.seo_title, seo.meta_description, seo.focus_keyword, seo.robots_index],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (viewMode === "focus" || viewMode === "fullscreen" || viewMode === "reading")) {
        setViewMode("edit");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "fullscreen") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewMode]);

  const patchForm = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const patchSeo = (patch: Partial<ArticleSeoInput>) => {
    setSeo((current) => ({ ...current, ...patch }));
    setDirty(true);
  };
  const changeBlocks = useCallback((next: Block[]) => {
    setBlocks(next);
    setDirty(true);
  }, []);

  useEffect(() => {
    if (articleQ.data && !dirty) {
      setForm({
        title: articleQ.data.title,
        deck: articleQ.data.deck ?? "",
        section_id: articleQ.data.section_id ?? "",
        region: articleQ.data.region ?? "",
        badge_type: articleQ.data.badge_type ?? "none",
        hero_image_url: articleQ.data.hero_image_url ?? "",
        status: articleQ.data.status,
        slug: articleQ.data.slug,
        scheduled_at: toDateTimeLocal(articleQ.data.scheduled_at),
      });
      setBlocks(parseBody(articleQ.data.body));
      const hreflang = parseHreflang(articleQ.data.hreflang);
      setSeo({
        seo_title: articleQ.data.seo_title ?? "",
        meta_description: articleQ.data.meta_description ?? "",
        focus_keyword: articleQ.data.focus_keyword ?? "",
        canonical_url: articleQ.data.canonical_url ?? "",
        robots_index: articleQ.data.robots_index ?? true,
        robots_follow: articleQ.data.robots_follow ?? true,
        schema_type: (
          ["NewsArticle", "Article", "Review", "Report"].includes(articleQ.data.schema_type)
            ? articleQ.data.schema_type
            : "NewsArticle"
        ) as ArticleSeoInput["schema_type"],
        og_title: articleQ.data.og_title ?? "",
        og_description: articleQ.data.og_description ?? "",
        og_image_url: articleQ.data.og_image_url ?? "",
        twitter_card:
          articleQ.data.twitter_card === "summary" ? "summary" : "summary_large_image",
        twitter_title: articleQ.data.twitter_title ?? "",
        twitter_description: articleQ.data.twitter_description ?? "",
        twitter_image_url: articleQ.data.twitter_image_url ?? "",
        rss_inclusion: articleQ.data.rss_inclusion ?? true,
        hreflang,
      });
      setHreflangRows(
        Object.entries(hreflang).map(([locale, url]) => ({ locale, url })),
      );
      hydratedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleQ.data]);

  useEffect(() => {
    if (isNew) hydratedRef.current = true;
  }, [isNew]);

  // Offer local draft recovery when cache is newer than the server row.
  useEffect(() => {
    if (!hydratedRef.current && !isNew) return;
    const cached = loadArticleDraftCache(cacheKey);
    if (!cached) return;
    if (!isNew && articleQ.data?.updated_at) {
      if (new Date(cached.savedAt).getTime() <= new Date(articleQ.data.updated_at).getTime()) {
        clearArticleDraftCache(cacheKey);
        return;
      }
    }
    setDraftRecovery(cached);
  }, [cacheKey, isNew, articleQ.data?.updated_at]);

  useEffect(() => {
    if (articleTagsQ.data && !dirty) {
      setTagNames(articleTagsQ.data.map((t) => t.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleTagsQ.data]);

  const hasSectionAccess =
    !!form.section_id && (meQ.data?.sectionAccess ?? []).includes(form.section_id);
  const canPublish =
    isEditorialLeader ||
    (hasPermission(editorRoles, "articles:publish") && hasSectionAccess);
  const canEditAssigned = isEditorialLeader || hasSectionAccess;
  const protectedReadOnly =
    !isNew &&
    rolesReady &&
    !canPublish &&
    ["scheduled", "published", "archived"].includes(articleQ.data?.status ?? "");
  const articleReadOnly =
    !isNew &&
    rolesReady &&
    !canEditAssigned &&
    !(
      isFactChecker &&
      articleQ.data &&
      ["draft", "review"].includes(articleQ.data.status)
    ) &&
    articleQ.data?.author_id !== meQ.data?.userId;
  const readOnly = protectedReadOnly || articleReadOnly;
  const canReview =
    isEditorialLeader ||
    hasPermission(editorRoles, "articles:review") ||
    canPublish;
  const canSubmitReview =
    !readOnly &&
    (isEditorialLeader ||
      hasPermission(editorRoles, "articles:edit_own") ||
      hasPermission(editorRoles, "articles:edit_all") ||
      hasPermission(editorRoles, "articles:create"));
  const canWriteEditorialNotes =
    !isNew &&
    (hasPermission(editorRoles, "articles:edit_own") ||
      hasPermission(editorRoles, "articles:edit_all") ||
      hasPermission(editorRoles, "articles:review"));
  const canWriteFactCheckNotes =
    !isNew &&
    (isFactChecker ||
      hasPermission(editorRoles, "articles:review") ||
      hasPermission(editorRoles, "articles:edit_all"));
  const canDuplicate = !isNew && hasPermission(editorRoles, "articles:create");
  const canArchive =
    !isNew &&
    !readOnly &&
    (canPublish || hasPermission(editorRoles, "articles:delete"));

  useEffect(() => {
    if (readOnly) return;
    const timer = window.setTimeout(() => titleInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [id, readOnly]);

  // Persist unsaved work locally for recovery.
  useEffect(() => {
    if (!dirty || readOnly) return;
    const timer = setTimeout(() => {
      saveArticleDraftCache(cacheKey, {
        savedAt: new Date().toISOString(),
        form: { ...form },
        blocks,
        tagNames,
        seo: { ...seo },
        hreflangRows,
      });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, form, blocks, tagNames, seo, hreflangRows, cacheKey, readOnly]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const applyDraftRecovery = () => {
    if (!draftRecovery) return;
    const cached = draftRecovery;
    setForm({
      title: cached.form.title,
      deck: cached.form.deck,
      section_id: cached.form.section_id,
      region: cached.form.region,
      badge_type: cached.form.badge_type,
      hero_image_url: cached.form.hero_image_url,
      status: (cached.form.status as ArticleStatus) || "draft",
      slug: cached.form.slug,
      scheduled_at: cached.form.scheduled_at,
    });
    if (Array.isArray(cached.blocks) && cached.blocks.length) {
      setBlocks(cached.blocks as Block[]);
    }
    setTagNames(cached.tagNames ?? []);
    setSeo((current) => ({ ...current, ...(cached.seo as Partial<ArticleSeoInput>) }));
    setHreflangRows(cached.hreflangRows ?? []);
    setDirty(true);
    setDraftRecovery(null);
  };

  const discardDraftRecovery = () => {
    clearArticleDraftCache(cacheKey);
    setDraftRecovery(null);
  };

  const save = useMutation({
    mutationFn: async ({ auto: _auto }: { auto?: boolean } = {}) => {
      const previousStatus = articleQ.data?.status;
      const article = await upsertArticle({
        data: {
          id: isNew ? undefined : id,
          title: form.title,
          deck: form.deck,
          body: serializeBlocks(blocks),
          section_id: form.section_id,
          region: form.region,
          badge_type: form.badge_type,
          hero_image_url: form.hero_image_url,
          status: form.status,
          slug: form.slug || undefined,
          scheduled_at:
            form.status === "scheduled" && form.scheduled_at
              ? new Date(form.scheduled_at).toISOString()
              : null,
        },
      });
      if (article?.id && mayManageTags) {
        await setArticleTags({ data: { article_id: article.id, tag_names: tagNames } });
      }
      if (article?.id) {
        const hreflang = Object.fromEntries(
          hreflangRows
            .filter((row) => row.locale.trim() && row.url.trim())
            .map((row) => [row.locale.trim(), row.url.trim()]),
        );
        await updateArticleSeo({
          data: { article_id: article.id, ...seo, hreflang },
        });
      }
      if (
        article?.id &&
        previousStatus &&
        previousStatus !== form.status &&
        ["published", "scheduled", "archived", "review"].includes(form.status)
      ) {
        const action: ArticleApprovalAction | null =
          form.status === "published"
            ? "publish"
            : form.status === "scheduled"
              ? "schedule"
              : form.status === "archived"
                ? "archive"
                : form.status === "review" && previousStatus === "draft"
                  ? "submit_review"
                  : null;
        if (action) {
          try {
            await recordArticleApproval({
              data: {
                article_id: article.id,
                action,
                from_status: previousStatus,
                to_status: form.status,
              },
            });
          } catch {
            // Approval log is best-effort; save already succeeded.
          }
        }
      }
      return article;
    },
    onSuccess: (article, variables) => {
      setDirty(false);
      setLastSavedAt(new Date());
      clearArticleDraftCache(cacheKey);
      if (isNew && article?.id) {
        moveArticleDraftCache("new", article.id);
        clearArticleDraftCache("new");
      }
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["article-revisions", id] });
      qc.invalidateQueries({ queryKey: ["article-approvals", article?.id ?? id] });
      qc.invalidateQueries({ queryKey: ["all-tags"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      if (article?.slug) {
        qc.invalidateQueries({ queryKey: ["article", article.slug] });
      }
      if (isNew && article?.id && !variables?.auto) {
        navigate({ to: "/admin/articles/$id", params: { id: article.id }, replace: true });
      }
    },
  });

  const workflow = useMutation({
    mutationFn: ({ action, note }: { action: ArticleApprovalAction; note?: string }) =>
      applyArticleWorkflowAction({
        data: {
          article_id: id,
          action,
          note,
          scheduled_at:
            form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        },
      }),
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["admin-article", id] });
      void qc.invalidateQueries({ queryKey: ["article-approvals", id] });
      void qc.invalidateQueries({ queryKey: ["article-revisions", id] });
      void qc.invalidateQueries({ queryKey: ["admin-articles"] });
    },
  });

  const duplicate = useMutation({
    mutationFn: () => duplicateArticle({ data: { id } }),
    onSuccess: (article) => {
      if (article?.id) {
        navigate({ to: "/admin/articles/$id", params: { id: article.id } });
      }
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      applyArticleWorkflowAction({
        data: { article_id: id, action: "archive" },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-article", id] });
      void qc.invalidateQueries({ queryKey: ["admin-articles"] });
    },
  });

  const restore = useMutation({
    mutationFn: (revisionId: string) =>
      restoreArticleRevision({
        data: { article_id: id, revision_id: revisionId },
      }),
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["admin-article", id] });
      void qc.invalidateQueries({ queryKey: ["article-revisions", id] });
      void qc.invalidateQueries({ queryKey: ["admin-articles"] });
    },
  });

  const canSubmit =
    !readOnly &&
    !save.isPending &&
    !!form.section_id &&
    !!form.title.trim() &&
    !(form.status === "scheduled" && !form.scheduled_at);

  // Autosave drafts and reviews while editing an existing article.
  const autosaveEligible =
    dirty &&
    !isNew &&
    !readOnly &&
    !save.isPending &&
    ["draft", "review"].includes(form.status) &&
    !!form.title.trim() &&
    !!form.section_id;
  useEffect(() => {
    if (!autosaveEligible) return;
    const timer = setTimeout(() => save.mutate({ auto: true }), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveEligible, form, blocks, tagNames, seo, hreflangRows]);

  // Ctrl+S / Cmd+S saves from anywhere on the page.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canSubmit) save.mutate({});
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canSubmit, save]);

  const uploadImage = async (file: File): Promise<string> => {
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const base64 = btoa(bin);
    const res = await uploadHeroImage({
      data: {
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        base64,
        bucket: "article-hero",
      },
    });
    if (!res.url) throw new Error("Upload failed — no public URL returned.");
    return res.url;
  };

  const uploadHero = async (file: File) => {
    setUploadBusy(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      patchForm({ hero_image_url: url });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploadBusy(false);
    }
  };

  const addTag = (raw: string) => {
    const name = raw.trim().replace(/,+$/, "");
    if (!name) return;
    if (!tagNames.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setTagNames((prev) => [...prev, name]);
      setDirty(true);
    }
    setTagDraft("");
  };

  const author = articleQ.data
    ? (Array.isArray(articleQ.data.author) ? articleQ.data.author[0] : articleQ.data.author)
    : null;
  const authorName = isNew
    ? (meQ.data?.profile?.name ?? "You")
    : (author?.name ?? "Unknown author");
  const authorAvatar = isNew
    ? meQ.data?.profile?.avatar_url
    : author?.avatar_url;
  const publicSlug = form.status === "published" && form.slug ? form.slug : undefined;
  const showSidebar =
    sidebarOpen && (viewMode === "edit" || viewMode === "reading");
  const fullscreen = viewMode === "fullscreen";
  const focusLike = viewMode === "focus" || viewMode === "fullscreen";
  const saveLabel =
    form.status === "published"
      ? articleQ.data?.status === "published"
        ? "Update"
        : "Publish"
      : form.status === "scheduled"
        ? "Schedule"
        : isNew
          ? "Create"
          : "Save draft";

  const copyShareLink = () => {
    const url = publicSlug
      ? `${siteUrl()}/article/${publicSlug}`
      : !isNew
        ? `${window.location.origin}/admin/articles/preview/${id}`
        : null;
    if (!url) return;
    void navigator.clipboard.writeText(url).catch(() => undefined);
  };

  if (!isNew && articleQ.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading article…</div>;
  }
  if (!isNew && articleQ.isError) {
    return (
      <div className="rounded-sm border border-crimson bg-crimson/10 p-4 text-sm text-crimson">
        {(articleQ.error as Error).message}
      </div>
    );
  }

  const tabTriggerClass =
    "rounded-none border-b-2 border-transparent bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)]",
        fullscreen && "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background",
      )}
    >
      <DocumentEditorBar
        title={form.title}
        statusLabel={form.status}
        saving={save.isPending}
        dirty={dirty}
        lastSavedAt={lastSavedAt}
        stats={writingStats}
        seoScore={seoScore}
        sidebarOpen={sidebarOpen && viewMode === "edit"}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        mode={viewMode}
        onModeChange={setViewMode}
        onSave={() => save.mutate({})}
        saveLabel={saveLabel}
        canSave={canSubmit}
        articleId={id}
        isNew={isNew}
        publicSlug={publicSlug}
        canDuplicate={canDuplicate}
        canArchive={canArchive && form.status !== "archived"}
        onDuplicate={() => {
          if (window.confirm("Duplicate this article as a new draft?")) duplicate.mutate();
        }}
        onArchive={() => {
          if (window.confirm("Move this article to trash (archived)?")) archive.mutate();
        }}
        onShare={publicSlug || !isNew ? copyShareLink : undefined}
      />

      {draftRecovery ? (
        <div className="flex flex-col gap-2 border-b border-gold/30 bg-gold/5 px-4 py-2.5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Local draft from{" "}
            <span className="font-medium text-foreground">
              {new Date(draftRecovery.savedAt).toLocaleString()}
            </span>{" "}
            available.
          </div>
          <div className="flex shrink-0 gap-3">
            <button type="button" className="text-xs font-semibold text-foreground hover:underline" onClick={applyDraftRecovery}>
              Recover
            </button>
            <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={discardDraftRecovery}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
      {remoteUpdatedAt && dirty ? (
        <div className="border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          Remote update at{" "}
          <span className="font-medium text-foreground">
            {new Date(remoteUpdatedAt).toLocaleString()}
          </span>
          {realtimeConnected ? "" : " · offline sync"}
          . Save carefully or reload.
        </div>
      ) : null}
      {!canPublish && (
        <div className="border-b border-gold/20 bg-gold/5 px-4 py-2 text-xs text-muted-foreground">
          {protectedReadOnly
            ? "Read-only in this workflow state — an editor must make changes."
            : "You can save draft or in review only. A section editor must publish."}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) save.mutate({});
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
          }
        }}
        className={cn(
          "flex min-h-0",
          fullscreen ? "flex-1 overflow-hidden" : "min-h-[calc(100vh-8rem)]",
        )}
      >
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto bg-muted/20",
            focusLike ? "px-4 py-8 sm:px-10 sm:py-12" : "px-3 py-6 sm:px-6 sm:py-8",
          )}
        >
          <div
            className={cn(
              "mx-auto w-full bg-background shadow-sm",
              focusLike ? "max-w-[720px]" : "max-w-[850px]",
              "px-8 py-10 sm:px-14 sm:py-14",
            )}
          >
            {viewMode === "reading" ? (
              form.hero_image_url ? (
                <img
                  src={form.hero_image_url}
                  alt=""
                  className="-mx-8 mb-8 max-h-80 w-[calc(100%+4rem)] object-cover sm:-mx-14 sm:w-[calc(100%+7rem)]"
                />
              ) : null
            ) : mayUploadMedia && !readOnly ? (
              <div className="group relative -mx-8 mb-8 sm:-mx-14">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadHero(file);
                    e.target.value = "";
                  }}
                />
                {form.hero_image_url ? (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="relative block w-full overflow-hidden"
                  >
                    <img
                      src={form.hero_image_url}
                      alt=""
                      className="max-h-72 w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {uploadBusy ? "Uploading…" : "Change cover"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadBusy}
                    className="flex w-full items-center justify-center gap-2 border border-dashed border-border/70 bg-muted/30 py-10 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploadBusy ? "Uploading…" : "Add cover image"}
                  </button>
                )}
                {uploadError ? (
                  <p className="mt-2 px-8 text-xs text-crimson sm:px-14">{uploadError}</p>
                ) : null}
              </div>
            ) : form.hero_image_url ? (
              <img
                src={form.hero_image_url}
                alt=""
                className="-mx-8 mb-8 max-h-72 w-[calc(100%+4rem)] object-cover sm:-mx-14 sm:w-[calc(100%+7rem)]"
              />
            ) : null}

            {viewMode === "reading" ? (
              <article>
                <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  {form.title || "Untitled"}
                </h1>
                {form.deck ? (
                  <p className="mt-4 font-serif text-xl leading-relaxed text-muted-foreground">
                    {form.deck}
                  </p>
                ) : null}
                <div className="mt-6 flex items-center gap-3 border-b border-border/40 pb-6">
                  <AuthorRow name={authorName} avatarUrl={authorAvatar} />
                </div>
                <div className="mt-8">
                  <ArticleBody body={serializeBlocks(blocks)} />
                </div>
              </article>
            ) : (
              <>
                <input
                  ref={titleInputRef}
                  required
                  disabled={readOnly}
                  value={form.title}
                  onChange={(e) => patchForm({ title: e.target.value })}
                  placeholder="Article title"
                  className="w-full border-0 bg-transparent font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-5xl"
                />
                <textarea
                  disabled={readOnly}
                  value={form.deck}
                  onChange={(e) => patchForm({ deck: e.target.value })}
                  rows={2}
                  placeholder="Write a subtitle…"
                  className="mt-4 w-full resize-none border-0 bg-transparent font-serif text-xl leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/35 sm:text-2xl"
                />
                <div className="mt-6 flex items-center gap-3 border-b border-border/40 pb-6">
                  <AuthorRow
                    name={authorName}
                    avatarUrl={authorAvatar}
                    note={
                      !isNew && articleQ.data?.created_at
                        ? new Date(articleQ.data.created_at).toLocaleDateString()
                        : undefined
                    }
                  />
                </div>
                <div className="mt-2">
                  <RichEditor
                    value={blocks}
                    onChange={changeBlocks}
                    readOnly={readOnly}
                    onUploadImage={mayUploadMedia ? uploadImage : undefined}
                    className="border-0 bg-transparent"
                  />
                </div>
              </>
            )}
          </div>
        </main>

        {showSidebar ? (
          <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border/60 bg-background lg:block xl:w-[320px]">
            <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="space-y-0">
              <TabsList className="sticky top-0 z-10 flex h-auto w-full flex-wrap justify-start gap-0 rounded-none border-b border-border/50 bg-background px-2 py-1">
                <TabsTrigger value="publishing" className={tabTriggerClass}>
                  Publishing
                </TabsTrigger>
                <TabsTrigger value="seo" className={tabTriggerClass}>
                  SEO
                </TabsTrigger>
                <TabsTrigger value="social" className={tabTriggerClass}>
                  Social
                </TabsTrigger>
                <TabsTrigger value="categories" className={tabTriggerClass}>
                  Categories
                </TabsTrigger>
                <TabsTrigger value="tags" className={tabTriggerClass}>
                  Tags
                </TabsTrigger>
                <TabsTrigger value="media" className={tabTriggerClass}>
                  Media
                </TabsTrigger>
                <TabsTrigger value="author" className={tabTriggerClass}>
                  Author
                </TabsTrigger>
                <TabsTrigger value="ai" className={tabTriggerClass}>
                  AI
                </TabsTrigger>
                <TabsTrigger value="settings" className={tabTriggerClass}>
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="publishing" className="mt-0">
                <CmsPanel title="Publishing" description="Workflow and distribution">
                  <div className="space-y-4 p-4">
                    <Field label="Status">
                      <select
                        value={form.status}
                        onChange={(e) => patchForm({ status: e.target.value as ArticleStatus })}
                        disabled={readOnly}
                        className={cmsInput}
                      >
                        <option value="draft">Draft</option>
                        <option value="review">In review</option>
                        {canPublish && (
                          <>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </>
                        )}
                      </select>
                    </Field>
                    {form.status === "scheduled" && (
                      <Field label="Publication date and time">
                        <input
                          type="datetime-local"
                          required
                          min={toDateTimeLocal(new Date().toISOString())}
                          value={form.scheduled_at}
                          onChange={(event) => patchForm({ scheduled_at: event.target.value })}
                          className={cmsInput}
                        />
                      </Field>
                    )}
                    <Field label="Badge">
                      <select
                        value={form.badge_type}
                        disabled={readOnly}
                        onChange={(e) => patchForm({ badge_type: e.target.value })}
                        className={cmsInput}
                      >
                        {["none", "breaking", "live", "exclusive", "opinion", "premium", "alert"].map(
                          (b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                    <Field label="Region">
                      <input
                        value={form.region}
                        disabled={readOnly}
                        onChange={(e) => patchForm({ region: e.target.value })}
                        className={cmsInput}
                      />
                    </Field>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="text-xs font-semibold text-foreground">Current state</span>
                      <CmsStatus tone={statusTone(form.status)} status={form.status}>
                        {form.status}
                      </CmsStatus>
                    </div>
                    {!isNew && !readOnly ? (
                      <WorkflowActions
                        status={form.status}
                        canSubmitReview={canSubmitReview}
                        canReview={canReview}
                        canPublish={canPublish}
                        disabled={workflow.isPending || save.isPending}
                        onAction={(action, note) => workflow.mutate({ action, note })}
                      />
                    ) : null}
                    {workflow.isError ? (
                      <div className="border border-crimson/30 bg-crimson/10 p-3 text-xs text-crimson">
                        {workflow.error.message}
                      </div>
                    ) : null}
                    <button type="submit" disabled={!canSubmit} className={`${cmsButton} w-full`}>
                      {save.isPending
                        ? "Saving…"
                        : form.status === "published"
                          ? "Publish article"
                          : form.status === "scheduled"
                            ? "Schedule article"
                            : form.status === "archived"
                              ? "Archive article"
                              : isNew
                                ? "Create article"
                                : "Save changes"}
                    </button>
                    {save.isError && (
                      <div className="border border-crimson/30 bg-crimson/10 p-3 text-xs text-crimson">
                        {(save.error as Error).message}
                      </div>
                    )}
                  </div>
                </CmsPanel>
              </TabsContent>

              <TabsContent value="seo" className="mt-0">
                <SEOForm
                  value={seo}
                  onChange={(patch) => {
                    patchSeo(patch);
                    setDirty(true);
                  }}
                  slug={form.slug}
                  onSlugChange={(slug) => {
                    patchForm({ slug });
                    setDirty(true);
                  }}
                  titleFallback={form.title}
                  deckFallback={form.deck}
                  heroImageUrl={form.hero_image_url}
                  hreflangRows={hreflangRows}
                  onHreflangChange={(rows) => {
                    setHreflangRows(rows);
                    setDirty(true);
                  }}
                  readOnly={readOnly}
                  showSocial={false}
                />
              </TabsContent>

              <TabsContent value="social" className="mt-0">
                <SEOForm
                  value={seo}
                  onChange={(patch) => {
                    patchSeo(patch);
                    setDirty(true);
                  }}
                  slug={form.slug}
                  onSlugChange={(slug) => {
                    patchForm({ slug });
                    setDirty(true);
                  }}
                  titleFallback={form.title}
                  deckFallback={form.deck}
                  heroImageUrl={form.hero_image_url}
                  hreflangRows={hreflangRows}
                  onHreflangChange={(rows) => {
                    setHreflangRows(rows);
                    setDirty(true);
                  }}
                  readOnly={readOnly}
                  showSocial
                />
              </TabsContent>

              <TabsContent value="categories" className="mt-0">
                <CmsPanel title="Categories" description="Section placement">
                  <div className="p-4">
                    <Field label="Category">
                      <select
                        required
                        disabled={readOnly}
                        value={form.section_id}
                        onChange={(e) => patchForm({ section_id: e.target.value })}
                        className={cmsInput}
                      >
                        <option value="">—</option>
                        {(sectionsQ.data ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </CmsPanel>
              </TabsContent>

              <TabsContent value="tags" className="mt-0">
                <CmsPanel title="Tags" description="Topics for discovery">
                  <div className="space-y-3 p-4">
                    {tagNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tagNames.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground"
                          >
                            {tag}
                            {!readOnly && mayManageTags && (
                              <button
                                type="button"
                                title={`Remove ${tag}`}
                                onClick={() => {
                                  setTagNames((prev) => prev.filter((t) => t !== tag));
                                  setDirty(true);
                                }}
                                className="text-muted-foreground hover:text-crimson"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {!readOnly && mayManageTags && (
                      <>
                        <input
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              addTag(tagDraft);
                            }
                          }}
                          placeholder="Add tag and press Enter"
                          className={cmsInput}
                          list="all-tags-list"
                        />
                        <datalist id="all-tags-list">
                          {(allTagsQ.data ?? [])
                            .filter(
                              (t) =>
                                !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()),
                            )
                            .map((t) => (
                              <option key={t.id} value={t.name} />
                            ))}
                        </datalist>
                      </>
                    )}
                    {!mayManageTags && (
                      <p className="text-xs text-muted-foreground">Your role cannot modify tags.</p>
                    )}
                  </div>
                </CmsPanel>
              </TabsContent>

              <TabsContent value="media" className="mt-0">
                <CmsPanel title="Media" description="Cover image · max 5 MB">
                  <div className="space-y-3 p-4">
                    {mayUploadMedia && !readOnly ? (
                      <MediaUploader
                        previewUrl={form.hero_image_url || null}
                        busy={uploadBusy}
                        progress={uploadBusy ? "Uploading…" : null}
                        onFiles={(files) => {
                          const file = files[0];
                          if (file) void uploadHero(file);
                        }}
                      >
                        Upload lead image
                      </MediaUploader>
                    ) : form.hero_image_url ? (
                      <img
                        src={form.hero_image_url}
                        alt={form.title || "Article hero"}
                        className="aspect-video w-full border border-border object-cover"
                      />
                    ) : null}
                    {uploadError && <div className="text-xs text-crimson">{uploadError}</div>}
                    <input
                      value={form.hero_image_url}
                      disabled={readOnly}
                      onChange={(e) => patchForm({ hero_image_url: e.target.value })}
                      placeholder="Or paste image URL"
                      className={`${cmsInput} text-xs`}
                    />
                  </div>
                </CmsPanel>
              </TabsContent>

              <TabsContent value="author" className="mt-0">
                <CmsPanel title="Author" description="Byline">
                  <div className="flex items-center gap-3 p-4">
                    {isNew ? (
                      <AuthorRow
                        name={meQ.data?.profile?.name ?? "You"}
                        avatarUrl={meQ.data?.profile?.avatar_url}
                        note="You will be credited as the author."
                      />
                    ) : (
                      <AuthorRow
                        name={author?.name ?? "Unknown author"}
                        avatarUrl={author?.avatar_url}
                        note={
                          articleQ.data?.created_at
                            ? `Created ${new Date(articleQ.data.created_at).toLocaleDateString()}`
                            : undefined
                        }
                      />
                    )}
                  </div>
                </CmsPanel>
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <ArticleAiAssistantPanel
                  title={form.title}
                  deck={form.deck}
                  blocks={blocks}
                  readOnly={readOnly}
                  onApplyTitle={(next) => {
                    patchForm({ title: next });
                    setDirty(true);
                  }}
                  onApplyDeck={(next) => {
                    patchForm({ deck: next });
                    setDirty(true);
                  }}
                  onApplyMeta={(patch) => {
                    patchSeo(patch);
                    setDirty(true);
                  }}
                  onInsertSummaryBlock={(next) => {
                    changeBlocks(next);
                    setDirty(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-0 space-y-3 p-3">
                <CmsPanel title="Settings" description="Article summary">
                  <div className="space-y-3 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <CmsStatus tone={statusTone(form.status)} status={form.status}>
                        {form.status}
                      </CmsStatus>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Slug</span>
                      <span className="truncate font-mono text-xs text-foreground">
                        {form.slug || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Region</span>
                      <span className="text-foreground">{form.region || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Badge</span>
                      <span className="text-foreground">{form.badge_type}</span>
                    </div>
                  </div>
                </CmsPanel>
                {!isNew ? (
                  <>
                    <ArticleNotesPanel
                      articleId={id}
                      canEditorial={canWriteEditorialNotes}
                      canFactCheck={canWriteFactCheckNotes}
                    />
                    <ArticleApprovalHistoryPanel articleId={id} />
                    <CmsPanel
                      title="Version history"
                      description="Restorable snapshots from each save"
                      action={
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <History className="h-3.5 w-3.5" />
                          {revisionsQ.data?.length ?? 0}
                        </span>
                      }
                    >
                      {revisionsQ.isLoading ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                      ) : revisionsQ.isError ? (
                        <div className="p-4 text-sm text-crimson">{revisionsQ.error.message}</div>
                      ) : !revisionsQ.data?.length ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          History begins after the first update.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {revisionsQ.data.map((revision) => {
                            const snapshot = unwrapRevisionSnapshot(revision.snapshot);
                            const changer = Array.isArray(revision.changer)
                              ? revision.changer[0]?.name
                              : revision.changer?.name;
                            return (
                              <div
                                key={revision.id}
                                className="flex flex-col gap-2 px-4 py-3"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-muted text-[10px] font-bold">
                                    v{revision.version}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold">
                                      {snapshot.title ?? "Untitled revision"}
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                                      {new Date(revision.changed_at).toLocaleString()} ·{" "}
                                      {changer ?? "System"}
                                    </div>
                                  </div>
                                  <CmsStatus
                                    tone={statusTone(
                                      (snapshot.status as ArticleStatus) ?? "draft",
                                    )}
                                  >
                                    {snapshot.status ?? "draft"}
                                  </CmsStatus>
                                </div>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    className="inline-flex h-7 items-center justify-center gap-1 border border-input px-2 text-[10px] font-semibold hover:bg-accent"
                                    disabled={restore.isPending}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Restore revision v${revision.version}?`,
                                        )
                                      ) {
                                        restore.mutate(revision.id);
                                      }
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3" /> Restore
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {restore.isError && (
                        <div className="border-t border-border bg-crimson/10 px-4 py-2 text-xs text-crimson">
                          {restore.error.message}
                        </div>
                      )}
                    </CmsPanel>
                  </>
                ) : null}
              </TabsContent>
            </Tabs>
          </aside>
        ) : null}
      </form>
    </div>
  );
}

function AuthorRow({
  name,
  avatarUrl,
  note,
}: {
  name: string;
  avatarUrl?: string | null;
  note?: string;
}) {
  return (
    <>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full border border-border object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{name}</div>
        {note && <div className="text-xs text-muted-foreground">{note}</div>}
      </div>
    </>
  );
}

function LengthGuide({
  length,
  min,
  max,
}: {
  length: number;
  min: number;
  max: number;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden bg-muted">
        <div
          className={`h-full transition-all ${
            length >= min && length <= max ? "bg-cat-green" : "bg-crimson"
          }`}
          style={{ width: `${Math.min(100, (length / max) * 100)}%` }}
        />
      </div>
      <span className={`text-[10px] ${seoLengthTone(length, min, max)}`}>
        {length < min ? `${min - length} short` : length > max ? `${length - max} over` : "Good"}
      </span>
    </div>
  );
}

function GoogleSerpPreview({
  title,
  description,
  url,
  keyword,
}: {
  title: string;
  description: string;
  url: string;
  keyword: string;
}) {
  const emphasize = (text: string) => {
    if (!keyword.trim()) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <strong key={index}>{part}</strong>
      ) : (
        part
      ),
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Google SERP preview</span>
        <span className="text-[10px] text-muted-foreground">Desktop</span>
      </div>
      <div className="overflow-hidden border border-border bg-white p-4 text-[#202124] dark:bg-white">
        <div className="flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f3f4] font-bold text-[#3c4043]">
            D
          </span>
          <div className="min-w-0">
            <div className="text-[#202124]">Diplomacy Lens</div>
            <div className="max-w-full truncate text-[10px] text-[#4d5156]">
              {url || siteUrl()}
            </div>
          </div>
        </div>
        <div className="mt-2 line-clamp-1 font-sans text-lg leading-6 text-[#1a0dab]">
          {emphasize(title || "Headline appears here")}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#4d5156]">
          {emphasize(
            description ||
              "Add a meta description to explain what readers will find on this page.",
          )}
        </p>
      </div>
    </div>
  );
}

function BinaryChoice({
  label,
  value,
  trueLabel,
  falseLabel,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  trueLabel: string;
  falseLabel: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] text-muted-foreground">{label}</div>
      <div className="grid grid-cols-2 border border-input">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`h-8 text-[10px] font-semibold ${
            value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
          }`}
        >
          {trueLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`h-8 text-[10px] font-semibold ${
            !value ? "bg-crimson text-white" : "bg-background text-muted-foreground"
          }`}
        >
          {falseLabel}
        </button>
      </div>
    </div>
  );
}

function HreflangEditor({
  rows,
  readOnly,
  onChange,
}: {
  rows: Array<{ locale: string; url: string }>;
  readOnly: boolean;
  onChange: (rows: Array<{ locale: string; url: string }>) => void;
}) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-foreground">hreflang</div>
          <div className="text-[11px] text-muted-foreground">
            Alternate language or regional URLs
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange([...rows, { locale: "", url: "" }])}
            className="border border-input px-2 py-1 text-[10px] font-semibold hover:bg-accent"
          >
            + Language
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="mt-3 space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[82px_1fr_24px] gap-1">
              <input
                value={row.locale}
                disabled={readOnly}
                pattern="(?:[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?|x-default)"
                onChange={(e) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index ? { ...item, locale: e.target.value } : item,
                    ),
                  )
                }
                placeholder="en-US"
                aria-label="Language code"
                className={`${cmsInput} px-2 text-xs`}
              />
              <input
                type="url"
                value={row.url}
                disabled={readOnly}
                onChange={(e) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index ? { ...item, url: e.target.value } : item,
                    ),
                  )
                }
                placeholder="https://…"
                aria-label="Alternate URL"
                className={`${cmsInput} px-2 text-xs`}
              />
              <button
                type="button"
                disabled={readOnly}
                title="Remove alternate"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="text-muted-foreground hover:text-crimson"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialPreview({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-foreground">Card preview</div>
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        {image ? (
          <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-xs text-muted-foreground">
            Social image preview
          </div>
        )}
        <div className="p-3">
          <div className="text-[10px] uppercase text-muted-foreground">
            diplomacylens.com
          </div>
          <div className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">
            {title || "Article title"}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {description || "Article description"}
          </p>
        </div>
      </div>
    </div>
  );
}

function statusTone(status: ArticleStatus) {
  return status === "published"
    ? ("success" as const)
    : status === "review"
      ? ("warning" as const)
      : status === "scheduled"
        ? ("info" as const)
        : status === "archived"
          ? ("accent" as const)
          : ("neutral" as const);
}

function slugPreview(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "article-slug"
  );
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {hint && <span className="ml-2 text-[11px] font-normal text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

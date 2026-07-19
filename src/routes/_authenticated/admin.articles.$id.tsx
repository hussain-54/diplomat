import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
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
  updateArticleSeo,
  upsertArticle,
  uploadHeroImage,
  type ArticleApprovalAction,
  type ArticleSeoInput,
} from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";
import { RichEditor } from "@/components/cms";
import { ArticleBody } from "@/components/article-body";
import {
  DocumentEditorBar,
  type DocumentViewMode,
} from "@/components/articles/document-editor-chrome";
import {
  ArticleSettingsDrawer,
  type ArticleSettingsSection,
} from "@/components/articles/article-settings-drawer";
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
import { parseHreflang, siteUrl } from "@/lib/seo";
import { ARTICLES_STATIC_SEGMENTS } from "@/components/articles/nav";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<ArticleSettingsSection>("publishing");
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
    mutationFn: async ({
      auto: _auto,
      statusOverride,
    }: { auto?: boolean; statusOverride?: ArticleStatus } = {}) => {
      const previousStatus = articleQ.data?.status;
      const nextStatus = statusOverride ?? form.status;
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
          status: nextStatus,
          slug: form.slug || undefined,
          scheduled_at:
            nextStatus === "scheduled" && form.scheduled_at
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
        previousStatus !== nextStatus &&
        ["published", "scheduled", "archived", "review"].includes(nextStatus)
      ) {
        const action: ArticleApprovalAction | null =
          nextStatus === "published"
            ? "publish"
            : nextStatus === "scheduled"
              ? "schedule"
              : nextStatus === "archived"
                ? "archive"
                : nextStatus === "review" && previousStatus === "draft"
                  ? "submit_review"
                  : null;
        if (action) {
          try {
            await recordArticleApproval({
              data: {
                article_id: article.id,
                action,
                from_status: previousStatus,
                to_status: nextStatus,
              },
            });
          } catch {
            // Approval log is best-effort; save already succeeded.
          }
        }
      }
      return { article, nextStatus };
    },
    onSuccess: (result, variables) => {
      const article = result?.article;
      const nextStatus = result?.nextStatus;
      setDirty(false);
      setLastSavedAt(new Date());
      clearArticleDraftCache(cacheKey);
      if (article && nextStatus) {
        setForm((prev) => ({
          ...prev,
          status: nextStatus,
          slug: article.slug ?? prev.slug,
        }));
      }
      if (isNew && article?.id) {
        moveArticleDraftCache("new", article.id);
        clearArticleDraftCache("new");
      }
      if (article?.id) {
        void qc.invalidateQueries({ queryKey: ["admin-article", article.id] });
      }
      if (!isNew) {
        void qc.invalidateQueries({ queryKey: ["admin-article", id] });
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
    mutationFn: async ({ action, note }: { action: ArticleApprovalAction; note?: string }) => {
      // Always persist the canvas first so workflow never publishes stale DB content.
      if (dirty) {
        if (!form.title.trim() || !form.section_id) {
          throw new Error("Add a title and category, then try again.");
        }
        await save.mutateAsync({});
      }
      return applyArticleWorkflowAction({
        data: {
          article_id: id,
          action,
          note,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        },
      });
    },
    onSuccess: (article) => {
      setDirty(false);
      if (article?.status) {
        setForm((prev) => ({
          ...prev,
          status: article.status as ArticleStatus,
          slug: article.slug ?? prev.slug,
        }));
      }
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
  const fullscreen = viewMode === "fullscreen";
  const focusLike = viewMode === "focus" || viewMode === "fullscreen";
  const openSettings = (section: ArticleSettingsSection = "publishing") => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };
  const saveLabel =
    form.status === "published"
      ? articleQ.data?.status === "published"
        ? "Update"
        : "Publish"
      : form.status === "scheduled"
        ? "Schedule"
        : isNew
          ? "Add"
          : "Save draft";

  const saveBlockedHint = !readOnly
    ? !form.title.trim()
      ? "Add a title to save"
      : !form.section_id
        ? "Pick a category in Settings to save or publish"
        : form.status === "scheduled" && !form.scheduled_at
          ? "Set a schedule date before saving"
          : null
    : null;

  const showQuickPublish =
    canPublish &&
    !readOnly &&
    ["draft", "review"].includes(form.status) &&
    !!form.title.trim() &&
    !!form.section_id;

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
        saving={save.isPending || workflow.isPending}
        dirty={dirty}
        lastSavedAt={lastSavedAt}
        stats={writingStats}
        seoScore={seoScore}
        mode={viewMode}
        onModeChange={setViewMode}
        onSave={() => save.mutate({})}
        saveLabel={saveLabel}
        canSave={canSubmit}
        saveError={save.error?.message ?? workflow.error?.message ?? null}
        saveBlockedHint={saveBlockedHint}
        canPublish={showQuickPublish}
        onPublish={() => {
          if (
            window.confirm(
              isNew
                ? "Add and publish this article live now?"
                : "Publish this article live with your latest edits?",
            )
          ) {
            save.mutate({ statusOverride: "published" });
          }
        }}
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
        onOpenSettings={() => openSettings("publishing")}
        onOpenSeo={() => openSettings("seo")}
        onOpenAi={() => openSettings("ai")}
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
              "mx-auto w-full rounded-xl bg-background shadow-[var(--cms-shadow)]",
              focusLike ? "max-w-[720px]" : "max-w-[960px]",
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
                    onOpenAi={() => openSettings("ai")}
                    className="border-0 bg-transparent"
                  />
                </div>
              </>
            )}
          </div>
        </main>

        <ArticleSettingsDrawer
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          section={settingsSection}
          onSectionChange={setSettingsSection}
          form={form}
          patchForm={(partial) => {
            patchForm(partial);
            setDirty(true);
          }}
          seo={seo}
          patchSeo={(partial) => {
            patchSeo(partial);
            setDirty(true);
          }}
          hreflangRows={hreflangRows}
          onHreflangChange={(rows) => {
            setHreflangRows(rows);
            setDirty(true);
          }}
          readOnly={readOnly}
          isNew={isNew}
          articleId={id}
          canPublish={canPublish}
          canSubmitReview={canSubmitReview}
          canReview={canReview}
          workflowPending={workflow.isPending || save.isPending}
          onWorkflow={(action, note) => workflow.mutate({ action, note })}
          workflowError={workflow.error?.message ?? save.error?.message}
          dirty={dirty}
          sections={(sectionsQ.data ?? []).map((sec) => ({ id: sec.id, name: sec.name }))}
          tagNames={tagNames}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTag}
          onRemoveTag={(tag) => {
            setTagNames((prev) => prev.filter((t) => t !== tag));
            setDirty(true);
          }}
          allTags={(allTagsQ.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
          mayManageTags={mayManageTags}
          mayUploadMedia={mayUploadMedia}
          uploadBusy={uploadBusy}
          uploadError={uploadError}
          onUploadHero={(file) => void uploadHero(file)}
          authorName={authorName}
          authorAvatar={authorAvatar}
          authorNote={
            isNew
              ? "You will be credited as the author."
              : articleQ.data?.created_at
                ? `Created ${new Date(articleQ.data.created_at).toLocaleDateString()}`
                : undefined
          }
          blocks={blocks}
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
          canWriteEditorialNotes={canWriteEditorialNotes}
          canWriteFactCheckNotes={canWriteFactCheckNotes}
          revisions={revisionsQ.data}
          revisionsLoading={revisionsQ.isLoading}
          revisionsError={revisionsQ.error?.message}
          restorePending={restore.isPending}
          restoreError={restore.error?.message}
          onRestore={(revisionId) => restore.mutate(revisionId)}
        />
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

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}


import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  DocumentEditorBar,
  type DocumentViewMode,
} from "@/components/articles/document-editor-chrome";
import {
  ArticleInspectorRail,
  type InspectorCardId,
} from "@/components/articles/article-inspector-rail";
import { ArticleWritingCanvas } from "@/components/articles/article-writing-canvas";
import {
  ArticleEditorTabs,
  ArticleLiveAnalysis,
  type ArticleEditorTabId,
} from "@/components/articles/article-editor-tabs";
import { computeArticleSeoScore } from "@/components/articles/articles-filters";
import { computeAllArticleScores } from "@/lib/article-scores";
import { computeEditorSeoInsights } from "@/lib/editor-seo-insights";
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
import { toast } from "sonner";

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
  const [inspectorCard, setInspectorCard] = useState<InspectorCardId | null>("publishing");
  const [editorTab, setEditorTab] = useState<ArticleEditorTabId>("content");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [publishNotice, setPublishNotice] = useState<{ title: string; slug?: string } | null>(
    null,
  );
  const [publishing, setPublishing] = useState(false);
  const [publishIntentKey, setPublishIntentKey] = useState(0);
  const hydratedRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
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
  const allScores = useMemo(
    () =>
      computeAllArticleScores({
        title: form.title,
        slug: form.slug,
        deck: form.deck,
        body: serializeBlocks(blocks),
        seo_title: seo.seo_title,
        meta_description: seo.meta_description,
        focus_keyword: seo.focus_keyword,
        hero_image_url: form.hero_image_url,
        author_id: meQ.data?.userId,
        schema_type: seo.schema_type,
        robots_index: seo.robots_index,
        google_news: false,
      }),
    [form, seo, blocks, meQ.data?.userId],
  );
  const seoInsights = useMemo(
    () =>
      computeEditorSeoInsights({
        title: form.title,
        deck: form.deck,
        blocks,
        seo,
        seoScore,
      }),
    [form.title, form.deck, blocks, seo, seoScore],
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
      // Autosave never publishes — only explicit Publish now / statusOverride does.
      let nextStatus = statusOverride ?? form.status;
      if (_auto) {
        nextStatus =
          form.status === "published" || form.status === "scheduled" || form.status === "archived"
            ? ((articleQ.data?.status as ArticleStatus) ?? "draft")
            : form.status;
        if (nextStatus === "published" || nextStatus === "scheduled") {
          nextStatus = "draft";
        }
      } else if (!statusOverride) {
        // Save draft / Update live never promote to published — only Confirm publish does.
        if (nextStatus === "published" && previousStatus !== "published") {
          nextStatus = (previousStatus as ArticleStatus) ?? "draft";
        }
      }
      if (statusOverride === "published") setPublishing(true);
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
      setPublishing(false);
      clearArticleDraftCache(cacheKey);
      if (article && nextStatus) {
        setForm((prev) => ({
          ...prev,
          status: nextStatus,
          slug: article.slug ?? prev.slug,
        }));
      }
      // Success banner only after an explicit Publish now action — never on autosave/update.
      if (variables?.statusOverride === "published") {
        setPublishNotice({
          title: article?.title ?? form.title,
          slug: article?.slug ?? form.slug,
        });
        toast.success("Article published", {
          description: "It’s live on the public site.",
        });
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
    onError: () => {
      setPublishing(false);
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
  const liveUrl = publicSlug ? `${siteUrl()}/article/${publicSlug}` : null;
  const fullscreen = viewMode === "fullscreen";
  const focusLike = viewMode === "focus" || viewMode === "fullscreen";
  const openInspector = (section: InspectorCardId = "publishing") => {
    setInspectorCard(section);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      setMobileInspectorOpen(true);
    }
  };
  const saveLabel =
    form.status === "published"
      ? "Save changes"
      : form.status === "scheduled"
        ? "Save schedule"
        : "Save draft";

  const saveBlockedHint = !readOnly
    ? !form.title.trim()
      ? "Add a title to save"
      : !form.section_id
        ? "Pick a category in Story settings to save or publish"
        : form.status === "scheduled" && !form.scheduled_at
          ? "Set a schedule date before saving"
          : null
    : null;

  // Show Publish now whenever the editor may publish — disabled until title + category are set.
  const showQuickPublish =
    canPublish && !readOnly && !["published", "archived"].includes(form.status);

  const runPublish = () => {
    if (!canSubmit) return;
    setPublishing(true);
    save.mutate({ statusOverride: "published" });
  };

  const requestPublish = () => {
    if (!canSubmit) {
      toast.error(saveBlockedHint ?? "Add a title and category before publishing");
      return;
    }
    setPublishIntentKey((k) => k + 1);
  };

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
        "cms-app flex min-h-[calc(100vh-4rem)] flex-col bg-[#f7f8fa]",
        fullscreen && "fixed inset-0 z-50 overflow-hidden bg-background",
      )}
    >
      <DocumentEditorBar
        title={form.title}
        status={form.status}
        saving={save.isPending && !publishing}
        publishing={publishing}
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
        canPublish={showQuickPublish || (canPublish && form.status === "published")}
        canChangeStatus={!readOnly && (canPublish || canSubmitReview)}
        publishNotice={publishNotice}
        onDismissPublishNotice={() => setPublishNotice(null)}
        liveUrl={liveUrl}
        onStatusChange={(next) => {
          if (next === "published") {
            // Dialog in the bar handles confirmation; this path is unused for published.
            return;
          }
          if (next === "scheduled" && !form.scheduled_at) {
            openInspector("publishing");
            patchForm({ status: "scheduled" });
            return;
          }
          patchForm({ status: next });
        }}
        onPublish={runPublish}
        publishIntentKey={publishIntentKey}
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
        onOpenSettings={() => openInspector("publishing")}
        onOpenSeo={() => openInspector("seo")}
        onOpenAi={() => openInspector("ai")}
      />

      {!focusLike ? (
        <ArticleEditorTabs
          active={editorTab}
          onChange={(tab) => {
            setEditorTab(tab);
            const map: Partial<Record<ArticleEditorTabId, InspectorCardId>> = {
              media: "featured",
              categories: "categories",
              publishing: "publishing",
              seo: "seo",
              "local-seo": "seo",
              "google-news": "publishing",
              eeat: "seo",
              schema: "seo",
              social: "social",
              ai: "ai",
            };
            if (map[tab]) {
              setInspectorCard(map[tab]!);
              setMobileInspectorOpen(true);
            }
          }}
        />
      ) : null}

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
        className={cn("flex min-h-0 flex-1", fullscreen && "overflow-hidden")}
      >
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto",
            focusLike ? "px-4 py-8 sm:px-8 sm:py-10" : "px-3 py-5 sm:px-6 sm:py-7 xl:px-8",
          )}
        >
          <ArticleWritingCanvas
            viewMode={viewMode}
            readOnly={readOnly}
            form={{
              title: form.title,
              deck: form.deck,
              slug: form.slug,
              hero_image_url: form.hero_image_url,
            }}
            onTitleChange={(title) => patchForm({ title })}
            onDeckChange={(deck) => patchForm({ deck })}
            onSlugChange={(slug) => {
              patchForm({ slug });
              setDirty(true);
            }}
            titleInputRef={titleInputRef}
            authorName={authorName}
            authorAvatar={authorAvatar}
            authorNote={
              !isNew && articleQ.data?.created_at
                ? new Date(articleQ.data.created_at).toLocaleDateString()
                : isNew
                  ? "You will be credited as the author."
                  : undefined
            }
            blocks={blocks}
            onBlocksChange={changeBlocks}
            onUploadImage={mayUploadMedia ? uploadImage : undefined}
            onOpenAi={() => openInspector("ai")}
            focusLike={focusLike}
          />
        </main>

        {!focusLike ? (
          <div className="flex w-full max-w-[420px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border/60 bg-[#f7f8fa] p-3 xl:max-w-[440px]">
            <ArticleLiveAnalysis
              wordCount={allScores.word_count || writingStats.words}
              readingMinutes={allScores.reading_minutes || Math.max(1, Math.ceil(writingStats.words / 220))}
              seoScore={Math.max(seoScore, allScores.seo_score)}
              contentScore={allScores.content_score}
              eeatScore={allScores.eeat_score}
              checklist={[
                { label: "Keyword in title", ok: Boolean(seo.focus_keyword && form.title.toLowerCase().includes(seo.focus_keyword.toLowerCase())) },
                { label: "Meta description", ok: Boolean((seo.meta_description || "").length >= 50) },
                { label: "Featured image", ok: Boolean(form.hero_image_url) },
                { label: "Category selected", ok: Boolean(form.section_id) },
                { label: "Slug set", ok: Boolean(form.slug.trim()) },
                { label: "Body length 300+", ok: allScores.word_count >= 300 },
              ]}
            />
            <ArticleInspectorRail
            mobileOpen={mobileInspectorOpen}
            onMobileOpenChange={setMobileInspectorOpen}
            openCard={inspectorCard}
            onOpenCard={setInspectorCard}
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
            onWorkflow={(action, note) => {
              if (action === "publish") {
                requestPublish();
                return;
              }
              workflow.mutate({ action, note });
            }}
            onRequestPublish={requestPublish}
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
            insights={seoInsights}
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
          </div>
        ) : null}
      </form>
    </div>
  );
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}


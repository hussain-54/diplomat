import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminArticle,
  getArticleTags,
  getMe,
  listTags,
  recordArticleApproval,
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
import { CreateArticleWorkspace } from "@/components/articles/create-article-workspace";
import type { ArticleEditorTabId } from "@/components/articles/article-editor-tabs";
import {
  AiTabPanel,
  CategoriesTabPanel,
  EeatTabPanel,
  GoogleNewsTabPanel,
  LocalSeoTabPanel,
  MediaTabPanel,
  PublishingTabPanel,
  SchemaTabPanel,
  SeoTabPanel,
  SocialTabPanel,
} from "@/components/articles/article-editor-tab-panels";
import { computeArticleSeoScore } from "@/components/articles/articles-filters";
import { computeAllArticleScores } from "@/lib/article-scores";
import {
  DEFAULT_CMS_EXTRAS,
  mergeCmsExtras,
  parseCmsExtras,
  type ArticleCmsExtras,
} from "@/lib/article-cms-extras";
import {
  clearArticleDraftCache,
  loadArticleDraftCache,
  moveArticleDraftCache,
  saveArticleDraftCache,
  type ArticleDraftCachePayload,
} from "@/lib/article-draft-cache";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";
import { parseBody, parseBodyExtras, serializeBlocks, type ArticleBodyExtras, type Block } from "@/lib/blocks";
import { computeWritingStats } from "@/lib/writing-stats";
import { parseHreflang } from "@/lib/seo";
import { ARTICLES_STATIC_SEGMENTS } from "@/components/articles/nav";
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
  const [bodyExtras, setBodyExtras] = useState<ArticleBodyExtras>({});
  const [cmsExtras, setCmsExtras] = useState<ArticleCmsExtras>(() => ({ ...DEFAULT_CMS_EXTRAS }));
  const [googleNews, setGoogleNews] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftRecovery, setDraftRecovery] = useState<ArticleDraftCachePayload | null>(null);
  const [editorTab, setEditorTab] = useState<ArticleEditorTabId>("content");
  const [publishing, setPublishing] = useState(false);
  const hydratedRef = useRef(false);
  const cacheKey = isNew ? "new" : id;

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
        body: serializeBlocks(blocks, bodyExtras),
        seo_title: seo.seo_title,
        meta_description: seo.meta_description,
        focus_keyword: seo.focus_keyword,
        hero_image_url: form.hero_image_url,
        author_id: meQ.data?.userId,
        schema_type: seo.schema_type,
        robots_index: seo.robots_index,
        google_news: false,
      }),
    [form, seo, blocks, bodyExtras, meQ.data?.userId],
  );

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
      setBodyExtras(parseBodyExtras(articleQ.data.body));
      setCmsExtras(parseCmsExtras((articleQ.data as { cms_extras?: unknown }).cms_extras));
      setGoogleNews(Boolean((articleQ.data as { google_news?: boolean }).google_news));
      setIsFeatured(Boolean((articleQ.data as { is_featured?: boolean }).is_featured));
      const expiry = (articleQ.data as { expiry_at?: string | null }).expiry_at;
      setExpiryEnabled(Boolean(expiry));
      setScheduleEnabled(Boolean(articleQ.data.scheduled_at));
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

  // Persist unsaved work locally for recovery.
  useEffect(() => {
    if (!dirty || readOnly) return;
    const timer = setTimeout(() => {
      saveArticleDraftCache(cacheKey, {
        savedAt: new Date().toISOString(),
        form: { ...form },
        blocks,
        bodyExtras: { ...bodyExtras },
        tagNames,
        seo: { ...seo },
        hreflangRows,
      });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, form, blocks, bodyExtras, tagNames, seo, hreflangRows, cacheKey, readOnly]);

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
    if (cached.bodyExtras) {
      setBodyExtras(cached.bodyExtras as ArticleBodyExtras);
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
          body: serializeBlocks(blocks, bodyExtras),
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
          google_news: googleNews,
          is_featured: isFeatured,
          cms_extras: cmsExtras as Record<string, unknown>,
          expiry_at:
            expiryEnabled && cmsExtras.expiry_at
              ? new Date(cmsExtras.expiry_at).toISOString()
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

  const saveBlockedHint = !readOnly
    ? !form.title.trim()
      ? "Add a title to save"
      : !form.section_id
        ? "Pick a category in Categories to save or publish"
        : form.status === "scheduled" && !form.scheduled_at
          ? "Set a schedule date before saving"
          : null
    : null;

  const showQuickPublish =
    canPublish && !readOnly && !["published", "archived"].includes(form.status);

  const runPublish = () => {
    if (!canSubmit) return;
    setPublishing(true);
    save.mutate({ statusOverride: "published" });
  };

  const seoChecklist = [
    { label: "SEO Title", ok: Boolean((seo.seo_title || form.title).trim()) },
    { label: "Meta Description", ok: Boolean((seo.meta_description || "").length >= 50) },
    { label: "Focus Keyword", ok: Boolean(seo.focus_keyword?.trim()) },
    { label: "Image Alt Text", ok: Boolean(cmsExtras.media?.alt_text?.trim()) },
    { label: "Internal Links", ok: (cmsExtras.related_article_ids?.length ?? 0) > 0 },
    { label: "External Links", ok: Boolean(cmsExtras.references?.some((r) => r.url.trim())) },
    { label: "Schema Markup", ok: Boolean(seo.schema_type) },
    { label: "Open Graph", ok: Boolean((seo.og_title || form.title).trim() && (seo.og_description || seo.meta_description)) },
    { label: "Featured Image", ok: Boolean(form.hero_image_url) },
    { label: "Content Length", ok: allScores.word_count >= 300 },
  ];

  const otherTabContent = (
    <>
      {editorTab === "media" ? (
        <MediaTabPanel
          heroUrl={form.hero_image_url}
          onHeroUrl={(url) => patchForm({ hero_image_url: url })}
          media={cmsExtras.media ?? {}}
          onMedia={(media) => {
            setCmsExtras((c) => mergeCmsExtras(c, { media }));
            setDirty(true);
          }}
          readOnly={readOnly}
          mayUpload={mayUploadMedia}
          onUpload={uploadImage}
          uploadBusy={uploadBusy}
          uploadError={uploadError}
        />
      ) : null}
      {editorTab === "categories" ? (
        <CategoriesTabPanel
          sectionId={form.section_id}
          onSectionId={(section_id) => patchForm({ section_id })}
          sections={(sectionsQ.data ?? []).map((s) => ({ id: s.id, name: s.name }))}
          tagNames={tagNames}
          tagDraft={tagDraft}
          onTagDraft={setTagDraft}
          onAddTag={() => {
            const name = tagDraft.trim();
            if (!name || tagNames.includes(name)) return;
            setTagNames((t) => [...t, name]);
            setTagDraft("");
            setDirty(true);
          }}
          onRemoveTag={(name) => {
            setTagNames((t) => t.filter((x) => x !== name));
            setDirty(true);
          }}
          allTags={(allTagsQ.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
          featured={isFeatured}
          onFeatured={(v) => {
            setIsFeatured(v);
            setDirty(true);
          }}
          onSelectExistingTag={(name) => {
            if (!name || tagNames.includes(name)) return;
            setTagNames((t) => [...t, name]);
            setDirty(true);
          }}
          readOnly={readOnly}
        />
      ) : null}
      {editorTab === "publishing" ? (
        <PublishingTabPanel
          status={form.status}
          scheduledAt={form.scheduled_at}
          expiryAt={cmsExtras.expiry_at ? toDateTimeLocal(cmsExtras.expiry_at) : ""}
          region={form.region}
          visibility={cmsExtras.visibility ?? "public"}
          articleType={cmsExtras.article_type ?? "news"}
          onStatus={(status) => patchForm({ status })}
          onScheduledAt={(scheduled_at) => patchForm({ scheduled_at })}
          onExpiryAt={(v) => {
            setCmsExtras((c) => mergeCmsExtras(c, { expiry_at: v || null }));
            setExpiryEnabled(Boolean(v));
            setDirty(true);
          }}
          onRegion={(region) => patchForm({ region })}
          onVisibility={(visibility) => {
            setCmsExtras((c) => mergeCmsExtras(c, { visibility }));
            setDirty(true);
          }}
          onArticleType={(article_type) => {
            setCmsExtras((c) => mergeCmsExtras(c, { article_type }));
            setDirty(true);
          }}
          readOnly={readOnly}
          canPublish={canPublish}
        />
      ) : null}
      {editorTab === "seo" ? (
        <SeoTabPanel
          seo={seo}
          onSeo={(patch) => patchSeo(patch)}
          secondaryKeywords={cmsExtras.secondary_keywords ?? ""}
          onSecondaryKeywords={(secondary_keywords) => {
            setCmsExtras((c) => mergeCmsExtras(c, { secondary_keywords }));
            setDirty(true);
          }}
          readOnly={readOnly}
          seoScore={Math.max(seoScore, allScores.seo_score)}
          slug={form.slug}
          titleFallback={form.title}
          deckFallback={form.deck}
          heroImageUrl={form.hero_image_url}
          hreflangRows={hreflangRows}
          onHreflangChange={(rows) => {
            setHreflangRows(rows);
            setDirty(true);
          }}
        />
      ) : null}
      {editorTab === "local-seo" ? (
        <LocalSeoTabPanel
          local={cmsExtras.local_seo ?? {}}
          onLocal={(local_seo) => {
            setCmsExtras((c) => mergeCmsExtras(c, { local_seo }));
            setDirty(true);
          }}
          readOnly={readOnly}
        />
      ) : null}
      {editorTab === "google-news" ? (
        <GoogleNewsTabPanel
          gnews={cmsExtras.google_news ?? {}}
          onGnews={(google_news) => {
            setCmsExtras((c) => mergeCmsExtras(c, { google_news }));
            setDirty(true);
          }}
          googleNewsFlag={googleNews}
          onGoogleNewsFlag={(v) => {
            setGoogleNews(v);
            setDirty(true);
          }}
          readOnly={readOnly}
        />
      ) : null}
      {editorTab === "eeat" ? (
        <EeatTabPanel
          eeat={cmsExtras.eeat ?? {}}
          onEeat={(eeat) => {
            setCmsExtras((c) => mergeCmsExtras(c, { eeat }));
            setDirty(true);
          }}
          eeatScore={allScores.eeat_score}
          readOnly={readOnly}
        />
      ) : null}
      {editorTab === "schema" ? (
        <SchemaTabPanel
          schemaType={seo.schema_type ?? "NewsArticle"}
          onSchemaType={(schema_type) => patchSeo({ schema_type })}
          title={form.title}
          slug={form.slug}
          metaDescription={seo.meta_description ?? ""}
          faqEnabled={bodyExtras.faq_enabled}
          faqItems={bodyExtras.faq_items}
          readOnly={readOnly}
        />
      ) : null}
      {editorTab === "social" ? (
        <SocialTabPanel
          seo={seo}
          onSeo={(patch) => patchSeo(patch)}
          title={form.title}
          readOnly={readOnly}
        />
      ) : null}
      {editorTab === "ai" ? (
        <AiTabPanel
          title={form.title}
          deck={form.deck}
          blocks={blocks}
          readOnly={readOnly}
          onApplyTitle={(title) => patchForm({ title })}
          onApplyDeck={(deck) => patchForm({ deck })}
          onApplyMeta={(meta) => patchSeo(meta)}
          onInsertSummaryBlock={(next) => changeBlocks(next)}
        />
      ) : null}
    </>
  );

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
    <CreateArticleWorkspace
      isNew={isNew}
      articleId={id}
      activeTab={editorTab}
      onTabChange={setEditorTab}
      title={form.title}
      deck={form.deck}
      slug={form.slug}
      articleType={cmsExtras.article_type || "news"}
      summary={seo.meta_description ?? ""}
      status={form.status}
      scheduledAt={form.scheduled_at || undefined}
      scheduleOn={scheduleEnabled}
      expiryOn={expiryEnabled}
      onTitleChange={(title) => patchForm({ title })}
      onDeckChange={(deck) => patchForm({ deck })}
      onSlugChange={(slug) => {
        patchForm({ slug });
        setDirty(true);
      }}
      onArticleTypeChange={(article_type) => {
        setCmsExtras((c) => mergeCmsExtras(c, { article_type }));
        setDirty(true);
      }}
      onSummaryChange={(value) => patchSeo({ meta_description: value })}
      onScheduleOn={(v) => {
        setScheduleEnabled(v);
        if (v && !form.scheduled_at) setEditorTab("publishing");
        if (!v) {
          patchForm({
            scheduled_at: "",
            status: form.status === "scheduled" ? "draft" : form.status,
          });
        }
      }}
      onExpiryOn={(v) => {
        setExpiryEnabled(v);
        if (!v) {
          setCmsExtras((c) => mergeCmsExtras(c, { expiry_at: null }));
          setDirty(true);
        } else {
          setEditorTab("publishing");
        }
      }}
      onOpenPublishing={() => setEditorTab("publishing")}
      onOpenSeo={() => setEditorTab("seo")}
      blocks={blocks}
      onBlocksChange={changeBlocks}
      onUploadImage={mayUploadMedia ? uploadImage : undefined}
      readOnly={readOnly}
      wordCount={allScores.word_count || writingStats.words}
      charCount={writingStats.characters}
      readingMinutes={allScores.reading_minutes || Math.max(1, Math.ceil(writingStats.words / 220))}
      lastSavedAt={lastSavedAt}
      dirty={dirty}
      saving={save.isPending && !publishing}
      publishing={publishing}
      canSave={canSubmit}
      canPublish={showQuickPublish || (canPublish && form.status === "published")}
      canSubmitReview={canSubmitReview && !readOnly}
      saveBlockedHint={saveBlockedHint}
      seoScore={Math.max(seoScore, allScores.seo_score)}
      contentScore={allScores.content_score}
      eeatScore={allScores.eeat_score}
      checklist={seoChecklist}
      onSave={() => save.mutate({})}
      onSubmitReview={() => {
        if (!canSubmit) {
          toast.error(saveBlockedHint ?? "Add a title and category first");
          return;
        }
        patchForm({ status: "review" });
        save.mutate({ statusOverride: "review" });
      }}
      onPublish={runPublish}
      onSchedulePublish={() => {
        setEditorTab("publishing");
        patchForm({ status: "scheduled" });
      }}
      otherTabContent={otherTabContent}
      banners={
        <>
          {draftRecovery ? (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Local draft from{" "}
                <span className="font-medium">{new Date(draftRecovery.savedAt).toLocaleString()}</span> available.
              </div>
              <div className="flex shrink-0 gap-3">
                <button type="button" className="text-xs font-semibold hover:underline" onClick={applyDraftRecovery}>
                  Recover
                </button>
                <button type="button" className="text-xs font-medium hover:underline" onClick={discardDraftRecovery}>
                  Discard
                </button>
              </div>
            </div>
          ) : null}
          {!canPublish ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
              {protectedReadOnly
                ? "Read-only in this workflow state — an editor must make changes."
                : "You can save draft or in review only. A section editor must publish."}
            </div>
          ) : null}
        </>
      }
    />
  );
}


function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}


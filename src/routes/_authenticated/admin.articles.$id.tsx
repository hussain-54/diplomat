import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, History, Loader2, RotateCcw, X } from "lucide-react";
import {
  getAdminArticle,
  getArticleRevisions,
  getArticleTags,
  getMe,
  listTags,
  restoreArticleRevision,
  setArticleTags,
  updateArticleSeo,
  upsertArticle,
  uploadHeroImage,
  type ArticleSeoInput,
} from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { useState, useEffect, useCallback } from "react";
import type { Database } from "@/integrations/supabase/types";
import { CmsPageHeader, CmsPanel, CmsStatus, cmsButton, cmsInput } from "@/components/cms-ui";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";
import { BlockEditor } from "@/components/block-editor";
import { parseBody, serializeBlocks, type Block } from "@/lib/blocks";
import { parseHreflang, seoLengthTone, siteUrl } from "@/lib/seo";

type ArticleStatus = Database["public"]["Enums"]["article_status"];

export const Route = createFileRoute("/_authenticated/admin/articles/$id")({
  beforeLoad: ({ context, params }) =>
    requirePermissionRoute(
      context.roles,
      params.id === "new" ? "articles:create" : "articles:view",
    ),
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleQ.data]);

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

  const save = useMutation({
    mutationFn: async ({ auto: _auto }: { auto?: boolean } = {}) => {
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
      return article;
    },
    onSuccess: (article, variables) => {
      setDirty(false);
      setLastSavedAt(new Date());
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["article-revisions", id] });
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
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Editorial workspace"
        title={isNew ? "Create article" : "Edit article"}
        description={isNew ? "Draft a new story for the newsroom." : `Editing ${articleQ.data?.slug ?? "article"}`}
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator saving={save.isPending} dirty={dirty} lastSavedAt={lastSavedAt} autosave={autosaveEligible || (!isNew && ["draft", "review"].includes(form.status))} />
            <Link to="/admin/articles" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              ← Back to articles
            </Link>
          </div>
        }
      />
      {!canPublish && (
        <div className="border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-muted-foreground">
          {protectedReadOnly ? (
            <>This article is read-only in its current workflow state. An editor must make changes.</>
          ) : (
            <>
              Your role can save <strong>draft</strong> or <strong>in review</strong> only. A section
              editor or super admin must publish.
            </>
          )}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) save.mutate({});
        }}
        onKeyDown={(e) => {
          // Prevent implicit form submission when pressing Enter in text inputs.
          if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
          }
        }}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
      >
        {/* LEFT — content editor */}
        <div className="min-w-0 space-y-4">
          <CmsPanel>
            <div className="space-y-4 p-5">
              <input
                required
                disabled={readOnly}
                value={form.title}
                onChange={(e) => patchForm({ title: e.target.value })}
                placeholder="Headline"
                className="w-full border-0 border-b border-input bg-transparent pb-2 font-serif text-3xl text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-ring"
              />
              <textarea
                disabled={readOnly}
                value={form.deck}
                onChange={(e) => patchForm({ deck: e.target.value })}
                rows={2}
                placeholder="Summary / deck — one or two sentences shown under the headline"
                className="w-full resize-none border-0 bg-transparent font-serif text-lg leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </CmsPanel>
          <CmsPanel title="Story content" description="Compose with blocks — drag to reorder, Ctrl+Enter for a new paragraph">
            <BlockEditor
              value={blocks}
              onChange={changeBlocks}
              readOnly={readOnly}
              onUploadImage={mayUploadMedia ? uploadImage : undefined}
            />
          </CmsPanel>
        </div>

        {/* RIGHT — sidebar */}
        <aside className="space-y-4">
          <CmsPanel title="Publishing" description="Workflow status and distribution">
            <div className="space-y-4 p-5">
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
                  {["none", "breaking", "live", "exclusive", "opinion", "premium", "alert"].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
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
                <CmsStatus tone={statusTone(form.status)}>{form.status}</CmsStatus>
              </div>
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

          <CmsPanel title="SEO" description="Search metadata, robots, schema, and international targeting">
            <div className="space-y-5 p-5">
              <Field label="SEO title" hint={`${(seo.seo_title || form.title).length}/60`}>
                <input
                  value={seo.seo_title ?? ""}
                  disabled={readOnly}
                  maxLength={120}
                  onChange={(e) => patchSeo({ seo_title: e.target.value })}
                  placeholder={form.title || "Custom search title"}
                  className={cmsInput}
                />
                <LengthGuide
                  length={(seo.seo_title || form.title).length}
                  min={30}
                  max={60}
                />
              </Field>
              <Field
                label="Meta description"
                hint={`${(seo.meta_description || form.deck).length}/160`}
              >
                <textarea
                  value={seo.meta_description ?? ""}
                  disabled={readOnly}
                  maxLength={320}
                  rows={3}
                  onChange={(e) => patchSeo({ meta_description: e.target.value })}
                  placeholder={form.deck || "Describe this story for search results"}
                  className={`${cmsInput} h-auto py-2`}
                />
                <LengthGuide
                  length={(seo.meta_description || form.deck).length}
                  min={120}
                  max={160}
                />
              </Field>
              <Field label="Focus keyword">
                <input
                  value={seo.focus_keyword ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patchSeo({ focus_keyword: e.target.value })}
                  placeholder="e.g. UN Security Council"
                  className={cmsInput}
                />
              </Field>
              <Field label="URL slug" hint="auto-generated if blank">
                <input
                  value={form.slug}
                  disabled={readOnly}
                  onChange={(e) => patchForm({ slug: e.target.value })}
                  className={cmsInput}
                />
              </Field>
              <Field label="Canonical URL" hint="leave blank to use article URL">
                <input
                  type="url"
                  value={seo.canonical_url ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patchSeo({ canonical_url: e.target.value })}
                  placeholder={`${siteUrl()}/article/${form.slug || slugPreview(form.title)}`}
                  className={cmsInput}
                />
              </Field>

              <GoogleSerpPreview
                title={seo.seo_title || form.title}
                description={seo.meta_description || form.deck}
                url={
                  seo.canonical_url ||
                  `${siteUrl()}/article/${form.slug || slugPreview(form.title)}`
                }
                keyword={seo.focus_keyword || ""}
              />

              <div className="border-t border-border pt-4">
                <div className="mb-3 text-xs font-semibold text-foreground">Robots</div>
                <div className="grid grid-cols-2 gap-2">
                  <BinaryChoice
                    label="Search index"
                    value={seo.robots_index}
                    trueLabel="Index"
                    falseLabel="NoIndex"
                    disabled={readOnly}
                    onChange={(value) => patchSeo({ robots_index: value })}
                  />
                  <BinaryChoice
                    label="Link crawling"
                    value={seo.robots_follow}
                    trueLabel="Follow"
                    falseLabel="NoFollow"
                    disabled={readOnly}
                    onChange={(value) => patchSeo({ robots_follow: value })}
                  />
                </div>
              </div>

              <Field label="Schema type">
                <select
                  value={seo.schema_type}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchSeo({ schema_type: e.target.value as ArticleSeoInput["schema_type"] })
                  }
                  className={cmsInput}
                >
                  <option value="NewsArticle">NewsArticle</option>
                  <option value="Article">Article</option>
                  <option value="Review">Review</option>
                  <option value="Report">Report</option>
                </select>
              </Field>

              <div className="border-t border-border pt-4">
                <div className="mb-3 text-xs font-semibold text-foreground">
                  Distribution
                </div>
                <label className="flex items-center justify-between gap-3 border border-border p-3">
                  <span>
                    <span className="block text-xs font-semibold text-foreground">
                      RSS inclusion
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      Include this story in the public RSS feed
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={seo.rss_inclusion}
                    disabled={readOnly}
                    onChange={(e) => patchSeo({ rss_inclusion: e.target.checked })}
                  />
                </label>
              </div>

              <HreflangEditor
                rows={hreflangRows}
                readOnly={readOnly}
                onChange={(rows) => {
                  setHreflangRows(rows);
                  setDirty(true);
                }}
              />
            </div>
          </CmsPanel>

          <CmsPanel title="Social" description="Open Graph and Twitter card overrides">
            <div className="space-y-4 p-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Open Graph
              </div>
              <Field label="OG title" hint="falls back to SEO title">
                <input
                  value={seo.og_title ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patchSeo({ og_title: e.target.value })}
                  className={cmsInput}
                />
              </Field>
              <Field label="OG description" hint="falls back to meta description">
                <textarea
                  value={seo.og_description ?? ""}
                  disabled={readOnly}
                  rows={2}
                  onChange={(e) => patchSeo({ og_description: e.target.value })}
                  className={`${cmsInput} h-auto py-2`}
                />
              </Field>
              <Field label="OG image URL" hint="falls back to lead image">
                <input
                  value={seo.og_image_url ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patchSeo({ og_image_url: e.target.value })}
                  className={cmsInput}
                />
              </Field>

              <div className="border-t border-border pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Twitter / X
              </div>
              <Field label="Card type">
                <select
                  value={seo.twitter_card}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchSeo({
                      twitter_card: e.target.value as ArticleSeoInput["twitter_card"],
                    })
                  }
                  className={cmsInput}
                >
                  <option value="summary_large_image">Large image</option>
                  <option value="summary">Summary</option>
                </select>
              </Field>
              <Field label="Twitter title" hint="falls back to OG title">
                <input
                  value={seo.twitter_title ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patchSeo({ twitter_title: e.target.value })}
                  className={cmsInput}
                />
              </Field>
              <Field label="Twitter description">
                <textarea
                  value={seo.twitter_description ?? ""}
                  disabled={readOnly}
                  rows={2}
                  onChange={(e) => patchSeo({ twitter_description: e.target.value })}
                  className={`${cmsInput} h-auto py-2`}
                />
              </Field>
              <Field label="Twitter image URL">
                <input
                  value={seo.twitter_image_url ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patchSeo({ twitter_image_url: e.target.value })}
                  className={cmsInput}
                />
              </Field>
              <SocialPreview
                title={seo.og_title || seo.seo_title || form.title}
                description={
                  seo.og_description || seo.meta_description || form.deck
                }
                image={seo.og_image_url || form.hero_image_url}
              />
            </div>
          </CmsPanel>

          <CmsPanel title="Categories" description="Section placement for this story">
            <div className="p-5">
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

          <CmsPanel title="Tags" description="Topics for discovery and related coverage">
            <div className="space-y-3 p-5">
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
                      .filter((t) => !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()))
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

          <CmsPanel title="Media" description="Lead image · JPEG, PNG, WebP, or GIF · max 5 MB">
            <div className="space-y-3 p-5">
              {form.hero_image_url && (
                <img
                  src={form.hero_image_url}
                  alt={form.title || "Article hero"}
                  className="aspect-video w-full border border-border object-cover"
                />
              )}
              {mayUploadMedia && !readOnly && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadHero(f);
                  }}
                  className="w-full text-xs text-muted-foreground"
                />
              )}
              {uploadBusy && <div className="text-xs text-muted-foreground">Uploading…</div>}
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

          <CmsPanel title="Author" description="Byline for this story">
            <div className="flex items-center gap-3 p-5">
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
        </aside>
      </form>

      {!isNew && (
        <CmsPanel
          title="Version History"
          description="Every saved change creates a restorable snapshot."
          action={
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              {revisionsQ.data?.length ?? 0} revisions
            </span>
          }
        >
          {revisionsQ.isLoading ? (
            <div className="p-5 text-sm text-muted-foreground">Loading revision history…</div>
          ) : revisionsQ.isError ? (
            <div className="p-5 text-sm text-crimson">{revisionsQ.error.message}</div>
          ) : !revisionsQ.data?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Revision history begins after the first update.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {revisionsQ.data.map((revision) => {
                const snapshot = revision.snapshot as unknown as {
                  status?: ArticleStatus;
                  title?: string;
                };
                const changer = Array.isArray(revision.changer)
                  ? revision.changer[0]?.name
                  : revision.changer?.name;
                return (
                  <div key={revision.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex h-8 w-8 items-center justify-center bg-muted text-xs font-bold">
                      v{revision.version}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {snapshot.title ?? "Untitled revision"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(revision.changed_at).toLocaleString()} · {changer ?? "System"}
                      </div>
                    </div>
                    <CmsStatus tone={statusTone(snapshot.status ?? "draft")}>
                      {snapshot.status ?? "draft"}
                    </CmsStatus>
                    {!readOnly && (
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1 border border-input px-2 text-xs font-semibold hover:bg-accent"
                        disabled={restore.isPending}
                        onClick={() => {
                          if (window.confirm(`Restore revision v${revision.version}?`)) {
                            restore.mutate(revision.id);
                          }
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {restore.isError && (
            <div className="border-t border-border bg-crimson/10 px-5 py-3 text-xs text-crimson">
              {restore.error.message}
            </div>
          )}
        </CmsPanel>
      )}
    </div>
  );
}

function SaveIndicator({
  saving,
  dirty,
  lastSavedAt,
  autosave,
}: {
  saving: boolean;
  dirty: boolean;
  lastSavedAt: Date | null;
  autosave: boolean;
}) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="text-xs text-gold">
        Unsaved changes{autosave ? " · autosave on" : ""}
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-cat-green">
        <CheckCircle2 className="h-3.5 w-3.5" /> Saved{" "}
        {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  return null;
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
          ? ("danger" as const)
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

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Crop,
  FileCode2,
  FolderTree,
  Globe2,
  History,
  ImageIcon,
  LayoutTemplate,
  Replace,
  Send,
  Share2,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import { ArticleAiAssistantPanel } from "@/components/articles/ai-assistant-panel";
import {
  ArticleApprovalHistoryPanel,
  ArticleNotesPanel,
  WorkflowActions,
} from "@/components/articles/article-edit-panels";
import { CmsStatus, cmsInput, MediaUploader, SEOForm } from "@/components/cms";
import type { SEOFormValue } from "@/components/cms";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ArticleStatus } from "@/components/articles/articles-filters";
import type { Block } from "@/lib/blocks";
import type { EditorSeoInsights } from "@/lib/editor-seo-insights";
import { siteUrl } from "@/lib/seo";
import { unwrapRevisionSnapshot, type ArticleApprovalAction } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export type InspectorCardId =
  | "featured"
  | "categories"
  | "tags"
  | "format"
  | "publishing"
  | "seo"
  | "social"
  | "schema"
  | "ai"
  | "advanced";

type FormState = {
  title: string;
  deck: string;
  section_id: string;
  region: string;
  badge_type: string;
  hero_image_url: string;
  status: ArticleStatus;
  slug: string;
  scheduled_at: string;
};

type RevisionRow = {
  id: string;
  version: number;
  changed_at: string;
  snapshot: unknown;
  changer?: { name?: string | null } | { name?: string | null }[] | null;
};

type InspectorProps = {
  openCard: InspectorCardId | null;
  onOpenCard: (id: InspectorCardId | null) => void;
  form: FormState;
  patchForm: (partial: Partial<FormState>) => void;
  seo: SEOFormValue;
  patchSeo: (partial: Partial<SEOFormValue>) => void;
  hreflangRows: Array<{ locale: string; url: string }>;
  onHreflangChange: (rows: Array<{ locale: string; url: string }>) => void;
  readOnly: boolean;
  isNew: boolean;
  articleId: string;
  canPublish: boolean;
  canSubmitReview: boolean;
  canReview: boolean;
  workflowPending: boolean;
  onWorkflow: (action: ArticleApprovalAction, note?: string) => void;
  workflowError?: string | null;
  dirty?: boolean;
  sections: Array<{ id: string; name: string }>;
  tagNames: string[];
  tagDraft: string;
  setTagDraft: (value: string) => void;
  onAddTag: (name: string) => void;
  onRemoveTag: (name: string) => void;
  allTags: Array<{ id: string; name: string }>;
  mayManageTags: boolean;
  mayUploadMedia: boolean;
  uploadBusy: boolean;
  uploadError?: string | null;
  onUploadHero: (file: File) => void;
  authorName: string;
  authorAvatar?: string | null;
  authorNote?: string;
  blocks: Block[];
  insights: EditorSeoInsights;
  onApplyTitle: (next: string) => void;
  onApplyDeck: (next: string) => void;
  onApplyMeta: (patch: Partial<SEOFormValue>) => void;
  onInsertSummaryBlock: (next: Block[]) => void;
  canWriteEditorialNotes: boolean;
  canWriteFactCheckNotes: boolean;
  revisions?: RevisionRow[] | null;
  revisionsLoading?: boolean;
  revisionsError?: string | null;
  restorePending?: boolean;
  restoreError?: string | null;
  onRestore?: (revisionId: string, version: number) => void;
};

const CARDS: Array<{ id: InspectorCardId; label: string; icon: typeof ImageIcon }> = [
  { id: "featured", label: "Featured image", icon: ImageIcon },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "format", label: "Article format", icon: LayoutTemplate },
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "seo", label: "SEO settings", icon: Globe2 },
  { id: "social", label: "Social preview", icon: Share2 },
  { id: "schema", label: "Schema", icon: FileCode2 },
  { id: "ai", label: "AI tools", icon: Sparkles },
  { id: "advanced", label: "Advanced", icon: History },
];

export function ArticleInspectorRail(props: InspectorProps & {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { mobileOpen, onMobileOpenChange, ...panelProps } = props;

  return (
    <>
      <aside className="hidden w-[300px] shrink-0 flex-col border-l border-border/50 bg-background lg:flex 2xl:w-[340px]">
        <div className="flex h-11 items-center border-b border-border/40 px-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Story settings
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <InspectorAccordion {...panelProps} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="space-y-1 border-b border-border/50 px-5 py-4 text-left">
            <SheetTitle className="text-base">Story settings</SheetTitle>
            <SheetDescription className="text-xs">
              Categories, publishing, SEO, and desk tools.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <InspectorAccordion {...panelProps} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function InspectorAccordion(props: InspectorProps) {
  const toggle = (id: InspectorCardId) => {
    props.onOpenCard(props.openCard === id ? null : id);
  };

  return (
    <div className="space-y-2">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const open = props.openCard === card.id;
        return (
          <div
            key={card.id}
            className={cn(
              "overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
              open && "border-border shadow-[0_4px_16px_rgba(15,23,42,0.06)]",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(card.id)}
              className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-xs font-semibold text-foreground">
                {card.label}
              </span>
              {card.id === "seo" ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    props.insights.seoScore >= 75
                      ? "bg-cat-green/15 text-cat-green"
                      : props.insights.seoScore >= 50
                        ? "bg-cat-amber/15 text-cat-amber"
                        : "bg-cat-rose/15 text-cat-rose",
                  )}
                >
                  {props.insights.seoScore}
                </span>
              ) : null}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
            {open ? (
              <div className="border-t border-border/50 px-3.5 pb-3.5 pt-3">
                <CardBody id={card.id} {...props} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CardBody({ id, ...props }: InspectorProps & { id: InspectorCardId }) {
  switch (id) {
    case "featured":
      return <FeaturedCard {...props} />;
    case "categories":
      return <CategoriesCard {...props} />;
    case "tags":
      return <TagsCard {...props} />;
    case "format":
      return <FormatCard {...props} />;
    case "publishing":
      return <PublishingCard {...props} />;
    case "seo":
      return <SeoCard {...props} />;
    case "social":
      return <SocialCard {...props} />;
    case "schema":
      return <SchemaCard {...props} />;
    case "ai":
      return (
        <ArticleAiAssistantPanel
          title={props.form.title}
          deck={props.form.deck}
          blocks={props.blocks}
          readOnly={props.readOnly}
          compact
          onApplyTitle={props.onApplyTitle}
          onApplyDeck={props.onApplyDeck}
          onApplyMeta={props.onApplyMeta}
          onInsertSummaryBlock={props.onInsertSummaryBlock}
        />
      );
    case "advanced":
      return <AdvancedCard {...props} />;
    default:
      return null;
  }
}

function FeaturedCard({
  form,
  patchForm,
  readOnly,
  mayUploadMedia,
  uploadBusy,
  uploadError,
  onUploadHero,
}: InspectorProps) {
  const hasImage = Boolean(form.hero_image_url);
  return (
    <div className="space-y-3">
      {mayUploadMedia && !readOnly ? (
        <MediaUploader
          previewUrl={form.hero_image_url || null}
          busy={uploadBusy}
          progress={uploadBusy ? "Uploading…" : null}
          onFiles={(files) => {
            const file = files[0];
            if (file) onUploadHero(file);
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Upload image
          </span>
        </MediaUploader>
      ) : hasImage ? (
        <img
          src={form.hero_image_url}
          alt=""
          className="aspect-video w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
          No featured image
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasImage}
          title={hasImage ? "Open featured image" : "Upload an image first"}
          onClick={() => {
            if (form.hero_image_url) window.open(form.hero_image_url, "_blank", "noopener,noreferrer");
          }}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 px-2 text-[10px] font-semibold text-muted-foreground hover:bg-accent disabled:opacity-40"
        >
          <Replace className="h-3 w-3" /> Open
        </button>
        <button
          type="button"
          disabled
          title="Image crop ships with the media studio upgrade"
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 px-2 text-[10px] font-semibold text-muted-foreground opacity-60"
        >
          <Crop className="h-3 w-3" /> Crop
        </button>
      </div>

      <Field label="Image URL">
        <input
          className={`${cmsInput} text-xs`}
          value={form.hero_image_url}
          disabled={readOnly}
          onChange={(e) => patchForm({ hero_image_url: e.target.value })}
          placeholder="https://…"
        />
      </Field>
      <div className="rounded-lg bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
        <div className="font-semibold text-foreground">Optimization</div>
        <div className="mt-1">
          Status:{" "}
          <span className="font-medium text-foreground">
            {hasImage ? "Ready · CDN URL set" : "Waiting for upload"}
          </span>
        </div>
        <div>Recommended: 1600×900 (16:9) · JPG/WebP under 400KB</div>
      </div>
      {uploadError ? <p className="text-xs text-cat-rose">{uploadError}</p> : null}
    </div>
  );
}

function CategoriesCard({ form, patchForm, readOnly, sections }: InspectorProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => s.name.toLowerCase().includes(q));
  }, [sections, query]);
  const selected = sections.find((s) => s.id === form.section_id);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Primary section placement (required to save). Multi-section support is planned.
      </p>
      {selected ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {selected.name}
            {!readOnly ? (
              <button
                type="button"
                className="text-primary/70 hover:text-cat-rose"
                onClick={() => patchForm({ section_id: "" })}
              >
                ×
              </button>
            ) : null}
          </span>
        </div>
      ) : null}
      {!readOnly ? (
        <>
          <input
            className={cmsInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
          />
          <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-border/60 p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                No matches. Create categories in Categories admin.
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    patchForm({ section_id: s.id });
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                    form.section_id === s.id && "bg-accent font-semibold",
                  )}
                >
                  {s.name}
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function TagsCard({
  tagNames,
  tagDraft,
  setTagDraft,
  onAddTag,
  onRemoveTag,
  allTags,
  mayManageTags,
  readOnly,
}: InspectorProps) {
  return (
    <div className="space-y-3">
      {tagNames.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tagNames.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-semibold"
            >
              {tag}
              {!readOnly && mayManageTags ? (
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="text-muted-foreground hover:text-cat-rose"
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No tags yet.</p>
      )}
      {!readOnly && mayManageTags ? (
        <>
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onAddTag(tagDraft);
              }
            }}
            placeholder="Add tag and press Enter"
            className={cmsInput}
            list="article-inspector-tags"
          />
          <datalist id="article-inspector-tags">
            {allTags
              .filter((t) => !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()))
              .map((t) => (
                <option key={t.id} value={t.name} />
              ))}
          </datalist>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">Your role cannot modify tags.</p>
      )}
    </div>
  );
}

function FormatCard({ form, patchForm, readOnly }: InspectorProps) {
  return (
    <div className="space-y-3">
      <Field label="Badge / format">
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
          placeholder="e.g. Middle East"
        />
      </Field>
    </div>
  );
}

function PublishingCard(props: InspectorProps) {
  const {
    form,
    patchForm,
    readOnly,
    canPublish,
    isNew,
    canSubmitReview,
    canReview,
    workflowPending,
    dirty,
    onWorkflow,
    workflowError,
    authorName,
    authorAvatar,
    authorNote,
  } = props;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
        {authorAvatar ? (
          <img src={authorAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{authorName}</div>
          <div className="text-[10px] text-muted-foreground">{authorNote ?? "Author"}</div>
        </div>
      </div>

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => patchForm({ status: e.target.value as ArticleStatus })}
          disabled={readOnly}
          className={cmsInput}
        >
          <option value="draft">Draft</option>
          <option value="review">In review</option>
          {canPublish ? (
            <>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </>
          ) : null}
        </select>
      </Field>
      <p className="text-[10px] text-muted-foreground">
        “Approved” is logged via workflow approval notes while status remains In review until
        publish.
      </p>
      {form.status === "scheduled" ? (
        <Field label="Publish date & time">
          <input
            type="datetime-local"
            required
            min={toDateTimeLocal(new Date().toISOString())}
            value={form.scheduled_at}
            onChange={(e) => patchForm({ scheduled_at: e.target.value })}
            className={cmsInput}
          />
        </Field>
      ) : null}
      <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
        <span className="text-[11px] font-semibold">Live state</span>
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
          disabled={workflowPending}
          dirty={dirty}
          onAction={onWorkflow}
        />
      ) : null}
      {workflowError ? (
        <div className="rounded-lg border border-cat-rose/30 bg-cat-rose/10 p-2.5 text-[11px] text-cat-rose">
          {workflowError}
        </div>
      ) : null}
    </div>
  );
}

function SeoCard(props: InspectorProps) {
  const { insights, form, patchForm, seo, patchSeo, hreflangRows, onHreflangChange, readOnly } =
    props;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="SEO" value={`${insights.seoScore}/100`} />
        <Metric label="Readability" value={`${insights.readabilityScore}/100`} />
        <Metric
          label="Keyword density"
          value={insights.keywordDensity ? `${insights.keywordDensity}%` : "—"}
        />
        <Metric label="Links" value={`${insights.internalLinks} in · ${insights.externalLinks} out`} />
      </div>
      <Metric
        label="Schema"
        value={insights.schemaReady ? `${seo.schema_type} ready` : "Not set"}
      />
      <SEOForm
        value={seo}
        onChange={patchSeo}
        slug={form.slug}
        onSlugChange={(slug) => patchForm({ slug })}
        titleFallback={form.title}
        deckFallback={form.deck}
        heroImageUrl={form.hero_image_url}
        hreflangRows={hreflangRows}
        onHreflangChange={onHreflangChange}
        readOnly={readOnly}
        showSocial={false}
      />
    </div>
  );
}

function SocialCard(props: InspectorProps) {
  const { form, seo, patchSeo, hreflangRows, onHreflangChange, readOnly } = props;
  const title = seo.og_title || seo.seo_title || form.title || "Untitled story";
  const description = seo.og_description || seo.meta_description || form.deck || "No description yet";
  const image = seo.og_image_url || form.hero_image_url;
  const url = `${siteUrl()}/article/${form.slug || "slug"}`;

  return (
    <div className="space-y-4">
      <PlatformPreview
        platform="Facebook"
        title={title}
        description={description}
        image={image}
        url={url}
      />
      <PlatformPreview
        platform="X / Twitter"
        title={seo.twitter_title || title}
        description={seo.twitter_description || description}
        image={seo.twitter_image_url || image}
        url={url}
      />
      <PlatformPreview
        platform="LinkedIn"
        title={title}
        description={description}
        image={image}
        url={url}
      />
      <SEOForm
        value={seo}
        onChange={patchSeo}
        slug={form.slug}
        titleFallback={form.title}
        deckFallback={form.deck}
        heroImageUrl={form.hero_image_url}
        hreflangRows={hreflangRows}
        onHreflangChange={onHreflangChange}
        readOnly={readOnly}
        showSeo={false}
        showSocial
      />
    </div>
  );
}

function SchemaCard({ seo, patchSeo, readOnly }: InspectorProps) {
  return (
    <div className="space-y-3">
      <Field label="Schema type">
        <select
          className={cmsInput}
          value={seo.schema_type}
          disabled={readOnly}
          onChange={(e) =>
            patchSeo({ schema_type: e.target.value as SEOFormValue["schema_type"] })
          }
        >
          {["NewsArticle", "Article", "Review", "Report"].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      <Field label="RSS inclusion">
        <select
          className={cmsInput}
          value={seo.rss_inclusion ? "yes" : "no"}
          disabled={readOnly}
          onChange={(e) => patchSeo({ rss_inclusion: e.target.value === "yes" })}
        >
          <option value="yes">Include in RSS</option>
          <option value="no">Exclude from RSS</option>
        </select>
      </Field>
    </div>
  );
}

function AdvancedCard(props: InspectorProps) {
  const {
    form,
    isNew,
    articleId,
    readOnly,
    canWriteEditorialNotes,
    canWriteFactCheckNotes,
    revisions,
    revisionsLoading,
    revisionsError,
    restorePending,
    restoreError,
    onRestore,
  } = props;

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg bg-muted/20 p-3 text-xs">
        <Row label="Status">{form.status}</Row>
        <Row label="Slug">
          <span className="truncate font-mono text-[10px]">{form.slug || "—"}</span>
        </Row>
        <Row label="Region">{form.region || "—"}</Row>
        <Row label="Badge">{form.badge_type}</Row>
      </div>
      {!isNew ? (
        <>
          <ArticleNotesPanel
            articleId={articleId}
            canEditorial={canWriteEditorialNotes}
            canFactCheck={canWriteFactCheckNotes}
          />
          <ArticleApprovalHistoryPanel articleId={articleId} />
          <div className="rounded-xl border border-border/60">
            <div className="border-b border-border/50 px-3 py-2 text-[11px] font-semibold">
              Version history
            </div>
            {revisionsLoading ? (
              <div className="p-3 text-xs text-muted-foreground">Loading…</div>
            ) : revisionsError ? (
              <div className="p-3 text-xs text-cat-rose">{revisionsError}</div>
            ) : !revisions?.length ? (
              <div className="p-4 text-center text-[11px] text-muted-foreground">
                History begins after the first update.
              </div>
            ) : (
              <div className="max-h-56 divide-y divide-border/50 overflow-y-auto">
                {revisions.map((revision) => {
                  const snapshot = unwrapRevisionSnapshot(revision.snapshot);
                  const changer = Array.isArray(revision.changer)
                    ? revision.changer[0]?.name
                    : revision.changer?.name;
                  return (
                    <div key={revision.id} className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-semibold">
                            v{revision.version} · {snapshot.title ?? "Untitled"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(revision.changed_at).toLocaleString()} · {changer ?? "System"}
                          </div>
                        </div>
                        {!readOnly && onRestore ? (
                          <button
                            type="button"
                            className="shrink-0 text-[10px] font-semibold text-primary hover:underline"
                            disabled={restorePending}
                            onClick={() => {
                              if (window.confirm(`Restore revision v${revision.version}?`)) {
                                onRestore(revision.id, revision.version);
                              }
                            }}
                          >
                            Restore
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {restoreError ? (
              <div className="border-t border-border bg-cat-rose/10 px-3 py-2 text-[11px] text-cat-rose">
                {restoreError}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlatformPreview({
  platform,
  title,
  description,
  image,
  url,
}: {
  platform: string;
  title: string;
  description: string;
  image?: string;
  url: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {platform}
      </div>
      <div className="overflow-hidden rounded-lg border border-border/70 bg-white text-[#1c1e21] shadow-sm">
        {image ? (
          <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1.91/1] items-center justify-center bg-[#f0f2f5] text-[10px] text-[#65676b]">
            No image
          </div>
        )}
        <div className="space-y-0.5 p-2.5">
          <div className="truncate text-[9px] uppercase tracking-wide text-[#65676b]">{url}</div>
          <div className="line-clamp-2 text-[12px] font-semibold leading-snug">{title}</div>
          <div className="line-clamp-2 text-[11px] leading-snug text-[#65676b]">{description}</div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "published") return "success";
  if (status === "scheduled") return "info";
  if (status === "review") return "warning";
  if (status === "archived") return "danger";
  return "neutral";
}

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

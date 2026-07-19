import type { ReactNode } from "react";
import {
  History,
  RotateCcw,
  Settings2,
  Sparkles,
  Tag,
  FolderTree,
  Globe2,
  ImageIcon,
  Share2,
  FileCode2,
  User,
  Send,
} from "lucide-react";
import { ArticleAiAssistantPanel } from "@/components/articles/ai-assistant-panel";
import {
  ArticleApprovalHistoryPanel,
  ArticleNotesPanel,
  WorkflowActions,
} from "@/components/articles/article-edit-panels";
import { CmsPanel, CmsStatus, cmsInput, MediaUploader, SEOForm } from "@/components/cms";
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
import { cn } from "@/lib/utils";
import { unwrapRevisionSnapshot, type ArticleApprovalAction } from "@/lib/admin.functions";

export type ArticleSettingsSection =
  | "general"
  | "publishing"
  | "seo"
  | "categories"
  | "tags"
  | "social"
  | "schema"
  | "ai"
  | "advanced";

const SECTIONS: Array<{
  id: ArticleSettingsSection;
  label: string;
  icon: typeof Settings2;
}> = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "seo", label: "SEO", icon: Globe2 },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "social", label: "Social", icon: Share2 },
  { id: "schema", label: "Schema", icon: FileCode2 },
  { id: "ai", label: "AI Tools", icon: Sparkles },
  { id: "advanced", label: "Advanced", icon: History },
];

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

export function ArticleSettingsDrawer({
  open,
  onOpenChange,
  section,
  onSectionChange,
  form,
  patchForm,
  seo,
  patchSeo,
  hreflangRows,
  onHreflangChange,
  readOnly,
  isNew,
  articleId,
  canPublish,
  canSubmitReview,
  canReview,
  workflowPending,
  onWorkflow,
  workflowError,
  dirty,
  sections,
  tagNames,
  tagDraft,
  setTagDraft,
  onAddTag,
  onRemoveTag,
  allTags,
  mayManageTags,
  mayUploadMedia,
  uploadBusy,
  uploadError,
  onUploadHero,
  authorName,
  authorAvatar,
  authorNote,
  blocks,
  onApplyTitle,
  onApplyDeck,
  onApplyMeta,
  onInsertSummaryBlock,
  canWriteEditorialNotes,
  canWriteFactCheckNotes,
  revisions,
  revisionsLoading,
  revisionsError,
  restorePending,
  restoreError,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: ArticleSettingsSection;
  onSectionChange: (section: ArticleSettingsSection) => void;
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
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-1 border-b border-border/70 px-5 py-4 text-left">
          <SheetTitle className="text-base">Article settings</SheetTitle>
          <SheetDescription className="text-xs">
            Publishing, SEO, and desk tools — hidden while you write.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 p-2 sm:w-40 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium cms-transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {section === "general" ? (
              <SectionBody title="General" description="Byline, badge, region, and cover">
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{authorName}</div>
                    {authorNote ? (
                      <div className="text-xs text-muted-foreground">{authorNote}</div>
                    ) : null}
                  </div>
                </div>
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
                <Field label="Cover image">
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
                        <ImageIcon className="h-3.5 w-3.5" /> Upload cover
                      </span>
                    </MediaUploader>
                  ) : form.hero_image_url ? (
                    <img
                      src={form.hero_image_url}
                      alt=""
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                  ) : null}
                  {uploadError ? <p className="mt-1 text-xs text-cat-rose">{uploadError}</p> : null}
                  <input
                    value={form.hero_image_url}
                    disabled={readOnly}
                    onChange={(e) => patchForm({ hero_image_url: e.target.value })}
                    placeholder="Or paste image URL"
                    className={`${cmsInput} mt-2 text-xs`}
                  />
                </Field>
              </SectionBody>
            ) : null}

            {section === "publishing" ? (
              <SectionBody title="Publishing" description="Workflow and distribution">
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
                {form.status === "scheduled" ? (
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
                ) : null}
                <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                  <span className="text-xs font-semibold">Current state</span>
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
                  <div className="rounded-lg border border-cat-rose/30 bg-cat-rose/10 p-3 text-xs text-cat-rose">
                    {workflowError}
                  </div>
                ) : null}
              </SectionBody>
            ) : null}

            {section === "seo" ? (
              <div className="p-1">
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
            ) : null}

            {section === "social" ? (
              <div className="p-1">
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
            ) : null}

            {section === "schema" ? (
              <SectionBody title="Schema" description="Structured data and feeds">
                <Field label="Schema type">
                  <select
                    className={cmsInput}
                    value={seo.schema_type}
                    disabled={readOnly}
                    onChange={(event) =>
                      patchSeo({
                        schema_type: event.target.value as SEOFormValue["schema_type"],
                      })
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
                    onChange={(event) =>
                      patchSeo({ rss_inclusion: event.target.value === "yes" })
                    }
                  >
                    <option value="yes">Include in RSS</option>
                    <option value="no">Exclude from RSS</option>
                  </select>
                </Field>
              </SectionBody>
            ) : null}

            {section === "categories" ? (
              <SectionBody title="Categories" description="Section placement">
                <Field label="Category" hint="Required to publish">
                  <select
                    required
                    disabled={readOnly}
                    value={form.section_id}
                    onChange={(e) => patchForm({ section_id: e.target.value })}
                    className={cmsInput}
                  >
                    <option value="">Select category…</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </SectionBody>
            ) : null}

            {section === "tags" ? (
              <SectionBody title="Tags" description="Topics for discovery">
                {tagNames.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {tagNames.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {tag}
                        {!readOnly && mayManageTags ? (
                          <button
                            type="button"
                            title={`Remove ${tag}`}
                            onClick={() => onRemoveTag(tag)}
                            className="text-muted-foreground hover:text-cat-rose"
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}
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
                      list="article-settings-tags-list"
                    />
                    <datalist id="article-settings-tags-list">
                      {allTags
                        .filter(
                          (t) =>
                            !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()),
                        )
                        .map((t) => (
                          <option key={t.id} value={t.name} />
                        ))}
                    </datalist>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Your role cannot modify tags.</p>
                )}
              </SectionBody>
            ) : null}

            {section === "ai" ? (
              <div className="p-1">
                <ArticleAiAssistantPanel
                  title={form.title}
                  deck={form.deck}
                  blocks={blocks}
                  readOnly={readOnly}
                  onApplyTitle={onApplyTitle}
                  onApplyDeck={onApplyDeck}
                  onApplyMeta={onApplyMeta}
                  onInsertSummaryBlock={onInsertSummaryBlock}
                />
              </div>
            ) : null}

            {section === "advanced" ? (
              <div className="space-y-3 p-3">
                <CmsPanel title="Summary" description="Quick metadata">
                  <div className="space-y-3 p-4 text-sm">
                    <Row label="Status">
                      <CmsStatus tone={statusTone(form.status)} status={form.status}>
                        {form.status}
                      </CmsStatus>
                    </Row>
                    <Row label="Slug">
                      <span className="truncate font-mono text-xs">{form.slug || "—"}</span>
                    </Row>
                    <Row label="Region">{form.region || "—"}</Row>
                    <Row label="Badge">{form.badge_type}</Row>
                  </div>
                </CmsPanel>
                {!isNew ? (
                  <>
                    <ArticleNotesPanel
                      articleId={articleId}
                      canEditorial={canWriteEditorialNotes}
                      canFactCheck={canWriteFactCheckNotes}
                    />
                    <ArticleApprovalHistoryPanel articleId={articleId} />
                    <CmsPanel
                      title="Version history"
                      description="Restorable snapshots from each save"
                      action={
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <History className="h-3.5 w-3.5" />
                          {revisions?.length ?? 0}
                        </span>
                      }
                    >
                      {revisionsLoading ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                      ) : revisionsError ? (
                        <div className="p-4 text-sm text-cat-rose">{revisionsError}</div>
                      ) : !revisions?.length ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          History begins after the first update.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {revisions.map((revision) => {
                            const snapshot = unwrapRevisionSnapshot(revision.snapshot);
                            const changer = Array.isArray(revision.changer)
                              ? revision.changer[0]?.name
                              : revision.changer?.name;
                            return (
                              <div key={revision.id} className="flex flex-col gap-2 px-4 py-3">
                                <div className="flex items-start gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
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
                                {!readOnly && onRestore ? (
                                  <button
                                    type="button"
                                    className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-input px-2 text-[10px] font-semibold hover:bg-accent"
                                    disabled={restorePending}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Restore revision v${revision.version}?`,
                                        )
                                      ) {
                                        onRestore(revision.id, revision.version);
                                      }
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3" /> Restore
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {restoreError ? (
                        <div className="border-t border-border bg-cat-rose/10 px-4 py-2 text-xs text-cat-rose">
                          {restoreError}
                        </div>
                      ) : null}
                    </CmsPanel>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionBody({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
        {hint ? <span className="normal-case tracking-normal font-normal">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
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

function toDateTimeLocal(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

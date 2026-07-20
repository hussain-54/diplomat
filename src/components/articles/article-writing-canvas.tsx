import type { RefObject } from "react";
import { useState } from "react";
import {
  ChevronDown,
  FileText,
  Link2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RichEditor } from "@/components/cms";
import { ArticleBody } from "@/components/article-body";
import { ARTICLE_TYPE_OPTIONS } from "@/lib/article-cms-extras";
import {
  serializeBlocks,
  type ArticleBodyExtras,
  type Block,
} from "@/lib/blocks";
import { cn } from "@/lib/utils";

const HEADLINE_MAX = 120;
const SHORT_HEADLINE_MAX = 60;
const SUMMARY_MAX = 160;

export function ArticleWritingCanvas({
  viewMode,
  readOnly,
  form,
  onTitleChange,
  onDeckChange,
  onSlugChange,
  onBadgeChange,
  onMetaDescriptionChange,
  onExcerptChange: _onExcerptChange,
  titleInputRef,
  authorName,
  authorAvatar,
  authorNote,
  blocks,
  onBlocksChange,
  onUploadImage,
  onOpenAi,
  focusLike,
  extras,
  onExtrasChange,
  writingStats,
  lastSavedAt,
  relatedPanel,
  referencesPanel,
  customFieldsPanel,
}: {
  viewMode: "edit" | "focus" | "fullscreen" | "reading";
  readOnly?: boolean;
  form: {
    title: string;
    deck: string;
    slug: string;
    hero_image_url: string;
    badge_type: string;
    meta_description: string;
    excerpt: string;
  };
  onTitleChange: (title: string) => void;
  onDeckChange: (deck: string) => void;
  onSlugChange: (slug: string) => void;
  onBadgeChange: (badge: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  titleInputRef: RefObject<HTMLInputElement | null>;
  authorName: string;
  authorAvatar?: string | null;
  authorNote?: string;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onOpenAi?: () => void;
  focusLike?: boolean;
  extras: ArticleBodyExtras;
  onExtrasChange: (extras: ArticleBodyExtras) => void;
  writingStats?: { words: number; characters: number; readingMinutes: number };
  lastSavedAt?: Date | null;
  relatedPanel?: React.ReactNode;
  referencesPanel?: React.ReactNode;
  customFieldsPanel?: React.ReactNode;
}) {
  const [openRefs, setOpenRefs] = useState(false);
  const [openRelated, setOpenRelated] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);

  const highlights = extras.highlights?.length ? extras.highlights : [""];
  const faqItems = extras.faq_items?.length
    ? extras.faq_items
    : [{ question: "", answer: "" }];
  const references = extras.references?.length ? extras.references : [""];

  if (viewMode === "reading") {
    return (
      <div
        className={cn(
          "mx-auto w-full rounded-2xl border border-border/50 bg-card p-6 shadow-sm sm:p-10",
          focusLike ? "max-w-[720px]" : "max-w-[920px]",
        )}
      >
        <article>
          {form.hero_image_url ? (
            <img
              src={form.hero_image_url}
              alt=""
              className="mb-8 max-h-80 w-full rounded-xl object-cover"
            />
          ) : null}
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {form.title || "Untitled"}
          </h1>
          {form.deck ? (
            <p className="mt-4 text-xl leading-relaxed text-muted-foreground">{form.deck}</p>
          ) : null}
          <div className="mt-6 flex items-center gap-3 border-b border-border/30 pb-6">
            <AuthorRow name={authorName} avatarUrl={authorAvatar} note={authorNote} />
          </div>
          <div className="mt-8">
            <ArticleBody body={serializeBlocks(blocks, extras)} />
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-none space-y-4", focusLike && "max-w-[760px]")}>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div>
          <FieldLabel
            label="Headline"
            required
            counter={`${form.title.length}/${HEADLINE_MAX}`}
            counterTone={counterTone(form.title.length, HEADLINE_MAX, 40, 90)}
          />
          <input
            ref={titleInputRef}
            required
            disabled={readOnly}
            maxLength={HEADLINE_MAX}
            value={form.title}
            onChange={(e) => {
              const next = e.target.value;
              onTitleChange(next);
              if (!form.slug.trim() && next.trim()) {
                onSlugChange(slugify(next));
              }
            }}
            placeholder="Write a compelling headline..."
            className={fieldClass}
          />
        </div>

        <div>
          <FieldLabel
            label="Short Headline"
            optional
            counter={`${form.deck.length}/${SHORT_HEADLINE_MAX}`}
          />
          <input
            disabled={readOnly}
            maxLength={SHORT_HEADLINE_MAX}
            value={form.deck}
            onChange={(e) => onDeckChange(e.target.value)}
            placeholder="Short headline for mobile & push"
            className={fieldClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel label="Slug" />
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                disabled={readOnly}
                value={form.slug}
                onChange={(e) =>
                  onSlugChange(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/-+/g, "-")
                      .replace(/^-|-$/g, ""),
                  )
                }
                placeholder="auto-generated-slug-will-appear-here"
                className="h-11 w-full border-0 bg-transparent font-mono text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <div>
            <FieldLabel label="Article Type" />
            <select
              disabled={readOnly}
              value={form.badge_type || "news"}
              onChange={(e) => onBadgeChange(e.target.value)}
              className={cn(fieldClass, "cursor-pointer")}
            >
              {ARTICLE_TYPE_OPTIONS.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel
            label="Summary (Meta Description)"
            counter={`${form.meta_description.length}/${SUMMARY_MAX}`}
            counterTone={counterTone(form.meta_description.length, SUMMARY_MAX, 70, 155)}
          />
          <textarea
            disabled={readOnly}
            maxLength={SUMMARY_MAX}
            rows={3}
            value={form.meta_description}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Write a short summary for meta description..."
            className={cn(fieldClass, "min-h-[88px] resize-y py-3")}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileText className="h-4 w-4 text-blue-600" />
            Article body
          </div>
          {onOpenAi ? (
            <button
              type="button"
              onClick={onOpenAi}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Write
            </button>
          ) : null}
        </div>
        <div className="min-h-[280px] px-3 py-3 sm:px-4">
          <RichEditor
            value={blocks}
            onChange={onBlocksChange}
            readOnly={readOnly}
            onUploadImage={onUploadImage}
            onOpenAi={onOpenAi}
            className="border-0 bg-transparent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500">
          <span>
            Words: <strong className="font-semibold text-slate-800">{writingStats?.words ?? 0}</strong>
          </span>
          <span>
            Characters:{" "}
            <strong className="font-semibold text-slate-800">
              {writingStats?.characters ?? 0}
            </strong>
          </span>
          <span>
            Reading time:{" "}
            <strong className="font-semibold text-slate-800">
              {writingStats?.readingMinutes ?? 0} min
            </strong>
          </span>
          <span className="ml-auto text-emerald-600">
            {lastSavedAt ? `Saved ${formatRelative(lastSavedAt)}` : "Autosave on"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Highlights (Key Points)</h3>
            <p className="text-xs text-slate-500">
              Bullet points that appear at the top of the article
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            onClick={() =>
              onExtrasChange({ ...extras, highlights: [...highlights, ""] })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add Point
          </button>
        </div>
        <div className="space-y-2">
          {highlights.map((point, index) => (
            <div key={`hl-${index}`} className="flex gap-2">
              <span className="mt-3 text-xs font-bold text-muted-foreground">{index + 1}.</span>
              <input
                disabled={readOnly}
                value={point}
                onChange={(e) => {
                  const next = [...highlights];
                  next[index] = e.target.value;
                  onExtrasChange({ ...extras, highlights: next });
                }}
                placeholder="Key takeaway for readers"
                className={fieldClass}
              />
              {highlights.length > 1 ? (
                <button
                  type="button"
                  disabled={readOnly}
                  className="mt-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                  onClick={() =>
                    onExtrasChange({
                      ...extras,
                      highlights: highlights.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">FAQ Block</h3>
            <p className="text-xs text-slate-500">
              Enable FAQ section for this article
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            role="switch"
            aria-checked={Boolean(extras.faq_enabled)}
            onClick={() =>
              onExtrasChange({ ...extras, faq_enabled: !extras.faq_enabled })
            }
            className={cn(
              "relative h-6 w-11 rounded-full cms-transition",
              extras.faq_enabled ? "bg-blue-600" : "bg-slate-200",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow cms-transition",
                extras.faq_enabled ? "left-5" : "left-0.5",
              )}
            />
          </button>
        </div>
        {extras.faq_enabled ? (
          <div className="mt-4 space-y-3">
            {faqItems.map((item, index) => (
              <div key={`faq-${index}`} className="space-y-2 rounded-xl border border-border/50 p-3">
                <input
                  disabled={readOnly}
                  value={item.question}
                  onChange={(e) => {
                    const next = [...faqItems];
                    next[index] = { ...item, question: e.target.value };
                    onExtrasChange({ ...extras, faq_items: next });
                  }}
                  placeholder="Question"
                  className={fieldClass}
                />
                <textarea
                  disabled={readOnly}
                  rows={2}
                  value={item.answer}
                  onChange={(e) => {
                    const next = [...faqItems];
                    next[index] = { ...item, answer: e.target.value };
                    onExtrasChange({ ...extras, faq_items: next });
                  }}
                  placeholder="Answer"
                  className={cn(fieldClass, "min-h-[64px] resize-y py-2.5")}
                />
              </div>
            ))}
            <button
              type="button"
              disabled={readOnly}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              onClick={() =>
                onExtrasChange({
                  ...extras,
                  faq_items: [...faqItems, { question: "", answer: "" }],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add FAQ
            </button>
          </div>
        ) : null}
      </section>

      <Accordion
        title="References & sources"
        open={openRefs}
        onToggle={() => setOpenRefs((v) => !v)}
      >
        {referencesPanel ?? (
          <div className="space-y-2">
            {references.map((ref, index) => (
              <input
                key={`ref-${index}`}
                disabled={readOnly}
                value={ref}
                onChange={(e) => {
                  const next = [...references];
                  next[index] = e.target.value;
                  onExtrasChange({ ...extras, references: next });
                }}
                placeholder="https://source.example.com/…"
                className={fieldClass}
              />
            ))}
            <button
              type="button"
              disabled={readOnly}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              onClick={() =>
                onExtrasChange({ ...extras, references: [...references, ""] })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add source
            </button>
          </div>
        )}
      </Accordion>

      <Accordion
        title="Related articles & internal linking"
        open={openRelated}
        onToggle={() => setOpenRelated((v) => !v)}
      >
        {relatedPanel ?? (
          <textarea
            disabled={readOnly}
            rows={3}
            value={extras.related_notes ?? ""}
            onChange={(e) =>
              onExtrasChange({ ...extras, related_notes: e.target.value })
            }
            placeholder="Notes for editors: related slugs, internal links to include…"
            className={cn(fieldClass, "min-h-[80px] resize-y py-3")}
          />
        )}
      </Accordion>

      <Accordion
        title="Custom fields"
        open={openCustom}
        onToggle={() => setOpenCustom((v) => !v)}
      >
        {customFieldsPanel ?? (
          <p className="text-sm text-muted-foreground">
            Category, tags, SEO, Google News, and schema fields live in the tabs above.
          </p>
        )}
      </Accordion>

      {onOpenAi ? (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Need help writing?</div>
            <p className="text-xs text-slate-600">
              Use AI Assistant to generate content, headlines, meta descriptions and more.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAi}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            Open AI Assistant
          </button>
        </div>
      ) : null}
    </div>
  );
}

const fieldClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60";

function FieldLabel({
  label,
  required,
  optional,
  counter,
  counterTone,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  counter?: string;
  counterTone?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </label>
      {counter ? (
        <span className={cn("text-[11px] tabular-nums text-muted-foreground", counterTone)}>
          {counter}
        </span>
      ) : null}
    </div>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-semibold text-slate-900"
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 cms-transition", open && "rotate-180")}
        />
      </button>
      {open ? <div className="border-t border-slate-100 px-5 py-4">{children}</div> : null}
    </section>
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
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        {note ? <div className="text-[11px] text-muted-foreground">{note}</div> : null}
      </div>
    </div>
  );
}

function counterTone(len: number, max: number, goodMin: number, goodMax: number) {
  if (!len) return "text-muted-foreground";
  if (len > max) return "text-destructive";
  if (len >= goodMin && len <= goodMax) return "text-emerald-600";
  return "text-amber-600";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function formatRelative(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

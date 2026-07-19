import type { RefObject } from "react";
import { RichEditor } from "@/components/cms";
import { ArticleBody } from "@/components/article-body";
import { siteUrl } from "@/lib/seo";
import { serializeBlocks, type Block } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const TITLE_SOFT_MAX = 110;

export function ArticleWritingCanvas({
  viewMode,
  readOnly,
  form,
  onTitleChange,
  onDeckChange,
  onSlugChange,
  titleInputRef,
  authorName,
  authorAvatar,
  authorNote,
  blocks,
  onBlocksChange,
  onUploadImage,
  onOpenAi,
  focusLike,
}: {
  viewMode: "edit" | "focus" | "fullscreen" | "reading";
  readOnly?: boolean;
  form: {
    title: string;
    deck: string;
    slug: string;
    hero_image_url: string;
  };
  onTitleChange: (title: string) => void;
  onDeckChange: (deck: string) => void;
  onSlugChange: (slug: string) => void;
  titleInputRef: RefObject<HTMLInputElement | null>;
  authorName: string;
  authorAvatar?: string | null;
  authorNote?: string;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onOpenAi?: () => void;
  focusLike?: boolean;
}) {
  const titleLen = form.title.length;
  const titleTone =
    titleLen === 0
      ? "text-muted-foreground"
      : titleLen > TITLE_SOFT_MAX
        ? "text-cat-rose"
        : titleLen >= 40 && titleLen <= 80
          ? "text-cat-green"
          : "text-cat-amber";

  return (
    <div
      className={cn(
        "mx-auto w-full rounded-2xl bg-background shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]",
        focusLike ? "max-w-[720px]" : "max-w-[920px]",
        "px-6 py-8 sm:px-12 sm:py-12",
      )}
    >
      {viewMode === "reading" ? (
        <article>
          {form.hero_image_url ? (
            <img
              src={form.hero_image_url}
              alt=""
              className="-mx-6 mb-8 max-h-80 w-[calc(100%+3rem)] rounded-xl object-cover sm:-mx-12 sm:w-[calc(100%+6rem)]"
            />
          ) : null}
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {form.title || "Untitled"}
          </h1>
          {form.deck ? (
            <p className="mt-4 font-serif text-xl leading-relaxed text-muted-foreground">
              {form.deck}
            </p>
          ) : null}
          <div className="mt-6 flex items-center gap-3 border-b border-border/30 pb-6">
            <AuthorRow name={authorName} avatarUrl={authorAvatar} note={authorNote} />
          </div>
          <div className="mt-8">
            <ArticleBody body={serializeBlocks(blocks)} />
          </div>
        </article>
      ) : (
        <>
          <div className="space-y-1">
            <input
              ref={titleInputRef}
              required
              disabled={readOnly}
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Article title"
              className="w-full border-0 bg-transparent font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-foreground outline-none placeholder:text-muted-foreground/35 sm:text-[2.75rem]"
            />
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className={cn("font-semibold tabular-nums", titleTone)}>
                {titleLen}/{TITLE_SOFT_MAX}
              </span>
              <span className="text-muted-foreground">
                {titleLen === 0
                  ? "Add a clear, searchable headline"
                  : titleLen < 40
                    ? "A bit short for SEO — expand if you can"
                    : titleLen <= 80
                      ? "Strong headline length"
                      : titleLen <= TITLE_SOFT_MAX
                        ? "Getting long — consider tightening"
                        : "Over soft limit — shorten for scanners"}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-muted/25 px-3 py-2.5">
            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
              Permalink
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {siteUrl().replace(/^https?:\/\//, "")}/article/
            </span>
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
              placeholder="auto-from-title"
              className="min-w-[8rem] flex-1 border-0 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          <textarea
            disabled={readOnly}
            value={form.deck}
            onChange={(e) => onDeckChange(e.target.value)}
            rows={2}
            placeholder="Subtitle / excerpt — the deck that appears under the headline"
            className="mt-5 w-full resize-none border-0 bg-transparent font-serif text-xl leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/35 sm:text-[1.35rem]"
          />

          <div className="mt-6 flex items-center gap-3 border-b border-border/30 pb-6">
            <AuthorRow name={authorName} avatarUrl={authorAvatar} note={authorNote} />
          </div>

          <div className="mt-4">
            <RichEditor
              value={blocks}
              onChange={onBlocksChange}
              readOnly={readOnly}
              onUploadImage={onUploadImage}
              onOpenAi={onOpenAi}
              className="border-0 bg-transparent"
            />
          </div>
        </>
      )}
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

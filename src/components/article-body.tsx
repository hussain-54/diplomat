import { InlineRichText } from "@/components/inline-rich-text";
import {
  parseBody,
  embedSrc,
  isDirectVideoFile,
  type Block,
  type HeadingLevel,
  type ImageSize,
} from "@/lib/blocks";

export function ArticleBody({ body }: { body: string | null | undefined }) {
  const blocks = parseBody(body);
  return (
    <div className="article-body mt-8">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

const HEADING_CLASS: Record<HeadingLevel, string> = {
  1: "mb-5 mt-10 font-serif text-3xl font-bold text-ink",
  2: "mb-4 mt-8 font-serif text-2xl font-semibold text-ink",
  3: "mb-3 mt-6 font-serif text-xl font-semibold text-ink",
  4: "mb-2 mt-5 font-serif text-lg font-medium text-ink",
};

const IMAGE_SIZE_CLASS: Record<ImageSize, string> = {
  small: "max-w-sm",
  medium: "max-w-xl",
  large: "max-w-3xl",
  full: "w-full",
};

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      if (!block.data.text.trim()) return null;
      return (
        <p className="whitespace-pre-wrap">
          <InlineRichText text={block.data.text} />
        </p>
      );
    case "heading": {
      if (!block.data.text.trim()) return null;
      const level = block.data.level;
      const className = HEADING_CLASS[level];
      const content = <InlineRichText text={block.data.text} />;
      if (level === 1) return <h1 className={className}>{content}</h1>;
      if (level === 2) return <h2 className={className}>{content}</h2>;
      if (level === 3) return <h3 className={className}>{content}</h3>;
      return <h4 className={className}>{content}</h4>;
    }
    case "image": {
      if (!block.data.url) return null;
      const align = block.data.align ?? "full";
      const size = block.data.size ?? "large";
      const sizeClass = IMAGE_SIZE_CLASS[size];
      const alignClass =
        align === "left"
          ? "mr-auto"
          : align === "right"
            ? "ml-auto"
            : align === "center"
              ? "mx-auto"
              : "";
      return (
        <figure className={`my-8 ${sizeClass} ${alignClass}`.trim()}>
          <img
            src={block.data.url}
            alt={block.data.alt}
            className="w-full object-cover"
            loading="lazy"
          />
          {(block.data.caption || block.data.credit) && (
            <figcaption className="mt-2 text-xs text-muted-foreground">
              {block.data.caption}
              {block.data.caption && block.data.credit ? " · " : null}
              {block.data.credit ? (
                <span className="italic">{block.data.credit}</span>
              ) : null}
            </figcaption>
          )}
        </figure>
      );
    }
    case "video": {
      if (!block.data.url) return null;
      const src = embedSrc(block.data.url);
      return (
        <figure className="my-8">
          {src ? (
            <iframe
              src={src}
              title={block.data.caption || "Video"}
              className="aspect-video w-full"
              allowFullScreen
            />
          ) : isDirectVideoFile(block.data.url) ? (
            <video src={block.data.url} controls className="aspect-video w-full bg-black" />
          ) : (
            <a
              href={block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson underline"
            >
              Watch video
            </a>
          )}
          {block.data.caption && (
            <figcaption className="mt-2 text-xs text-muted-foreground">{block.data.caption}</figcaption>
          )}
        </figure>
      );
    }
    case "audio": {
      if (!block.data.url) return null;
      return (
        <figure className="my-8">
          {block.data.title ? (
            <p className="mb-2 font-serif text-lg font-medium text-ink">{block.data.title}</p>
          ) : null}
          <audio controls src={block.data.url} className="w-full" preload="metadata">
            <a href={block.data.url}>Download audio</a>
          </audio>
          {block.data.caption ? (
            <figcaption className="mt-2 text-xs text-muted-foreground">{block.data.caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "file": {
      if (!block.data.url) return null;
      const label = block.data.title || block.data.fileName || "Download file";
      return (
        <div className="my-8">
          <a
            href={block.data.url}
            download={block.data.fileName || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-border bg-secondary px-4 py-2 text-sm font-medium text-ink hover:border-foreground/30"
          >
            {label}
            {block.data.fileName && block.data.title ? (
              <span className="text-xs font-normal text-muted-foreground">
                ({block.data.fileName})
              </span>
            ) : null}
          </a>
        </div>
      );
    }
    case "quote":
      if (!block.data.text.trim()) return null;
      return (
        <blockquote className="my-8 border-l-2 border-crimson pl-5">
          <p className="font-serif text-xl italic leading-relaxed text-ink">
            <InlineRichText text={block.data.text} />
          </p>
          {block.data.attribution && (
            <cite className="mt-2 block text-sm not-italic text-muted-foreground">
              — {block.data.attribution}
            </cite>
          )}
        </blockquote>
      );
    case "pullquote":
      if (!block.data.text.trim()) return null;
      return (
        <blockquote className="my-12 px-4 text-center">
          <p className="font-serif text-2xl font-medium italic leading-snug text-ink md:text-3xl">
            <InlineRichText text={block.data.text} />
          </p>
          {block.data.attribution && (
            <cite className="mt-4 block text-sm not-italic text-muted-foreground">
              — {block.data.attribution}
            </cite>
          )}
        </blockquote>
      );
    case "list": {
      const items = block.data.items.filter((item) => item.text.trim());
      if (!items.length) return null;
      if (block.data.style === "check") {
        return (
          <ul className="my-6 list-none space-y-2 pl-0">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center border border-border text-[10px] ${
                    item.checked ? "bg-crimson text-white" : "bg-background"
                  }`}
                  aria-hidden
                >
                  {item.checked ? "✓" : ""}
                </span>
                <span className={item.checked ? "text-muted-foreground line-through" : undefined}>
                  <InlineRichText text={item.text} />
                </span>
              </li>
            ))}
          </ul>
        );
      }
      if (block.data.style === "numbered") {
        return (
          <ol className="my-6 list-decimal space-y-1 pl-6">
            {items.map((item, i) => (
              <li key={i}>
                <InlineRichText text={item.text} />
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="my-6 list-disc space-y-1 pl-6">
          {items.map((item, i) => (
            <li key={i}>
              <InlineRichText text={item.text} />
            </li>
          ))}
        </ul>
      );
    }
    case "divider":
      return <hr className="mx-auto my-10 w-24 border-t-2 border-border" />;
    case "embed": {
      if (!block.data.url) return null;
      const src = embedSrc(block.data.url);
      return (
        <figure className="my-8">
          {src ? (
            <iframe
              src={src}
              title={block.data.caption || "Embedded content"}
              className="aspect-video w-full"
              allowFullScreen
            />
          ) : (
            <a
              href={block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson underline"
            >
              {block.data.caption || block.data.url}
            </a>
          )}
          {src && block.data.caption && (
            <figcaption className="mt-2 text-xs text-muted-foreground">{block.data.caption}</figcaption>
          )}
        </figure>
      );
    }
    case "gallery":
      if (!block.data.images.length) return null;
      return (
        <div className="my-8 grid grid-cols-2 gap-2 md:grid-cols-3">
          {block.data.images.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={img.alt}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
          ))}
        </div>
      );
    case "table": {
      if (!block.data.headers.length && !block.data.rows.length) return null;
      return (
        <div className="my-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {block.data.headers.some((cell) => cell.trim()) ? (
              <thead>
                <tr>
                  {block.data.headers.map((header, i) => (
                    <th
                      key={i}
                      className="border border-border bg-secondary px-3 py-2 text-left font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {block.data.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, col) => (
                    <td key={col} className="border border-border px-3 py-2 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "code":
      if (!block.data.code.trim()) return null;
      return (
        <pre className="my-8 overflow-x-auto border border-border bg-secondary p-4 text-xs leading-6">
          <code data-language={block.data.language}>{block.data.code}</code>
        </pre>
      );
    case "html": {
      if (!block.data.code.trim()) return null;
      const safe = sanitizeHtml(block.data.code);
      return <div className="my-8 prose-html" dangerouslySetInnerHTML={{ __html: safe }} />;
    }
    case "live": {
      if (!block.data.title.trim() && !block.data.text.trim()) return null;
      const time = new Date(block.data.time);
      return (
        <div className="my-6 border border-border border-l-2 border-l-crimson bg-secondary p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-crimson">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-crimson" />
            Live update
            {!Number.isNaN(time.getTime()) && (
              <time className="font-normal normal-case tracking-normal text-muted-foreground">
                {time.toLocaleString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
          {block.data.title && (
            <h3 className="mt-2 font-serif text-lg font-semibold text-ink">
              <InlineRichText text={block.data.title} />
            </h3>
          )}
          {block.data.text && (
            <p className="mt-1 whitespace-pre-wrap text-base leading-7">
              <InlineRichText text={block.data.text} />
            </p>
          )}
        </div>
      );
    }
    case "newsletter": {
      if (!block.data.heading.trim() && !block.data.body.trim()) return null;
      return (
        <aside className="my-10 border border-border bg-secondary p-6 text-center">
          {block.data.heading ? (
            <h3 className="font-serif text-xl font-semibold text-ink">{block.data.heading}</h3>
          ) : null}
          {block.data.body ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.data.body}</p>
          ) : null}
          {block.data.buttonLabel && block.data.buttonUrl ? (
            <a
              href={block.data.buttonUrl}
              className="mt-4 inline-flex items-center bg-crimson px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {block.data.buttonLabel}
            </a>
          ) : null}
        </aside>
      );
    }
    case "ad": {
      if (block.data.html.trim()) {
        const safe = sanitizeHtml(block.data.html);
        return (
          <aside className="my-8" aria-label={block.data.label || "Advertisement"}>
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {block.data.label || "Advertisement"}
            </p>
            <div dangerouslySetInnerHTML={{ __html: safe }} />
          </aside>
        );
      }
      if (!block.data.imageUrl) return null;
      const img = (
        <img
          src={block.data.imageUrl}
          alt={block.data.label || "Advertisement"}
          className="mx-auto max-h-48 object-contain"
          loading="lazy"
        />
      );
      return (
        <aside className="my-8 text-center" aria-label={block.data.label || "Advertisement"}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {block.data.label || "Advertisement"}
          </p>
          {block.data.linkUrl ? (
            <a href={block.data.linkUrl} target="_blank" rel="noopener noreferrer sponsored">
              {img}
            </a>
          ) : (
            img
          )}
        </aside>
      );
    }
  }
}

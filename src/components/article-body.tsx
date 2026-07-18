import { parseBody, embedSrc, isDirectVideoFile, type Block } from "@/lib/blocks";

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

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      if (!block.data.text.trim()) return null;
      return <p className="whitespace-pre-wrap">{block.data.text}</p>;
    case "heading": {
      if (!block.data.text.trim()) return null;
      return block.data.level === 2 ? (
        <h2 className="mb-4 mt-8 font-serif text-2xl font-semibold text-ink">{block.data.text}</h2>
      ) : (
        <h3 className="mb-3 mt-6 font-serif text-xl font-semibold text-ink">{block.data.text}</h3>
      );
    }
    case "image":
      if (!block.data.url) return null;
      return (
        <figure className="my-8">
          <img src={block.data.url} alt={block.data.alt} className="w-full object-cover" loading="lazy" />
          {block.data.caption && (
            <figcaption className="mt-2 text-xs text-muted-foreground">{block.data.caption}</figcaption>
          )}
        </figure>
      );
    case "video": {
      if (!block.data.url) return null;
      const src = embedSrc(block.data.url);
      return (
        <figure className="my-8">
          {src ? (
            <iframe src={src} title={block.data.caption || "Video"} className="aspect-video w-full" allowFullScreen />
          ) : isDirectVideoFile(block.data.url) ? (
            <video src={block.data.url} controls className="aspect-video w-full bg-black" />
          ) : (
            <a href={block.data.url} target="_blank" rel="noopener noreferrer" className="text-crimson underline">
              Watch video
            </a>
          )}
          {block.data.caption && (
            <figcaption className="mt-2 text-xs text-muted-foreground">{block.data.caption}</figcaption>
          )}
        </figure>
      );
    }
    case "quote":
      if (!block.data.text.trim()) return null;
      return (
        <blockquote className="my-8 border-l-2 border-crimson pl-5">
          <p className="font-serif text-xl italic leading-relaxed text-ink">{block.data.text}</p>
          {block.data.attribution && (
            <cite className="mt-2 block text-sm not-italic text-muted-foreground">— {block.data.attribution}</cite>
          )}
        </blockquote>
      );
    case "divider":
      return <hr className="my-10 mx-auto w-24 border-t-2 border-border" />;
    case "embed": {
      if (!block.data.url) return null;
      const src = embedSrc(block.data.url);
      return (
        <figure className="my-8">
          {src ? (
            <iframe src={src} title={block.data.caption || "Embedded content"} className="aspect-video w-full" allowFullScreen />
          ) : (
            <a href={block.data.url} target="_blank" rel="noopener noreferrer" className="text-crimson underline">
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
            <img key={i} src={img.url} alt={img.alt} className="aspect-square w-full object-cover" loading="lazy" />
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
                {time.toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
              </time>
            )}
          </div>
          {block.data.title && <h3 className="mt-2 font-serif text-lg font-semibold text-ink">{block.data.title}</h3>}
          {block.data.text && <p className="mt-1 whitespace-pre-wrap text-base leading-7">{block.data.text}</p>}
        </div>
      );
    }
  }
}

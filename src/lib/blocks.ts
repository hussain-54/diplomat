// Block document model stored as versioned JSON in articles.body.
// Legacy articles (plain text) are converted to paragraph blocks on load.

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "video"
  | "quote"
  | "divider"
  | "embed"
  | "gallery"
  | "table"
  | "code"
  | "live";

export type GalleryImage = { url: string; alt: string };

export type BlockData = {
  paragraph: { text: string };
  heading: { text: string; level: 2 | 3 };
  image: { url: string; alt: string; caption: string };
  video: { url: string; caption: string };
  quote: { text: string; attribution: string };
  divider: Record<string, never>;
  embed: { url: string; caption: string };
  gallery: { images: GalleryImage[] };
  table: { headers: string[]; rows: string[][] };
  code: { language: string; code: string };
  live: { time: string; title: string; text: string };
};

export type Block = {
  [T in BlockType]: { id: string; type: T; data: BlockData[T] };
}[BlockType];

export type BlockDocument = { v: 1; blocks: Block[] };

export const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  image: "Image",
  video: "Video",
  quote: "Quote",
  divider: "Divider",
  embed: "Embed",
  gallery: "Gallery",
  table: "Table",
  code: "Code Block",
  live: "Live Blog Entry",
};

export function blockId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBlock(type: BlockType): Block {
  const id = blockId();
  switch (type) {
    case "paragraph":
      return { id, type, data: { text: "" } };
    case "heading":
      return { id, type, data: { text: "", level: 2 } };
    case "image":
      return { id, type, data: { url: "", alt: "", caption: "" } };
    case "video":
      return { id, type, data: { url: "", caption: "" } };
    case "quote":
      return { id, type, data: { text: "", attribution: "" } };
    case "divider":
      return { id, type, data: {} };
    case "embed":
      return { id, type, data: { url: "", caption: "" } };
    case "gallery":
      return { id, type, data: { images: [] } };
    case "table":
      return {
        id,
        type,
        data: {
          headers: ["Column 1", "Column 2", "Column 3"],
          rows: [
            ["", "", ""],
            ["", "", ""],
          ],
        },
      };
    case "code":
      return { id, type, data: { language: "text", code: "" } };
    case "live":
      return {
        id,
        type,
        data: { time: new Date().toISOString(), title: "", text: "" },
      };
  }
}

export function serializeBlocks(blocks: Block[]): string {
  const doc: BlockDocument = { v: 1, blocks };
  return JSON.stringify(doc);
}

/** Parse an article body: block JSON when present, otherwise legacy plain text. */
export function parseBody(body: string | null | undefined): Block[] {
  if (!body || !body.trim()) return [createBlock("paragraph")];
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const doc = JSON.parse(trimmed) as Partial<BlockDocument>;
      if (Array.isArray(doc.blocks)) {
        const blocks = doc.blocks.filter(
          (b): b is Block => !!b && typeof b === "object" && b.type in BLOCK_LABELS,
        );
        return blocks.length ? blocks : [createBlock("paragraph")];
      }
    } catch {
      // fall through to legacy parsing
    }
  }
  return trimmed
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ id: blockId(), type: "paragraph" as const, data: { text } }));
}

export function isBlockBody(body: string | null | undefined): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const doc = JSON.parse(trimmed) as Partial<BlockDocument>;
    return Array.isArray(doc.blocks);
  } catch {
    return false;
  }
}

/** Plain-text rendition used for excerpts and search. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "paragraph":
        case "heading":
          return b.data.text;
        case "quote":
          return b.data.text;
        case "live":
          return `${b.data.title} ${b.data.text}`.trim();
        case "table":
          return [b.data.headers.join(" | "), ...b.data.rows.map((row) => row.join(" | "))].join(
            "\n",
          );
        case "code":
          return b.data.code;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Best-effort iframe src for common providers; null means render a link instead. */
export function embedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      const shorts = u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{6,})/);
      if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com" || host === "youtube-nocookie.com") {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

export function isDirectVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

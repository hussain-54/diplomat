// Block document model stored as versioned JSON in articles.body.
// Legacy articles (plain text) are converted to paragraph blocks on load.

export type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "video"
  | "quote"
  | "pullquote"
  | "list"
  | "divider"
  | "embed"
  | "gallery"
  | "table"
  | "code"
  | "live"
  | "html";

export type GalleryImage = { url: string; alt: string };
export type ListStyle = "bullet" | "numbered" | "check";
export type ListItem = { text: string; checked?: boolean };
export type ImageAlign = "left" | "center" | "right" | "full";
export type HeadingLevel = 1 | 2 | 3 | 4;

export type BlockData = {
  paragraph: { text: string };
  heading: { text: string; level: HeadingLevel };
  image: {
    url: string;
    alt: string;
    caption: string;
    credit: string;
    align: ImageAlign;
  };
  video: { url: string; caption: string };
  quote: { text: string; attribution: string };
  pullquote: { text: string; attribution: string };
  list: { style: ListStyle; items: ListItem[] };
  divider: Record<string, never>;
  embed: { url: string; caption: string };
  gallery: { images: GalleryImage[] };
  table: { headers: string[]; rows: string[][] };
  code: { language: string; code: string };
  live: { time: string; title: string; text: string };
  html: { code: string };
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
  pullquote: "Pull Quote",
  list: "List",
  divider: "Divider",
  embed: "Embed",
  gallery: "Gallery",
  table: "Table",
  code: "Code Block",
  live: "Live Blog Entry",
  html: "Custom HTML",
};

/** Types that can be converted between while preserving text where possible. */
export const CONVERTIBLE_TYPES: BlockType[] = [
  "paragraph",
  "heading",
  "quote",
  "pullquote",
  "list",
  "code",
  "html",
];

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
      return { id, type, data: { url: "", alt: "", caption: "", credit: "", align: "full" } };
    case "video":
      return { id, type, data: { url: "", caption: "" } };
    case "quote":
      return { id, type, data: { text: "", attribution: "" } };
    case "pullquote":
      return { id, type, data: { text: "", attribution: "" } };
    case "list":
      return {
        id,
        type,
        data: {
          style: "bullet",
          items: [{ text: "" }, { text: "" }],
        },
      };
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
    case "html":
      return { id, type, data: { code: "" } };
  }
}

function extractText(block: Block): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "pullquote":
      return block.data.text;
    case "list":
      return block.data.items.map((item) => item.text).join("\n");
    case "code":
      return block.data.code;
    case "html":
      return block.data.code;
    case "live":
      return `${block.data.title}\n${block.data.text}`.trim();
    default:
      return "";
  }
}

/** Convert a block to another type, preserving text when possible. */
export function convertBlockType(block: Block, to: BlockType): Block {
  if (block.type === to) return block;
  const text = extractText(block);
  const id = block.id;
  switch (to) {
    case "paragraph":
      return { id, type: "paragraph", data: { text } };
    case "heading":
      return { id, type: "heading", data: { text, level: 2 } };
    case "quote":
      return {
        id,
        type: "quote",
        data: {
          text,
          attribution:
            block.type === "quote" || block.type === "pullquote"
              ? block.data.attribution
              : "",
        },
      };
    case "pullquote":
      return {
        id,
        type: "pullquote",
        data: {
          text,
          attribution:
            block.type === "quote" || block.type === "pullquote"
              ? block.data.attribution
              : "",
        },
      };
    case "list": {
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ text: line }));
      return {
        id,
        type: "list",
        data: {
          style: "bullet",
          items: lines.length ? lines : [{ text: "" }],
        },
      };
    }
    case "code":
      return { id, type: "code", data: { language: "text", code: text } };
    case "html":
      return { id, type: "html", data: { code: text } };
    default: {
      const next = createBlock(to);
      return { ...next, id } as Block;
    }
  }
}

function normalizeBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as { id?: string; type?: string; data?: Record<string, unknown> };
  if (!b.type || !(b.type in BLOCK_LABELS)) return null;
  const type = b.type as BlockType;
  const base = createBlock(type);
  const id = typeof b.id === "string" && b.id ? b.id : base.id;
  const data = { ...base.data, ...(b.data ?? {}) } as BlockData[typeof type];

  if (type === "heading") {
    const level = Number((data as BlockData["heading"]).level);
    (data as BlockData["heading"]).level = ([1, 2, 3, 4].includes(level) ? level : 2) as HeadingLevel;
  }
  if (type === "image") {
    const img = data as BlockData["image"];
    img.credit = typeof img.credit === "string" ? img.credit : "";
    img.align = (["left", "center", "right", "full"].includes(img.align) ? img.align : "full") as ImageAlign;
  }
  if (type === "list") {
    const list = data as BlockData["list"];
    if (!Array.isArray(list.items) || !list.items.length) {
      list.items = [{ text: "" }];
    }
    list.style = (["bullet", "numbered", "check"].includes(list.style) ? list.style : "bullet") as ListStyle;
  }

  return { id, type, data } as Block;
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
        const blocks = doc.blocks
          .map((b) => normalizeBlock(b))
          .filter((b): b is Block => b !== null);
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

/** Strip lightweight markdown marks for plain-text consumers. */
export function stripInlineMarks(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}

/** Plain-text rendition used for excerpts and search. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "paragraph":
        case "heading":
        case "quote":
        case "pullquote":
          return stripInlineMarks(b.data.text);
        case "list":
          return b.data.items.map((item) => stripInlineMarks(item.text)).join("\n");
        case "live":
          return stripInlineMarks(`${b.data.title} ${b.data.text}`.trim());
        case "table":
          return [b.data.headers.join(" | "), ...b.data.rows.map((row) => row.join(" | "))].join(
            "\n",
          );
        case "code":
        case "html":
          return b.type === "code" ? b.data.code : "";
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

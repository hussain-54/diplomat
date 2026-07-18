import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Braces,
  Code2,
  GripVertical,
  Heading2,
  Image as ImageIcon,
  Images,
  Minus,
  Plus,
  Quote,
  Radio,
  Redo2,
  Table2,
  Trash2,
  Undo2,
  Video,
  Copy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  BLOCK_LABELS,
  createBlock,
  embedSrc,
  isDirectVideoFile,
  type Block,
  type BlockType,
} from "@/lib/blocks";

const BLOCK_ICONS: Record<BlockType, typeof AlignLeft> = {
  paragraph: AlignLeft,
  heading: Heading2,
  image: ImageIcon,
  video: Video,
  quote: Quote,
  divider: Minus,
  embed: Code2,
  gallery: Images,
  table: Table2,
  code: Braces,
  live: Radio,
};

const BLOCK_MENU: BlockType[] = [
  "paragraph",
  "heading",
  "image",
  "video",
  "quote",
  "divider",
  "embed",
  "gallery",
  "table",
  "code",
  "live",
];

type Props = {
  value: Block[];
  onChange: (blocks: Block[]) => void;
  readOnly?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
};

export function BlockEditor({ value, onChange, readOnly, onUploadImage }: Props) {
  const past = useRef<Block[][]>([]);
  const future = useRef<Block[][]>([]);
  const lastPush = useRef<{ at: number; blockId: string | null }>({ at: 0, blockId: null });
  const [, forceRender] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [menuAt, setMenuAt] = useState<number | null>(null);

  const apply = useCallback(
    (next: Block[], editedBlockId: string | null = null) => {
      // Coalesce rapid typing in the same block into one undo step.
      const now = Date.now();
      const coalesce =
        editedBlockId !== null &&
        editedBlockId === lastPush.current.blockId &&
        now - lastPush.current.at < 900;
      if (!coalesce) {
        past.current = [...past.current.slice(-99), value];
        future.current = [];
      }
      lastPush.current = { at: now, blockId: editedBlockId };
      onChange(next);
      forceRender((n) => n + 1);
    },
    [value, onChange],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(value);
    lastPush.current = { at: 0, blockId: null };
    onChange(prev);
    forceRender((n) => n + 1);
  }, [value, onChange]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(value);
    lastPush.current = { at: 0, blockId: null };
    onChange(next);
    forceRender((n) => n + 1);
  }, [value, onChange]);

  const updateBlock = (id: string, data: Block["data"]) => {
    apply(
      value.map((b) => (b.id === id ? ({ ...b, data } as Block) : b)),
      id,
    );
  };

  const insertAt = (index: number, type: BlockType) => {
    const next = [...value];
    next.splice(index, 0, createBlock(type));
    apply(next);
    setMenuAt(null);
  };

  const removeBlock = (id: string) => {
    const next = value.filter((b) => b.id !== id);
    apply(next.length ? next : [createBlock("paragraph")]);
  };

  const duplicateBlock = (index: number) => {
    const src = value[index];
    const copy = { ...createBlock(src.type), data: JSON.parse(JSON.stringify(src.data)) } as Block;
    const next = [...value];
    next.splice(index + 1, 0, copy);
    apply(next);
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    apply(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    } else if ((mod && e.shiftKey && e.key.toLowerCase() === "z") || (mod && e.key.toLowerCase() === "y")) {
      e.preventDefault();
      redo();
    }
  };

  useEffect(() => {
    if (menuAt === null) return;
    const close = () => setMenuAt(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuAt]);

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <div className="text-[11px] text-muted-foreground">
          <kbd className="border border-border bg-background px-1">Ctrl+Z</kbd> undo ·{" "}
          <kbd className="border border-border bg-background px-1">Ctrl+Shift+Z</kbd> redo ·{" "}
          <kbd className="border border-border bg-background px-1">Ctrl+Enter</kbd> new paragraph ·{" "}
          <kbd className="border border-border bg-background px-1">Alt+↑/↓</kbd> move block ·{" "}
          <kbd className="border border-border bg-background px-1">Ctrl+S</kbd> save
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            disabled={readOnly || !past.current.length}
            onClick={undo}
            className="inline-flex h-7 w-7 items-center justify-center border border-input text-muted-foreground hover:bg-accent disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Shift+Z)"
            disabled={readOnly || !future.current.length}
            onClick={redo}
            className="inline-flex h-7 w-7 items-center justify-center border border-input text-muted-foreground hover:bg-accent disabled:opacity-40"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1 p-3">
        {value.map((block, index) => (
          <div key={block.id}>
            <AddBlockRow
              open={menuAt === index}
              readOnly={readOnly}
              onToggle={(e) => {
                e.stopPropagation();
                setMenuAt(menuAt === index ? null : index);
              }}
              onPick={(type) => insertAt(index, type)}
            />
            <div
              draggable={!readOnly}
              onDragStart={(e) => {
                setDragId(block.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragId) return;
                const from = value.findIndex((b) => b.id === dragId);
                if (from !== -1) moveBlock(from, index);
                setDragId(null);
                setOverIndex(null);
              }}
              className={`group border transition-colors ${
                overIndex === index && dragId && dragId !== block.id
                  ? "border-ring bg-accent/40"
                  : "border-transparent hover:border-border"
              } ${dragId === block.id ? "opacity-40" : ""}`}
            >
              <div className="flex items-start gap-2 p-2">
                <div className="flex shrink-0 flex-col items-center gap-1 pt-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <span
                    className={`text-muted-foreground ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <BlockIcon type={block.type} /> {BLOCK_LABELS[block.type]}
                    </span>
                    {!readOnly && (
                      <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <ToolButton title="Move up (Alt+↑)" onClick={() => moveBlock(index, index - 1)}>
                          <ArrowUp className="h-3 w-3" />
                        </ToolButton>
                        <ToolButton title="Move down (Alt+↓)" onClick={() => moveBlock(index, index + 1)}>
                          <ArrowDown className="h-3 w-3" />
                        </ToolButton>
                        <ToolButton title="Duplicate block" onClick={() => duplicateBlock(index)}>
                          <Copy className="h-3 w-3" />
                        </ToolButton>
                        <ToolButton title="Delete block" onClick={() => removeBlock(block.id)}>
                          <Trash2 className="h-3 w-3" />
                        </ToolButton>
                      </span>
                    )}
                  </div>
                  <BlockFields
                    block={block}
                    readOnly={readOnly}
                    onUploadImage={onUploadImage}
                    onChange={(data) => updateBlock(block.id, data)}
                    onKeyDown={(e) => {
                      if (readOnly) return;
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        insertAt(index + 1, "paragraph");
                      } else if (e.altKey && e.key === "ArrowUp") {
                        e.preventDefault();
                        moveBlock(index, index - 1);
                      } else if (e.altKey && e.key === "ArrowDown") {
                        e.preventDefault();
                        moveBlock(index, index + 1);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        <AddBlockRow
          open={menuAt === value.length}
          readOnly={readOnly}
          always
          onToggle={(e) => {
            e.stopPropagation();
            setMenuAt(menuAt === value.length ? null : value.length);
          }}
          onPick={(type) => insertAt(value.length, type)}
        />
      </div>
    </div>
  );
}

function BlockIcon({ type }: { type: BlockType }) {
  const Icon = BLOCK_ICONS[type];
  return <Icon className="h-3 w-3" />;
}

function ToolButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-6 w-6 items-center justify-center border border-transparent text-muted-foreground hover:border-input hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function AddBlockRow({
  open,
  always,
  readOnly,
  onToggle,
  onPick,
}: {
  open: boolean;
  always?: boolean;
  readOnly?: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onPick: (type: BlockType) => void;
}) {
  if (readOnly) return null;
  return (
    <div className={`relative ${always ? "" : "h-2 opacity-0 transition-opacity hover:h-auto hover:opacity-100"}`}>
      <div className="flex items-center gap-2 py-1">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-6 items-center gap-1 border border-dashed border-input px-2 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground ${always ? "w-full justify-center" : ""}`}
        >
          <Plus className="h-3 w-3" /> Add block
        </button>
      </div>
      {open && (
        <div
          className="absolute left-0 top-8 z-20 grid w-72 grid-cols-3 gap-1 border border-border bg-popover p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {BLOCK_MENU.map((type) => {
            const Icon = BLOCK_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => onPick(type)}
                className="flex flex-col items-center gap-1 border border-transparent px-2 py-2 text-[10px] font-semibold text-muted-foreground hover:border-input hover:bg-accent hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {BLOCK_LABELS[type]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const fieldClass =
  "w-full border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring";

function BlockFields({
  block,
  readOnly,
  onChange,
  onKeyDown,
  onUploadImage,
}: {
  block: Block;
  readOnly?: boolean;
  onChange: (data: Block["data"]) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const common = { disabled: readOnly, onKeyDown };

  switch (block.type) {
    case "paragraph":
      return (
        <AutoTextarea
          {...common}
          value={block.data.text}
          placeholder="Write a paragraph…"
          onChange={(text) => onChange({ ...block.data, text })}
          className={`${fieldClass} font-serif text-base leading-7`}
        />
      );
    case "heading":
      return (
        <div className="flex items-start gap-2">
          <input
            {...common}
            value={block.data.text}
            placeholder="Heading text"
            onChange={(e) => onChange({ ...block.data, text: e.target.value })}
            className={`${fieldClass} font-serif ${block.data.level === 2 ? "text-xl font-semibold" : "text-lg"}`}
          />
          <select
            disabled={readOnly}
            value={block.data.level}
            onChange={(e) => onChange({ ...block.data, level: Number(e.target.value) as 2 | 3 })}
            className="h-9 shrink-0 border border-input bg-background px-2 text-xs"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          {block.data.url && (
            <img src={block.data.url} alt={block.data.alt} className="max-h-64 border border-border object-contain" />
          )}
          <MediaUrlInput
            readOnly={readOnly}
            url={block.data.url}
            onUrl={(url) => onChange({ ...block.data, url })}
            onUploadImage={onUploadImage}
            placeholder="Image URL"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              {...common}
              value={block.data.alt}
              placeholder="Alt text (accessibility)"
              onChange={(e) => onChange({ ...block.data, alt: e.target.value })}
              className={`${fieldClass} text-xs`}
            />
            <input
              {...common}
              value={block.data.caption}
              placeholder="Caption (optional)"
              onChange={(e) => onChange({ ...block.data, caption: e.target.value })}
              className={`${fieldClass} text-xs`}
            />
          </div>
        </div>
      );
    case "video":
      return (
        <div className="space-y-2">
          <input
            {...common}
            value={block.data.url}
            placeholder="Video URL (YouTube, Vimeo, or direct .mp4)"
            onChange={(e) => onChange({ ...block.data, url: e.target.value })}
            className={`${fieldClass} text-xs`}
          />
          <VideoPreview url={block.data.url} />
          <input
            {...common}
            value={block.data.caption}
            placeholder="Caption (optional)"
            onChange={(e) => onChange({ ...block.data, caption: e.target.value })}
            className={`${fieldClass} text-xs`}
          />
        </div>
      );
    case "quote":
      return (
        <div className="space-y-2 border-l-2 border-crimson pl-3">
          <AutoTextarea
            {...common}
            value={block.data.text}
            placeholder="Quote text…"
            onChange={(text) => onChange({ ...block.data, text })}
            className={`${fieldClass} font-serif text-lg italic`}
          />
          <input
            {...common}
            value={block.data.attribution}
            placeholder="Attribution (e.g. Foreign Minister, at UNGA)"
            onChange={(e) => onChange({ ...block.data, attribution: e.target.value })}
            className={`${fieldClass} text-xs`}
          />
        </div>
      );
    case "divider":
      return <hr className="my-2 border-t-2 border-border" />;
    case "embed":
      return (
        <div className="space-y-2">
          <input
            {...common}
            value={block.data.url}
            placeholder="Embed URL (YouTube, Vimeo…)"
            onChange={(e) => onChange({ ...block.data, url: e.target.value })}
            className={`${fieldClass} text-xs`}
          />
          {block.data.url &&
            (embedSrc(block.data.url) ? (
              <iframe
                src={embedSrc(block.data.url)!}
                title="Embed preview"
                className="aspect-video w-full border border-border"
                allowFullScreen
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No inline preview for this provider — it will render as an external link.
              </p>
            ))}
          <input
            {...common}
            value={block.data.caption}
            placeholder="Caption (optional)"
            onChange={(e) => onChange({ ...block.data, caption: e.target.value })}
            className={`${fieldClass} text-xs`}
          />
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-2">
          {block.data.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {block.data.images.map((img, i) => (
                <div key={i} className="group/img relative">
                  <img src={img.url} alt={img.alt} className="aspect-square w-full border border-border object-cover" />
                  {!readOnly && (
                    <button
                      type="button"
                      title="Remove image"
                      onClick={() =>
                        onChange({ images: block.data.images.filter((_, j) => j !== i) })
                      }
                      className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center bg-background/90 text-crimson group-hover/img:flex"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  <input
                    disabled={readOnly}
                    value={img.alt}
                    placeholder="Alt text"
                    onChange={(e) =>
                      onChange({
                        images: block.data.images.map((g, j) => (j === i ? { ...g, alt: e.target.value } : g)),
                      })
                    }
                    className="mt-1 w-full border border-input bg-background px-2 py-1 text-[11px] outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          {!readOnly && (
            <MediaUrlInput
              readOnly={readOnly}
              url=""
              clearAfterAdd
              onUrl={(url) => {
                if (url) onChange({ images: [...block.data.images, { url, alt: "" }] });
              }}
              onUploadImage={onUploadImage}
              placeholder="Add image URL and press Enter"
            />
          )}
        </div>
      );
    case "table": {
      const colCount = Math.max(block.data.headers.length, 1);
      return (
        <div className="space-y-2 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                {block.data.headers.map((header, col) => (
                  <th key={col} className="border border-border bg-muted/40 p-1">
                    <input
                      {...common}
                      value={header}
                      placeholder={`Header ${col + 1}`}
                      onChange={(e) =>
                        onChange({
                          ...block.data,
                          headers: block.data.headers.map((cell, i) =>
                            i === col ? e.target.value : cell,
                          ),
                        })
                      }
                      className={`${fieldClass} border-0 bg-transparent px-2 py-1 text-xs font-semibold`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.data.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: colCount }, (_, col) => (
                    <td key={col} className="border border-border p-1">
                      <input
                        {...common}
                        value={row[col] ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          onChange({
                            ...block.data,
                            rows: block.data.rows.map((cells, r) =>
                              r === rowIndex
                                ? Array.from({ length: colCount }, (_, c) =>
                                    c === col ? e.target.value : (cells[c] ?? ""),
                                  )
                                : cells,
                            ),
                          })
                        }
                        className={`${fieldClass} border-0 bg-transparent px-2 py-1 text-xs`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="border border-input px-2 py-1 text-[11px] font-semibold hover:bg-accent"
                onClick={() =>
                  onChange({
                    ...block.data,
                    rows: [...block.data.rows, Array.from({ length: colCount }, () => "")],
                  })
                }
              >
                Add row
              </button>
              <button
                type="button"
                className="border border-input px-2 py-1 text-[11px] font-semibold hover:bg-accent"
                onClick={() =>
                  onChange({
                    headers: [...block.data.headers, `Column ${colCount + 1}`],
                    rows: block.data.rows.map((row) => [...row, ""]),
                  })
                }
              >
                Add column
              </button>
            </div>
          ) : null}
        </div>
      );
    }
    case "code":
      return (
        <div className="space-y-2">
          <select
            disabled={readOnly}
            value={block.data.language}
            onChange={(e) => onChange({ ...block.data, language: e.target.value })}
            className="h-8 border border-input bg-background px-2 text-xs"
          >
            {["text", "javascript", "typescript", "json", "html", "css", "sql", "bash"].map(
              (lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ),
            )}
          </select>
          <textarea
            {...common}
            value={block.data.code}
            placeholder="// Code…"
            rows={8}
            onChange={(e) => onChange({ ...block.data, code: e.target.value })}
            className={`${fieldClass} font-mono text-xs leading-5`}
          />
        </div>
      );
    case "live":
      return (
        <div className="space-y-2 border-l-2 border-cat-blue pl-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-crimson/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-crimson">
              <Radio className="h-3 w-3" /> Live
            </span>
            <input
              disabled={readOnly}
              type="datetime-local"
              value={toLocalInput(block.data.time)}
              onChange={(e) =>
                onChange({
                  ...block.data,
                  time: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString(),
                })
              }
              className="h-8 border border-input bg-background px-2 text-xs"
            />
          </div>
          <input
            {...common}
            value={block.data.title}
            placeholder="Update headline"
            onChange={(e) => onChange({ ...block.data, title: e.target.value })}
            className={`${fieldClass} font-semibold`}
          />
          <AutoTextarea
            {...common}
            value={block.data.text}
            placeholder="What just happened…"
            onChange={(text) => onChange({ ...block.data, text })}
            className={`${fieldClass} text-sm leading-6`}
          />
        </div>
      );
  }
}

function VideoPreview({ url }: { url: string }) {
  if (!url) return null;
  const src = embedSrc(url);
  if (src) {
    return <iframe src={src} title="Video preview" className="aspect-video w-full border border-border" allowFullScreen />;
  }
  if (isDirectVideoFile(url)) {
    return <video src={url} controls className="aspect-video w-full border border-border bg-black" />;
  }
  return <p className="text-xs text-muted-foreground">Unrecognized video URL — it will render as an external link.</p>;
}

function MediaUrlInput({
  url,
  onUrl,
  readOnly,
  onUploadImage,
  placeholder,
  clearAfterAdd,
}: {
  url: string;
  onUrl: (url: string) => void;
  readOnly?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
  placeholder: string;
  clearAfterAdd?: boolean;
}) {
  const [draft, setDraft] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(url), [url]);

  const commit = (value: string) => {
    onUrl(value.trim());
    if (clearAfterAdd) setDraft("");
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          disabled={readOnly}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (!clearAfterAdd) commit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            }
          }}
          className={`${fieldClass} text-xs`}
        />
        {onUploadImage && !readOnly && (
          <label className="inline-flex h-9 shrink-0 cursor-pointer items-center border border-input px-3 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
            {busy ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                setError(null);
                try {
                  const uploaded = await onUploadImage(file);
                  commit(uploaded);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-crimson">{error}</p>}
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={`${className} resize-none overflow-hidden`}
    />
  );
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  CheckSquare,
  ChevronDown,
  Code2,
  Copy,
  File,
  FileCode2,
  FolderOpen,
  GripVertical,
  Headphones,
  Heading2,
  Image as ImageIcon,
  Images,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mail,
  Maximize2,
  Megaphone,
  Minus,
  Plus,
  Quote,
  Radio,
  Redo2,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Video,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  BLOCK_LABELS,
  CONVERTIBLE_TYPES,
  convertBlockType,
  createBlock,
  embedSrc,
  isDirectVideoFile,
  type Block,
  type BlockType,
  type HeadingLevel,
  type ImageAlign,
  type ImageSize,
  type ListStyle,
} from "@/lib/blocks";
import {
  EditorBubbleToolbar,
  selectionBubblePos,
  type BubblePos,
} from "@/components/editor-bubble-toolbar";
import { DamAssetPicker } from "@/components/articles/dam-asset-picker";
import {
  clipboardToEditorText,
  looksLikeRichHtml,
  pasteLooksLikeList,
  pasteToListItems,
  splitPasteParagraphs,
} from "@/lib/paste-cleanup";
import { wrapSelection } from "@/lib/writing-stats";

function insertAtCaret(
  value: string,
  start: number,
  end: number,
  insert: string,
): { text: string; selectionStart: number; selectionEnd: number } {
  const text = value.slice(0, start) + insert + value.slice(end);
  const caret = start + insert.length;
  return { text, selectionStart: caret, selectionEnd: caret };
}

const BLOCK_ICONS: Record<BlockType, typeof AlignLeft> = {
  paragraph: AlignLeft,
  heading: Heading2,
  image: ImageIcon,
  video: Video,
  audio: Headphones,
  file: File,
  quote: Quote,
  pullquote: Quote,
  list: List,
  divider: Minus,
  embed: Code2,
  gallery: Images,
  table: Table2,
  code: Braces,
  live: Radio,
  html: FileCode2,
  newsletter: Mail,
  ad: Megaphone,
};

const BLOCK_MENU: BlockType[] = [
  "paragraph",
  "heading",
  "image",
  "video",
  "audio",
  "file",
  "gallery",
  "quote",
  "pullquote",
  "list",
  "divider",
  "embed",
  "table",
  "code",
  "live",
  "html",
  "newsletter",
  "ad",
];

const IMAGE_SIZE_PREVIEW: Record<ImageSize, string> = {
  small: "max-w-xs",
  medium: "max-w-sm",
  large: "max-w-md",
  full: "w-full max-w-full",
};

type Props = {
  value: Block[];
  onChange: (blocks: Block[]) => void;
  readOnly?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
};

type ActiveField = {
  blockId: string;
  el: HTMLTextAreaElement | HTMLInputElement;
};

export function BlockEditor({ value, onChange, readOnly, onUploadImage }: Props) {
  const past = useRef<Block[][]>([]);
  const future = useRef<Block[][]>([]);
  const lastPush = useRef<{ at: number; blockId: string | null }>({ at: 0, blockId: null });
  const [, forceRender] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [menuAt, setMenuAt] = useState<number | null>(null);
  const [slashAt, setSlashAt] = useState<{ blockId: string; query: string } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [convertOpenId, setConvertOpenId] = useState<string | null>(null);
  const [bubblePos, setBubblePos] = useState<BubblePos | null>(null);
  const bubbleBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusedBlock = value.find((b) => b.id === focusedBlockId) ?? null;

  const updateBubble = useCallback(() => {
    if (readOnly || !activeField) {
      setBubblePos(null);
      return;
    }
    setBubblePos(selectionBubblePos(activeField.el));
  }, [readOnly, activeField]);

  const focusField = useCallback((blockId: string, el: HTMLTextAreaElement | HTMLInputElement) => {
    if (bubbleBlurTimer.current) {
      clearTimeout(bubbleBlurTimer.current);
      bubbleBlurTimer.current = null;
    }
    setActiveField({ blockId, el });
  }, []);

  const blurField = useCallback(() => {
    if (bubbleBlurTimer.current) clearTimeout(bubbleBlurTimer.current);
    bubbleBlurTimer.current = setTimeout(() => {
      setBubblePos(null);
      bubbleBlurTimer.current = null;
    }, 150);
  }, []);

  useEffect(() => {
    if (!activeField) {
      setBubblePos(null);
      return;
    }
    const el = activeField.el;
    const onSel = () => {
      if (readOnly) {
        setBubblePos(null);
        return;
      }
      setBubblePos(selectionBubblePos(el));
    };
    el.addEventListener("select", onSel);
    el.addEventListener("mouseup", onSel);
    el.addEventListener("keyup", onSel);
    onSel();
    return () => {
      el.removeEventListener("select", onSel);
      el.removeEventListener("mouseup", onSel);
      el.removeEventListener("keyup", onSel);
    };
  }, [activeField, readOnly]);

  const apply = useCallback(
    (next: Block[], editedBlockId: string | null = null) => {
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
    setSlashAt(null);
  };

  const removeBlock = (id: string) => {
    const next = value.filter((b) => b.id !== id);
    apply(next.length ? next : [createBlock("paragraph")]);
    if (slashAt?.blockId === id) setSlashAt(null);
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

  const convertBlock = (id: string, to: BlockType) => {
    apply(
      value.map((b) => (b.id === id ? convertBlockType(b, to) : b)),
      id,
    );
    setConvertOpenId(null);
  };

  const applyMark = (before: string, after?: string) => {
    if (readOnly || !activeField) return;
    const { el, blockId } = activeField;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const result = wrapSelection(el.value, start, end, before, after ?? before);
    const block = value.find((b) => b.id === blockId);
    if (!block) return;

    let nextData: Block["data"] | null = null;
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote" || block.type === "pullquote") {
      nextData = { ...block.data, text: result.text };
    } else if (block.type === "code" || block.type === "html") {
      nextData = { ...block.data, code: result.text };
    } else if (block.type === "live") {
      nextData = { ...block.data, text: result.text };
    }
    if (!nextData) return;

    updateBlock(blockId, nextData);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const insertLink = () => {
    if (readOnly || !activeField) return;
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    applyMark("[", `](${url})`);
  };

  const setHeadingLevel = (level: HeadingLevel) => {
    if (!focusedBlock || focusedBlock.type !== "heading") return;
    updateBlock(focusedBlock.id, { ...focusedBlock.data, level });
  };

  const setImageAlign = (align: ImageAlign) => {
    if (!focusedBlock || focusedBlock.type !== "image") return;
    updateBlock(focusedBlock.id, { ...focusedBlock.data, align });
  };

  const setImageSize = (size: ImageSize) => {
    if (!focusedBlock || focusedBlock.type !== "image") return;
    updateBlock(focusedBlock.id, { ...focusedBlock.data, size });
  };

  const filteredSlash = (() => {
    if (!slashAt) return [];
    const q = slashAt.query.toLowerCase();
    return BLOCK_MENU.filter(
      (t) => !q || t.includes(q) || BLOCK_LABELS[t].toLowerCase().includes(q),
    );
  })();

  useEffect(() => {
    setSlashIndex(0);
  }, [slashAt?.query, slashAt?.blockId]);

  const pickSlash = (type: BlockType) => {
    if (!slashAt) return;
    const idx = value.findIndex((b) => b.id === slashAt.blockId);
    if (idx === -1) return;
    const next = [...value];
    next[idx] = createBlock(type);
    apply(next);
    setSlashAt(null);
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
    } else if (mod && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyMark("**");
    } else if (mod && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyMark("*");
    } else if (mod && e.key.toLowerCase() === "u") {
      e.preventDefault();
      applyMark("__");
    }
  };

  useEffect(() => {
    if (menuAt === null && convertOpenId === null) return;
    const close = () => {
      setMenuAt(null);
      setConvertOpenId(null);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuAt, convertOpenId]);

  const isEmptyCanvas =
    value.length === 1 &&
    value[0]?.type === "paragraph" &&
    !(value[0] as Extract<Block, { type: "paragraph" }>).data.text.trim();

  return (
    <div onKeyDown={onKeyDown} className="relative">
      {bubblePos && !readOnly && (
        <EditorBubbleToolbar
          pos={bubblePos}
          onBold={() => applyMark("**")}
          onItalic={() => applyMark("*")}
          onUnderline={() => applyMark("__")}
          onStrike={() => applyMark("~~")}
          onLink={insertLink}
        />
      )}
      {/* Sticky formatting toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-1 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ToolButton
          title="Undo (Ctrl+Z)"
          disabled={readOnly || !past.current.length}
          onClick={undo}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          title="Redo (Ctrl+Shift+Z)"
          disabled={readOnly || !future.current.length}
          onClick={redo}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolbarSep />
        <ToolButton title="Bold (Ctrl+B)" disabled={readOnly || !activeField} onClick={() => applyMark("**")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Italic (Ctrl+I)" disabled={readOnly || !activeField} onClick={() => applyMark("*")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Underline (Ctrl+U)" disabled={readOnly || !activeField} onClick={() => applyMark("__")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Strikethrough" disabled={readOnly || !activeField} onClick={() => applyMark("~~")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton title="Insert link" disabled={readOnly || !activeField} onClick={insertLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolButton>

        {focusedBlock?.type === "heading" && (
          <>
            <ToolbarSep />
            {([1, 2, 3, 4] as HeadingLevel[]).map((level) => (
              <ToolButton
                key={level}
                title={`Heading ${level}`}
                active={focusedBlock.data.level === level}
                disabled={readOnly}
                onClick={() => setHeadingLevel(level)}
              >
                <span className="text-[11px] font-bold">H{level}</span>
              </ToolButton>
            ))}
          </>
        )}

        {focusedBlock?.type === "image" && (
          <>
            <ToolbarSep />
            {(
              [
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
                ["full", Maximize2],
              ] as const
            ).map(([align, Icon]) => (
              <ToolButton
                key={align}
                title={`Align ${align}`}
                active={focusedBlock.data.align === align}
                disabled={readOnly}
                onClick={() => setImageAlign(align)}
              >
                <Icon className="h-3.5 w-3.5" />
              </ToolButton>
            ))}
            <ToolbarSep />
            {(
              [
                ["small", "S"],
                ["medium", "M"],
                ["large", "L"],
                ["full", "Full"],
              ] as const
            ).map(([size, label]) => (
              <ToolButton
                key={size}
                title={`Size ${size}`}
                active={focusedBlock.data.size === size}
                disabled={readOnly}
                onClick={() => setImageSize(size)}
              >
                <span className="text-[11px] font-bold">{label}</span>
              </ToolButton>
            ))}
          </>
        )}

        <div className="ml-auto hidden text-[10px] text-muted-foreground sm:block">
          <kbd className="rounded border border-border px-1">/</kbd> blocks ·{" "}
          <kbd className="rounded border border-border px-1">Ctrl+Enter</kbd> paragraph
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-1 px-4 py-8 sm:px-6">
        {isEmptyCanvas && !readOnly && (
          <p className="pointer-events-none mb-2 select-none text-center font-serif text-sm text-muted-foreground/70">
            Type <span className="font-sans font-medium text-muted-foreground">/</span> to insert a block
          </p>
        )}

        {value.map((block, index) => (
          <div key={block.id} className="relative">
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
              onFocusCapture={() => setFocusedBlockId(block.id)}
              className={`group relative rounded-sm border transition-colors ${
                overIndex === index && dragId && dragId !== block.id
                  ? "border-ring bg-accent/30"
                  : "border-transparent hover:border-border/80 focus-within:border-border"
              } ${dragId === block.id ? "opacity-40" : ""}`}
            >
              <div className="flex items-start gap-1 px-1 py-1 sm:gap-2 sm:px-2">
                <div className="flex shrink-0 flex-col items-center gap-0.5 pt-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <span
                    className={`text-muted-foreground ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <div className="relative flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                        <BlockIcon type={block.type} /> {BLOCK_LABELS[block.type]}
                      </span>
                      {!readOnly && CONVERTIBLE_TYPES.includes(block.type) && (
                        <div className="relative">
                          <button
                            type="button"
                            title="Convert block"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvertOpenId(convertOpenId === block.id ? null : block.id);
                            }}
                            className="inline-flex h-5 items-center gap-0.5 rounded px-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            Convert <ChevronDown className="h-3 w-3" />
                          </button>
                          {convertOpenId === block.id && (
                            <div
                              className="absolute left-0 top-6 z-20 min-w-[9rem] border border-border bg-popover py-1 shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {CONVERTIBLE_TYPES.filter((t) => t !== block.type).map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => convertBlock(block.id, type)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-accent"
                                >
                                  <BlockIcon type={type} />
                                  {BLOCK_LABELS[type]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!readOnly && (
                      <span className="flex items-center gap-0.5">
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

                  <div className="relative">
                    <BlockFields
                      block={block}
                      readOnly={readOnly}
                      onUploadImage={onUploadImage}
                      onChange={(data) => updateBlock(block.id, data)}
                      onReplaceBlock={(next) => {
                        apply(
                          value.map((b) => (b.id === block.id ? { ...next, id: block.id } : b)),
                          block.id,
                        );
                      }}
                      onPasteBlocks={(chunks) => {
                        const idx = value.findIndex((b) => b.id === block.id);
                        if (idx === -1 || chunks.length < 2) return;
                        const [first, ...rest] = chunks;
                        const next = [...value];
                        next[idx] = { id: block.id, type: "paragraph", data: { text: first } };
                        const restJoined = rest.join("\n\n");
                        if (pasteLooksLikeList(restJoined)) {
                          const listBlock = createBlock("list") as Extract<Block, { type: "list" }>;
                          listBlock.data = { style: "bullet", items: pasteToListItems(restJoined) };
                          next.splice(idx + 1, 0, listBlock);
                        } else {
                          next.splice(
                            idx + 1,
                            0,
                            ...rest.map((text) => {
                              const para = createBlock("paragraph") as Extract<
                                Block,
                                { type: "paragraph" }
                              >;
                              para.data = { text };
                              return para;
                            }),
                          );
                        }
                        apply(next, block.id);
                      }}
                      onFocusField={(el) => focusField(block.id, el)}
                      onBlurField={blurField}
                      onSelectField={updateBubble}
                      onSlashQuery={(query) => {
                        if (query === null) setSlashAt(null);
                        else setSlashAt({ blockId: block.id, query });
                      }}
                      onKeyDown={(e) => {
                        if (readOnly) return;

                        if (slashAt?.blockId === block.id && filteredSlash.length) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setSlashIndex((i) => (i + 1) % filteredSlash.length);
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setSlashIndex((i) => (i - 1 + filteredSlash.length) % filteredSlash.length);
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            pickSlash(filteredSlash[slashIndex] ?? filteredSlash[0]);
                            return;
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setSlashAt(null);
                            return;
                          }
                        }

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

                    {slashAt?.blockId === block.id && filteredSlash.length > 0 && (
                      <div
                        className="absolute left-0 top-full z-40 mt-1 max-h-64 w-64 overflow-y-auto border border-border bg-popover shadow-lg"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {filteredSlash.map((type, i) => {
                          const Icon = BLOCK_ICONS[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => pickSlash(type)}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                                i === slashIndex
                                  ? "bg-accent text-foreground"
                                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{BLOCK_LABELS[type]}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

function ToolbarSep() {
  return <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />;
}

function ToolButton({
  title,
  onClick,
  children,
  disabled,
  active,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-sm px-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 ${
        active ? "bg-accent text-foreground" : ""
      }`}
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
    <div
      className={`relative ${
        always
          ? "mt-4"
          : "h-1 opacity-0 transition-all hover:h-auto hover:opacity-100 focus-within:h-auto focus-within:opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 py-0.5">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-6 items-center gap-1 rounded-sm border border-dashed border-border/80 px-2 text-[11px] font-medium text-muted-foreground hover:border-foreground/30 hover:bg-accent/50 hover:text-foreground ${
            always ? "w-full justify-center" : ""
          }`}
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
                className="flex flex-col items-center gap-1 rounded-sm border border-transparent px-2 py-2 text-[10px] font-semibold text-muted-foreground hover:border-input hover:bg-accent hover:text-foreground"
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

const canvasField =
  "w-full border-0 bg-transparent px-1 py-1 text-foreground outline-none placeholder:text-muted-foreground/50 focus:outline-none";

function BlockFields({
  block,
  readOnly,
  onChange,
  onReplaceBlock,
  onPasteBlocks,
  onKeyDown,
  onUploadImage,
  onFocusField,
  onBlurField,
  onSelectField,
  onSlashQuery,
}: {
  block: Block;
  readOnly?: boolean;
  onChange: (data: Block["data"]) => void;
  onReplaceBlock: (next: Block) => void;
  onPasteBlocks?: (chunks: string[]) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onUploadImage?: (file: File) => Promise<string>;
  onFocusField: (el: HTMLTextAreaElement | HTMLInputElement) => void;
  onBlurField?: () => void;
  onSelectField?: () => void;
  onSlashQuery: (query: string | null) => void;
}) {
  const [damOpen, setDamOpen] = useState(false);

  const common = {
    disabled: readOnly,
    onKeyDown,
    onFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      onFocusField(e.currentTarget),
    onBlur: () => onBlurField?.(),
    onSelect: () => onSelectField?.(),
    onMouseUp: () => onSelectField?.(),
    onKeyUp: () => onSelectField?.(),
  };

  const pasteClipboardImage = async (
    e: React.ClipboardEvent,
    mode: "image" | "paragraph",
  ) => {
    if (!onUploadImage || readOnly) return false;
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return false;
    const file = imageItem.getAsFile();
    if (!file) return false;
    e.preventDefault();
    try {
      const url = await onUploadImage(file);
      if (mode === "image" && block.type === "image") {
        onChange({ ...block.data, url });
      } else if (mode === "paragraph") {
        onReplaceBlock({
          id: block.id,
          type: "image",
          data: { url, alt: "", caption: "", credit: "", align: "full", size: "large" },
        });
      }
    } catch {
      /* ignore upload errors */
    }
    return true;
  };

  const handleRichTextPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    currentText: string,
    applyText: (next: string, selectionStart: number, selectionEnd: number) => void,
    opts?: { allowMultiBlock?: boolean },
  ) => {
    if (readOnly) return;
    const cleaned = clipboardToEditorText(e.clipboardData);
    if (cleaned == null) return;

    const html = e.clipboardData.getData("text/html");
    const isRich = !!(html && looksLikeRichHtml(html));
    const chunks = splitPasteParagraphs(cleaned);
    const empty = !currentText.trim();

    if (opts?.allowMultiBlock && empty && chunks.length >= 2 && onPasteBlocks) {
      e.preventDefault();
      onPasteBlocks(chunks);
      return;
    }

    if (!isRich) return;

    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const result = insertAtCaret(currentText, start, end, cleaned);
    applyText(result.text, result.selectionStart, result.selectionEnd);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  switch (block.type) {
    case "paragraph":
      return (
        <AutoTextarea
          {...common}
          value={block.data.text}
          placeholder="Type '/' for blocks, or start writing…"
          onChange={(text) => {
            onChange({ ...block.data, text });
            if (text === "/" || (text.startsWith("/") && !text.includes("\n") && text.length < 40)) {
              onSlashQuery(text.slice(1));
            } else {
              onSlashQuery(null);
            }
          }}
          onPaste={(e) => {
            const hasImage = Array.from(e.clipboardData?.items ?? []).some((item) =>
              item.type.startsWith("image/"),
            );
            if (hasImage && onUploadImage && !readOnly) {
              void pasteClipboardImage(e, "paragraph");
              return;
            }
            handleRichTextPaste(
              e,
              block.data.text,
              (text) => {
                onChange({ ...block.data, text });
                onSlashQuery(null);
              },
              { allowMultiBlock: true },
            );
          }}
          className={`${canvasField} font-serif text-[1.125rem] leading-8`}
        />
      );
    case "heading": {
      const size =
        block.data.level === 1
          ? "text-3xl font-bold"
          : block.data.level === 2
            ? "text-2xl font-semibold"
            : block.data.level === 3
              ? "text-xl font-semibold"
              : "text-lg font-medium";
      return (
        <div className="flex items-start gap-2">
          <input
            {...common}
            value={block.data.text}
            placeholder={`Heading ${block.data.level}`}
            onChange={(e) => onChange({ ...block.data, text: e.target.value })}
            onPaste={(e) =>
              handleRichTextPaste(e, block.data.text, (text) =>
                onChange({ ...block.data, text }),
              )
            }
            className={`${canvasField} font-serif ${size}`}
          />
          <select
            disabled={readOnly}
            value={block.data.level}
            onChange={(e) =>
              onChange({ ...block.data, level: Number(e.target.value) as HeadingLevel })
            }
            className="mt-1 h-8 shrink-0 rounded-sm border-0 bg-transparent px-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-accent"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
            <option value={4}>H4</option>
          </select>
        </div>
      );
    }
    case "image":
      return (
        <div className="space-y-2" onPaste={(e) => void pasteClipboardImage(e, "image")}>
          {block.data.url && (
            <img
              src={block.data.url}
              alt={block.data.alt}
              className={`max-h-72 border border-border/50 object-contain ${
                IMAGE_SIZE_PREVIEW[block.data.size ?? "large"]
              } ${
                block.data.align === "left"
                  ? "mr-auto"
                  : block.data.align === "right"
                    ? "ml-auto"
                    : block.data.align === "center"
                      ? "mx-auto"
                      : ""
              }`}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <MediaUrlInput
                readOnly={readOnly}
                url={block.data.url}
                onUrl={(url) => onChange({ ...block.data, url })}
                onUploadImage={onUploadImage}
                placeholder="Image URL or paste image"
              />
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setDamOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Library
              </button>
            )}
          </div>
          <DamAssetPicker
            open={damOpen}
            onClose={() => setDamOpen(false)}
            assetType="image"
            title="Pick image"
            onPick={(asset) => {
              onChange({
                ...block.data,
                url: asset.url,
                alt: asset.alt || block.data.alt,
                caption: asset.caption || block.data.caption,
                credit: asset.credit || block.data.credit,
              });
              setDamOpen(false);
            }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              {...common}
              value={block.data.alt}
              placeholder="Alt text"
              onChange={(e) => onChange({ ...block.data, alt: e.target.value })}
              className={`${canvasField} text-xs`}
            />
            <input
              {...common}
              value={block.data.caption}
              placeholder="Caption"
              onChange={(e) => onChange({ ...block.data, caption: e.target.value })}
              className={`${canvasField} text-xs`}
            />
            <input
              {...common}
              value={block.data.credit}
              placeholder="Credit / source"
              onChange={(e) => onChange({ ...block.data, credit: e.target.value })}
              className={`${canvasField} text-xs`}
            />
            <select
              disabled={readOnly}
              value={block.data.align}
              onChange={(e) =>
                onChange({ ...block.data, align: e.target.value as ImageAlign })
              }
              className="h-8 rounded-sm border-0 bg-transparent px-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <option value="full">Full width</option>
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
            <select
              disabled={readOnly}
              value={block.data.size ?? "large"}
              onChange={(e) =>
                onChange({ ...block.data, size: e.target.value as ImageSize })
              }
              className="h-8 rounded-sm border-0 bg-transparent px-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <option value="small">Size S</option>
              <option value="medium">Size M</option>
              <option value="large">Size L</option>
              <option value="full">Size Full</option>
            </select>
          </div>
        </div>
      );
    case "video":
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              {...common}
              value={block.data.url}
              placeholder="Video URL (YouTube, Vimeo, or direct .mp4)"
              onChange={(e) => onChange({ ...block.data, url: e.target.value })}
              className={`${canvasField} min-w-0 flex-1 text-xs`}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => setDamOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Library
              </button>
            )}
          </div>
          <DamAssetPicker
            open={damOpen}
            onClose={() => setDamOpen(false)}
            assetType="video"
            title="Pick video"
            onPick={(asset) => {
              onChange({ ...block.data, url: asset.url });
              setDamOpen(false);
            }}
          />
          <VideoPreview url={block.data.url} />
          <input
            {...common}
            value={block.data.caption}
            placeholder="Caption (optional)"
            onChange={(e) => onChange({ ...block.data, caption: e.target.value })}
            className={`${canvasField} text-xs`}
          />
        </div>
      );
    case "audio":
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              {...common}
              value={block.data.url}
              placeholder="Audio URL"
              onChange={(e) => onChange({ ...block.data, url: e.target.value })}
              className={`${canvasField} min-w-0 flex-1 text-xs`}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => setDamOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Library
              </button>
            )}
          </div>
          <DamAssetPicker
            open={damOpen}
            onClose={() => setDamOpen(false)}
            assetType="audio"
            title="Pick audio"
            onPick={(asset) => {
              onChange({
                ...block.data,
                url: asset.url,
                title: block.data.title || asset.fileName,
                caption: asset.caption || block.data.caption,
              });
              setDamOpen(false);
            }}
          />
          {block.data.url ? (
            <audio controls src={block.data.url} className="w-full" preload="metadata" />
          ) : null}
          <input
            {...common}
            value={block.data.title}
            placeholder="Title"
            onChange={(e) => onChange({ ...block.data, title: e.target.value })}
            className={`${canvasField} text-xs`}
          />
          <input
            {...common}
            value={block.data.caption}
            placeholder="Caption (optional)"
            onChange={(e) => onChange({ ...block.data, caption: e.target.value })}
            className={`${canvasField} text-xs`}
          />
        </div>
      );
    case "file":
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              {...common}
              value={block.data.url}
              placeholder="File URL"
              onChange={(e) => onChange({ ...block.data, url: e.target.value })}
              className={`${canvasField} min-w-0 flex-1 text-xs`}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => setDamOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Library
              </button>
            )}
          </div>
          <DamAssetPicker
            open={damOpen}
            onClose={() => setDamOpen(false)}
            assetType="document"
            title="Pick file"
            onPick={(asset) => {
              onChange({
                ...block.data,
                url: asset.url,
                title: block.data.title || asset.fileName,
                fileName: asset.fileName,
                fileType: asset.mimeType || block.data.fileType,
              });
              setDamOpen(false);
            }}
          />
          <input
            {...common}
            value={block.data.title}
            placeholder="Title"
            onChange={(e) => onChange({ ...block.data, title: e.target.value })}
            className={`${canvasField} text-xs`}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              {...common}
              value={block.data.fileName}
              placeholder="File name"
              onChange={(e) => onChange({ ...block.data, fileName: e.target.value })}
              className={`${canvasField} text-xs`}
            />
            <input
              {...common}
              value={block.data.fileType}
              placeholder="File type (e.g. application/pdf)"
              onChange={(e) => onChange({ ...block.data, fileType: e.target.value })}
              className={`${canvasField} text-xs`}
            />
          </div>
          {block.data.url ? (
            <a
              href={block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-crimson hover:underline"
            >
              <File className="h-3.5 w-3.5" />
              {block.data.title || block.data.fileName || "Download file"}
            </a>
          ) : null}
        </div>
      );
    case "quote":
      return (
        <div className="space-y-2 border-l-2 border-crimson pl-4">
          <AutoTextarea
            {...common}
            value={block.data.text}
            placeholder="Quote…"
            onChange={(text) => onChange({ ...block.data, text })}
            onPaste={(e) =>
              handleRichTextPaste(e, block.data.text, (text) =>
                onChange({ ...block.data, text }),
              )
            }
            className={`${canvasField} font-serif text-lg italic leading-7`}
          />
          <input
            {...common}
            value={block.data.attribution}
            placeholder="Attribution"
            onChange={(e) => onChange({ ...block.data, attribution: e.target.value })}
            className={`${canvasField} text-xs`}
          />
        </div>
      );
    case "pullquote":
      return (
        <div className="space-y-3 py-4 text-center">
          <AutoTextarea
            {...common}
            value={block.data.text}
            placeholder="Pull quote…"
            onChange={(text) => onChange({ ...block.data, text })}
            onPaste={(e) =>
              handleRichTextPaste(e, block.data.text, (text) =>
                onChange({ ...block.data, text }),
              )
            }
            className={`${canvasField} text-center font-serif text-2xl font-medium italic leading-snug`}
          />
          <input
            {...common}
            value={block.data.attribution}
            placeholder="Attribution"
            onChange={(e) => onChange({ ...block.data, attribution: e.target.value })}
            className={`${canvasField} text-center text-xs`}
          />
        </div>
      );
    case "list": {
      const ListIcon =
        block.data.style === "numbered" ? ListOrdered : block.data.style === "check" ? CheckSquare : List;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <ListIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              disabled={readOnly}
              value={block.data.style}
              onChange={(e) =>
                onChange({ ...block.data, style: e.target.value as ListStyle })
              }
              className="h-7 rounded-sm border-0 bg-transparent text-xs text-muted-foreground hover:bg-accent"
            >
              <option value="bullet">Bulleted</option>
              <option value="numbered">Numbered</option>
              <option value="check">Checklist</option>
            </select>
          </div>
          <ul className="space-y-1">
            {block.data.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                {block.data.style === "check" ? (
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={!!item.checked}
                    onChange={(e) =>
                      onChange({
                        ...block.data,
                        items: block.data.items.map((it, j) =>
                          j === i ? { ...it, checked: e.target.checked } : it,
                        ),
                      })
                    }
                    className="mt-2.5"
                  />
                ) : block.data.style === "numbered" ? (
                  <span className="mt-1.5 w-5 shrink-0 text-right text-sm text-muted-foreground">
                    {i + 1}.
                  </span>
                ) : (
                  <span className="mt-1.5 w-4 shrink-0 text-center text-muted-foreground">•</span>
                )}
                <AutoTextarea
                  {...common}
                  value={item.text}
                  placeholder="List item"
                  onChange={(text) =>
                    onChange({
                      ...block.data,
                      items: block.data.items.map((it, j) => (j === i ? { ...it, text } : it)),
                    })
                  }
                  onKeyDown={(e) => {
                    if (!readOnly && e.key === "Enter" && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
                      if (item.text.trim()) {
                        e.preventDefault();
                        const items = [...block.data.items];
                        items.splice(i + 1, 0, {
                          text: "",
                          ...(block.data.style === "check" ? { checked: false } : {}),
                        });
                        onChange({ ...block.data, items });
                        return;
                      }
                    }
                    if (
                      !readOnly &&
                      e.key === "Backspace" &&
                      !item.text &&
                      (e.currentTarget.selectionStart ?? 0) === 0
                    ) {
                      if (block.data.items.length > 1) {
                        e.preventDefault();
                        onChange({
                          ...block.data,
                          items: block.data.items.filter((_, j) => j !== i),
                        });
                        return;
                      }
                    }
                    onKeyDown(e);
                  }}
                  className={`${canvasField} font-serif text-base leading-7${
                    item.checked ? " text-muted-foreground line-through" : ""
                  }`}
                />
                {!readOnly && (
                  <button
                    type="button"
                    title="Remove item"
                    onClick={() =>
                      onChange({
                        ...block.data,
                        items:
                          block.data.items.length <= 1
                            ? [{ text: "" }]
                            : block.data.items.filter((_, j) => j !== i),
                      })
                    }
                    className="mt-1.5 opacity-0 text-muted-foreground hover:text-crimson group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({ ...block.data, items: [...block.data.items, { text: "" }] })
              }
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add item
            </button>
          )}
        </div>
      );
    }
    case "divider":
      return <hr className="my-4 border-t border-border" />;
    case "embed":
      return (
        <div className="space-y-2">
          <input
            {...common}
            value={block.data.url}
            placeholder="Embed URL (YouTube, Vimeo…)"
            onChange={(e) => onChange({ ...block.data, url: e.target.value })}
            className={`${canvasField} text-xs`}
          />
          {block.data.url &&
            (embedSrc(block.data.url) ? (
              <iframe
                src={embedSrc(block.data.url)!}
                title="Embed preview"
                className="aspect-video w-full border border-border/50"
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
            className={`${canvasField} text-xs`}
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
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="aspect-square w-full border border-border/50 object-cover"
                  />
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
                        images: block.data.images.map((g, j) =>
                          j === i ? { ...g, alt: e.target.value } : g,
                        ),
                      })
                    }
                    className="mt-1 w-full border-0 bg-transparent px-1 py-0.5 text-[11px] outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
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
              </div>
              <button
                type="button"
                onClick={() => setDamOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Library
              </button>
            </div>
          )}
          <DamAssetPicker
            open={damOpen}
            onClose={() => setDamOpen(false)}
            assetType="image"
            title="Add gallery image"
            onPick={(asset) => {
              onChange({
                images: [
                  ...block.data.images,
                  { url: asset.url, alt: asset.alt || "" },
                ],
              });
              setDamOpen(false);
            }}
          />
        </div>
      );
    case "table": {
      const colCount = Math.max(block.data.headers.length, 1);
      const rowCount = Math.max(block.data.rows.length, 1);
      const deleteColumn = (col: number) => {
        if (colCount <= 1) return;
        onChange({
          headers: block.data.headers.filter((_, i) => i !== col),
          rows: block.data.rows.map((row) => row.filter((_, i) => i !== col)),
        });
      };
      const deleteRow = (rowIndex: number) => {
        if (block.data.rows.length <= 1) return;
        onChange({
          ...block.data,
          rows: block.data.rows.filter((_, i) => i !== rowIndex),
        });
      };
      const mergeLastTwoColumns = () => {
        if (colCount < 2) return;
        const a = colCount - 2;
        const b = colCount - 1;
        const left = (block.data.headers[a] ?? "").trim();
        const right = (block.data.headers[b] ?? "").trim();
        const mergedHeader = [left, right].filter(Boolean).join(" / ") || `Column ${a + 1}`;
        onChange({
          headers: [...block.data.headers.slice(0, a), mergedHeader, ...block.data.headers.slice(b + 1)],
          rows: block.data.rows.map((row) => [
            ...row.slice(0, a),
            `${row[a] ?? ""} ${row[b] ?? ""}`.trim(),
            ...row.slice(b + 1),
          ]),
        });
      };
      return (
        <div className="space-y-2 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                {block.data.headers.map((header, col) => (
                  <th key={col} className="border border-border/60 bg-muted/30 p-1 align-top">
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
                      className={`${canvasField} px-2 py-1 text-xs font-semibold`}
                    />
                    {!readOnly && colCount > 1 && (
                      <button
                        type="button"
                        title="Delete column"
                        onClick={() => deleteColumn(col)}
                        className="mx-auto mt-0.5 flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-crimson"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </th>
                ))}
                {!readOnly && block.data.rows.length > 1 ? <th className="w-8" /> : null}
              </tr>
            </thead>
            <tbody>
              {block.data.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: colCount }, (_, col) => (
                    <td key={col} className="border border-border/60 p-1">
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
                        className={`${canvasField} px-2 py-1 text-xs`}
                      />
                    </td>
                  ))}
                  {!readOnly && block.data.rows.length > 1 && (
                    <td className="border-0 p-1 align-middle">
                      <button
                        type="button"
                        title="Delete row"
                        onClick={() => deleteRow(rowIndex)}
                        className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-crimson"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-sm px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
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
                className="rounded-sm px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() =>
                  onChange({
                    headers: [...block.data.headers, `Column ${colCount + 1}`],
                    rows: block.data.rows.map((row) => [...row, ""]),
                  })
                }
              >
                Add column
              </button>
              <button
                type="button"
                disabled={rowCount <= 1}
                className="rounded-sm px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                onClick={() =>
                  onChange({
                    ...block.data,
                    rows: block.data.rows.slice(0, -1),
                  })
                }
              >
                Delete last row
              </button>
              <button
                type="button"
                disabled={colCount <= 1}
                className="rounded-sm px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                onClick={() => deleteColumn(colCount - 1)}
              >
                Delete last column
              </button>
              <button
                type="button"
                disabled={colCount < 2}
                className="rounded-sm px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                onClick={mergeLastTwoColumns}
              >
                Merge last two columns
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
            className="h-7 rounded-sm border-0 bg-transparent px-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-accent"
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
            className={`${canvasField} font-mono text-xs leading-5`}
          />
        </div>
      );
    case "html":
      return (
        <textarea
          {...common}
          value={block.data.code}
          placeholder="<!-- Custom HTML -->"
          rows={8}
          onChange={(e) => onChange({ ...block.data, code: e.target.value })}
          className={`${canvasField} font-mono text-xs leading-5 text-muted-foreground`}
        />
      );
    case "live":
      return (
        <div className="space-y-2 border-l-2 border-cat-blue pl-4">
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
                  time: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : new Date().toISOString(),
                })
              }
              className="h-7 border-0 bg-transparent px-1 text-xs text-muted-foreground"
            />
          </div>
          <input
            {...common}
            value={block.data.title}
            placeholder="Update headline"
            onChange={(e) => onChange({ ...block.data, title: e.target.value })}
            className={`${canvasField} font-semibold`}
          />
          <AutoTextarea
            {...common}
            value={block.data.text}
            placeholder="What just happened…"
            onChange={(text) => onChange({ ...block.data, text })}
            className={`${canvasField} text-sm leading-6`}
          />
        </div>
      );
    case "newsletter":
      return (
        <div className="space-y-2 rounded-sm border border-border bg-muted/20 p-4">
          <input
            {...common}
            value={block.data.heading}
            placeholder="Heading"
            onChange={(e) => onChange({ ...block.data, heading: e.target.value })}
            className={`${canvasField} font-serif text-lg font-semibold`}
          />
          <AutoTextarea
            {...common}
            value={block.data.body}
            placeholder="Supporting text"
            onChange={(text) => onChange({ ...block.data, body: text })}
            className={`${canvasField} text-sm leading-6`}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              {...common}
              value={block.data.buttonLabel}
              placeholder="Button label"
              onChange={(e) => onChange({ ...block.data, buttonLabel: e.target.value })}
              className={`${canvasField} text-xs`}
            />
            <input
              {...common}
              value={block.data.buttonUrl}
              placeholder="Button URL"
              onChange={(e) => onChange({ ...block.data, buttonUrl: e.target.value })}
              className={`${canvasField} text-xs`}
            />
          </div>
          {block.data.buttonLabel ? (
            <span className="inline-flex items-center rounded-sm bg-crimson px-3 py-1.5 text-xs font-semibold text-white">
              {block.data.buttonLabel}
            </span>
          ) : null}
        </div>
      );
    case "ad":
      return (
        <div className="space-y-2">
          <input
            {...common}
            value={block.data.label}
            placeholder="Label (e.g. Advertisement)"
            onChange={(e) => onChange({ ...block.data, label: e.target.value })}
            className={`${canvasField} text-xs`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              {...common}
              value={block.data.imageUrl}
              placeholder="Image URL"
              onChange={(e) => onChange({ ...block.data, imageUrl: e.target.value })}
              className={`${canvasField} min-w-0 flex-1 text-xs`}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => setDamOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Library
              </button>
            )}
          </div>
          <DamAssetPicker
            open={damOpen}
            onClose={() => setDamOpen(false)}
            assetType="image"
            title="Pick ad image"
            onPick={(asset) => {
              onChange({ ...block.data, imageUrl: asset.url });
              setDamOpen(false);
            }}
          />
          {block.data.imageUrl ? (
            <img
              src={block.data.imageUrl}
              alt={block.data.label || "Advertisement"}
              className="max-h-40 border border-border/50 object-contain"
            />
          ) : null}
          <input
            {...common}
            value={block.data.linkUrl}
            placeholder="Link URL"
            onChange={(e) => onChange({ ...block.data, linkUrl: e.target.value })}
            className={`${canvasField} text-xs`}
          />
          <textarea
            {...common}
            value={block.data.html}
            placeholder="Custom ad HTML (optional — overrides image)"
            rows={4}
            onChange={(e) => onChange({ ...block.data, html: e.target.value })}
            className={`${canvasField} font-mono text-xs leading-5 text-muted-foreground`}
          />
        </div>
      );
  }
}

function VideoPreview({ url }: { url: string }) {
  if (!url) return null;
  const src = embedSrc(url);
  if (src) {
    return (
      <iframe
        src={src}
        title="Video preview"
        className="aspect-video w-full border border-border/50"
        allowFullScreen
      />
    );
  }
  if (isDirectVideoFile(url)) {
    return (
      <video src={url} controls className="aspect-video w-full border border-border/50 bg-black" />
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      Unrecognized video URL — it will render as an external link.
    </p>
  );
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
          className={`${canvasField} text-xs`}
        />
        {onUploadImage && !readOnly && (
          <label className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-sm px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
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
  onFocus,
  onBlur,
  onPaste,
  onSelect,
  onMouseUp,
  onKeyUp,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSelect?: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  style?: React.CSSProperties;
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
      style={style}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPaste={onPaste}
      onSelect={onSelect}
      onMouseUp={onMouseUp}
      onKeyUp={onKeyUp}
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

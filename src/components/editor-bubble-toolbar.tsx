import { useState } from "react";
import {
  Bold,
  Highlighter,
  Italic,
  Link2,
  Palette,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BubblePos = { top: number; left: number };

export const EDITOR_TEXT_COLORS = [
  { label: "Ink", hex: "0f172a" },
  { label: "Slate", hex: "475569" },
  { label: "Crimson", hex: "b91c1c" },
  { label: "Indigo", hex: "4338ca" },
  { label: "Emerald", hex: "047857" },
  { label: "Amber", hex: "b45309" },
] as const;

export function EditorBubbleToolbar({
  pos,
  disabled,
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onHighlight,
  onColor,
  onLink,
}: {
  pos: BubblePos;
  disabled?: boolean;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onHighlight: () => void;
  onColor: (hex: string) => void;
  onLink: () => void;
}) {
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="pointer-events-auto fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border border-border/80 bg-card/95 px-1.5 py-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/90"
      style={{ top: pos.top - 8, left: pos.left }}
      onMouseDown={(event) => {
        // Keep textarea selection when clicking toolbar buttons.
        event.preventDefault();
      }}
    >
      <BubbleBtn title="Bold" disabled={disabled} onClick={onBold}>
        <Bold className="h-3.5 w-3.5" />
      </BubbleBtn>
      <BubbleBtn title="Italic" disabled={disabled} onClick={onItalic}>
        <Italic className="h-3.5 w-3.5" />
      </BubbleBtn>
      <BubbleBtn title="Underline" disabled={disabled} onClick={onUnderline}>
        <Underline className="h-3.5 w-3.5" />
      </BubbleBtn>
      <BubbleBtn title="Strikethrough" disabled={disabled} onClick={onStrike}>
        <Strikethrough className="h-3.5 w-3.5" />
      </BubbleBtn>
      <BubbleBtn title="Highlight" disabled={disabled} onClick={onHighlight}>
        <Highlighter className="h-3.5 w-3.5" />
      </BubbleBtn>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <div className="relative">
        <BubbleBtn
          title="Text color"
          disabled={disabled}
          onClick={() => setColorOpen((open) => !open)}
        >
          <Palette className="h-3.5 w-3.5" />
        </BubbleBtn>
        {colorOpen ? (
          <div className="absolute left-1/2 top-full z-10 mt-1 flex -translate-x-1/2 gap-1 rounded-lg border border-border bg-card p-1.5 shadow-md">
            {EDITOR_TEXT_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                title={color.label}
                disabled={disabled}
                onClick={() => {
                  onColor(color.hex);
                  setColorOpen(false);
                }}
                className="h-5 w-5 rounded-full border border-border/60 shadow-sm transition hover:scale-110 disabled:opacity-40"
                style={{ backgroundColor: `#${color.hex}` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <BubbleBtn title="Link" disabled={disabled} onClick={onLink}>
        <Link2 className="h-3.5 w-3.5" />
      </BubbleBtn>
    </div>
  );
}

function BubbleBtn({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-accent disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/** Approximate caret/selection midpoint for a focused text control. */
export function selectionBubblePos(
  el: HTMLTextAreaElement | HTMLInputElement,
): BubblePos | null {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (start === end) return null;

  const rect = el.getBoundingClientRect();
  // Prefer a mid-point along the control; good enough without a mirror div.
  const ratio =
    el.value.length > 0 ? (start + end) / 2 / Math.max(el.value.length, 1) : 0.5;
  const left = rect.left + Math.min(rect.width * 0.85, Math.max(24, rect.width * ratio));
  const top = rect.top + (el.tagName === "TEXTAREA" ? 28 : rect.height / 2);
  return { top, left };
}

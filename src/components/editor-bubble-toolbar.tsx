import { Bold, Italic, Link2, Strikethrough, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

export type BubblePos = { top: number; left: number };

export function EditorBubbleToolbar({
  pos,
  disabled,
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onLink,
}: {
  pos: BubblePos;
  disabled?: boolean;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onLink: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="pointer-events-auto fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 border border-border bg-card px-1 py-1 shadow-lg"
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
      <span className="mx-0.5 h-4 w-px bg-border" />
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
        "inline-flex h-7 w-7 items-center justify-center text-foreground hover:bg-accent disabled:opacity-40",
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

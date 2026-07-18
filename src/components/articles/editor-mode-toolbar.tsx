import {
  Eye,
  Focus,
  Maximize2,
  Minimize2,
  BookOpen,
  Copy,
  Archive,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { WritingStats } from "@/lib/writing-stats";
import { cmsSecondaryButton, cmsGhostButton } from "@/components/cms";
import { cn } from "@/lib/utils";

export type EditorViewMode = "edit" | "focus" | "fullscreen" | "reading";

export function EditorModeToolbar({
  mode,
  onModeChange,
  stats,
  articleId,
  isNew,
  publicSlug,
  canDuplicate,
  canArchive,
  onDuplicate,
  onArchive,
  onSave,
  saveLabel,
  canSave,
  saving,
}: {
  mode: EditorViewMode;
  onModeChange: (mode: EditorViewMode) => void;
  stats: WritingStats;
  articleId: string;
  isNew: boolean;
  publicSlug?: string;
  canDuplicate?: boolean;
  canArchive?: boolean;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onSave: () => void;
  saveLabel: string;
  canSave: boolean;
  saving: boolean;
}) {
  return (
    <div className="sticky top-0 z-30 mb-4 border border-border bg-card/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <ModeButton
            active={mode === "edit"}
            onClick={() => onModeChange("edit")}
            title="Standard editor"
          >
            Edit
          </ModeButton>
          <ModeButton
            active={mode === "focus"}
            onClick={() => onModeChange("focus")}
            title="Focus mode — hide sidebar (Esc to exit)"
          >
            <Focus className="h-3.5 w-3.5" /> Focus
          </ModeButton>
          <ModeButton
            active={mode === "fullscreen"}
            onClick={() => onModeChange(mode === "fullscreen" ? "edit" : "fullscreen")}
            title="Fullscreen writing"
          >
            {mode === "fullscreen" ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}{" "}
            Full screen
          </ModeButton>
          <ModeButton
            active={mode === "reading"}
            onClick={() => onModeChange(mode === "reading" ? "edit" : "reading")}
            title="Reading preview"
          >
            <BookOpen className="h-3.5 w-3.5" /> Reading
          </ModeButton>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            <strong className="text-foreground">{stats.words}</strong> words
          </span>
          <span>
            <strong className="text-foreground">{stats.characters}</strong> chars
          </span>
          <span>
            <strong className="text-foreground">{stats.readingMinutes || "—"}</strong> min read
          </span>
          <span title="Flesch reading ease (approximate)">
            Readability{" "}
            <strong className="text-foreground">{stats.readabilityLabel}</strong>
            {stats.readability != null ? ` (${stats.readability})` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNew ? (
            <Link
              to="/admin/articles/preview/$articleId"
              params={{ articleId }}
              className={cmsGhostButton}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </Link>
          ) : null}
          {publicSlug ? (
            <a
              href={`/article/${publicSlug}`}
              target="_blank"
              rel="noreferrer"
              className={cmsGhostButton}
            >
              Live
            </a>
          ) : null}
          {canDuplicate && onDuplicate ? (
            <button type="button" className={cmsGhostButton} onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          ) : null}
          {canArchive && onArchive ? (
            <button type="button" className={cmsGhostButton} onClick={onArchive}>
              <Archive className="h-3.5 w-3.5" /> Trash
            </button>
          ) : null}
          <button
            type="button"
            className={cmsSecondaryButton}
            disabled={!canSave || saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 px-2.5 text-xs font-semibold",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

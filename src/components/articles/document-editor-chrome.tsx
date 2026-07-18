import { Link } from "@tanstack/react-router";
import {
  Archive,
  BookOpen,
  Check,
  ChevronLeft,
  Copy,
  Eye,
  Focus,
  Loader2,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Share2,
} from "lucide-react";
import type { WritingStats } from "@/lib/writing-stats";
import { cmsButton, cmsGhostButton, cmsSecondaryButton } from "@/components/cms";
import { cn } from "@/lib/utils";

export type DocumentViewMode = "edit" | "focus" | "fullscreen" | "reading";

export function DocumentEditorBar({
  title,
  statusLabel,
  saving,
  dirty,
  lastSavedAt,
  stats,
  seoScore,
  sidebarOpen,
  onToggleSidebar,
  mode,
  onModeChange,
  onSave,
  saveLabel,
  canSave,
  articleId,
  isNew,
  publicSlug,
  canDuplicate,
  canArchive,
  onDuplicate,
  onArchive,
  onShare,
}: {
  title: string;
  statusLabel: string;
  saving: boolean;
  dirty: boolean;
  lastSavedAt: Date | null;
  stats: WritingStats;
  seoScore: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  mode: DocumentViewMode;
  onModeChange: (mode: DocumentViewMode) => void;
  onSave: () => void;
  saveLabel: string;
  canSave: boolean;
  articleId: string;
  isNew: boolean;
  publicSlug?: string;
  canDuplicate?: boolean;
  canArchive?: boolean;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onShare?: () => void;
}) {
  const savedLabel = saving
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : lastSavedAt
        ? `Saved ${formatRelative(lastSavedAt)}`
        : "All changes saved";

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
        <Link
          to="/admin/articles/all"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Articles</span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight text-foreground">
            {title.trim() || (isNew ? "Untitled article" : "Edit article")}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : dirty ? (
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              ) : (
                <Check className="h-3 w-3 text-cat-green" />
              )}
              {savedLabel}
            </span>
            <span className="capitalize">{statusLabel}</span>
            <span>
              <strong className="font-semibold text-foreground">{stats.words}</strong> words
            </span>
            <span>
              <strong className="font-semibold text-foreground">
                {stats.readingMinutes || "—"}
              </strong>{" "}
              min
            </span>
            <span>
              SEO{" "}
              <strong className="font-semibold text-foreground">{seoScore}</strong>
            </span>
            <span className="hidden md:inline">{stats.readabilityLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <IconToggle
            active={mode === "focus"}
            title="Focus mode"
            onClick={() => onModeChange(mode === "focus" ? "edit" : "focus")}
          >
            <Focus className="h-3.5 w-3.5" />
          </IconToggle>
          <IconToggle
            active={mode === "fullscreen"}
            title="Full screen"
            onClick={() => onModeChange(mode === "fullscreen" ? "edit" : "fullscreen")}
          >
            {mode === "fullscreen" ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </IconToggle>
          <IconToggle
            active={mode === "reading"}
            title="Reading mode"
            onClick={() => onModeChange(mode === "reading" ? "edit" : "reading")}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </IconToggle>
          <IconToggle
            active={sidebarOpen && mode === "edit"}
            title={sidebarOpen ? "Hide panel" : "Show panel"}
            onClick={onToggleSidebar}
            disabled={mode === "focus" || mode === "fullscreen"}
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-3.5 w-3.5" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5" />
            )}
          </IconToggle>

          {!isNew ? (
            <Link
              to="/admin/articles/preview/$articleId"
              params={{ articleId }}
              className={cmsGhostButton}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Preview</span>
            </Link>
          ) : null}
          {publicSlug || onShare ? (
            <button
              type="button"
              className={cmsGhostButton}
              onClick={onShare}
              title="Copy public link"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {canDuplicate && onDuplicate ? (
            <button type="button" className={cmsGhostButton} onClick={onDuplicate} title="Duplicate">
              <Copy className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {canArchive && onArchive ? (
            <button type="button" className={cmsGhostButton} onClick={onArchive} title="Archive">
              <Archive className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            className={cn(cmsSecondaryButton, "hidden sm:inline-flex")}
            disabled={!canSave || saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className={cmsButton}
            disabled={!canSave || saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </div>
    </header>
  );
}

function IconToggle({
  active,
  title,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
        active && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function formatRelative(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return date.toLocaleString();
}

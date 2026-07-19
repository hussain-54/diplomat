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
  MoreHorizontal,
  Settings2,
  Share2,
  Sparkles,
} from "lucide-react";
import type { WritingStats } from "@/lib/writing-stats";
import { cmsButton, cmsGhostButton } from "@/components/cms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  mode,
  onModeChange,
  onSave,
  saveLabel,
  canSave,
  saveError,
  saveBlockedHint,
  onPublish,
  canPublish,
  articleId,
  isNew,
  publicSlug,
  canDuplicate,
  canArchive,
  onDuplicate,
  onArchive,
  onShare,
  onOpenSettings,
  onOpenSeo,
  onOpenAi,
}: {
  title: string;
  statusLabel: string;
  saving: boolean;
  dirty: boolean;
  lastSavedAt: Date | null;
  stats: WritingStats;
  seoScore: number;
  mode: DocumentViewMode;
  onModeChange: (mode: DocumentViewMode) => void;
  onSave: () => void;
  saveLabel: string;
  canSave: boolean;
  saveError?: string | null;
  saveBlockedHint?: string | null;
  onPublish?: () => void;
  canPublish?: boolean;
  articleId: string;
  isNew: boolean;
  publicSlug?: string;
  canDuplicate?: boolean;
  canArchive?: boolean;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onShare?: () => void;
  onOpenSettings: () => void;
  onOpenSeo: () => void;
  onOpenAi?: () => void;
}) {
  const savedLabel = saving
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : lastSavedAt
        ? `Saved ${formatRelative(lastSavedAt)}`
        : "All changes saved";

  const seoTone =
    seoScore >= 75 ? "text-cat-green" : seoScore >= 50 ? "text-cat-amber" : "text-cat-rose";

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
      <div className="flex h-12 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link
          to="/admin/articles/all"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Articles</span>
        </Link>

        <div className="h-4 w-px shrink-0 bg-border/80" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : dirty ? (
                <span className="h-1.5 w-1.5 rounded-full bg-cat-amber" />
              ) : (
                <Check className="h-3 w-3 text-cat-green" />
              )}
              <span className="hidden xs:inline sm:inline">{savedLabel}</span>
            </span>
            <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-foreground">
              {statusLabel}
            </span>
            <span className="hidden md:inline">
              <strong className="font-semibold text-foreground">{stats.words}</strong> words
            </span>
            <span className="hidden md:inline">
              <strong className="font-semibold text-foreground">
                {stats.readingMinutes || "—"}
              </strong>{" "}
              min
            </span>
            <button
              type="button"
              onClick={onOpenSeo}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-bold cms-transition hover:bg-accent",
                seoTone,
              )}
              title="Open SEO settings"
            >
              SEO {seoScore}/100
            </button>
            <span className="hidden truncate font-medium text-foreground lg:inline">
              {title.trim() || (isNew ? "Untitled article" : "Edit article")}
            </span>
          </div>
          {saveError || saveBlockedHint ? (
            <p
              className={cn(
                "truncate text-[10px]",
                saveError ? "text-cat-rose" : "text-cat-amber",
              )}
            >
              {saveError || saveBlockedHint}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
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
            className="hidden sm:inline-flex"
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
            className="hidden sm:inline-flex"
            onClick={() => onModeChange(mode === "reading" ? "edit" : "reading")}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </IconToggle>

          {onOpenAi ? (
            <button
              type="button"
              className={cmsGhostButton}
              onClick={onOpenAi}
              title="AI assistant"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">AI</span>
            </button>
          ) : null}

          <button
            type="button"
            className={cn(cmsGhostButton, "xl:hidden")}
            onClick={onOpenSettings}
            title="Article settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Settings</span>
          </button>

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={cmsGhostButton} aria-label="More actions">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {publicSlug || onShare ? (
                <DropdownMenuItem onSelect={() => onShare?.()}>
                  <Share2 className="h-3.5 w-3.5" /> Copy link
                </DropdownMenuItem>
              ) : null}
              {canDuplicate && onDuplicate ? (
                <DropdownMenuItem onSelect={() => onDuplicate()}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </DropdownMenuItem>
              ) : null}
              {canArchive && onArchive ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onArchive()}>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {canPublish && onPublish ? (
            <button
              type="button"
              className={cn(cmsButton, "h-8 px-3")}
              disabled={!canSave || saving}
              onClick={onPublish}
              title="Save and publish this article"
            >
              {saving ? "Publishing…" : "Publish"}
            </button>
          ) : null}

          <button
            type="button"
            className={cn(
              canPublish && onPublish ? cmsGhostButton : cmsButton,
              "h-8 px-3",
            )}
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
  className,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground cms-transition hover:bg-accent hover:text-foreground disabled:opacity-40",
        active && "bg-accent text-foreground",
        className,
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

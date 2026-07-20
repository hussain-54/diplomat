import { Link } from "@tanstack/react-router";
import {
  Archive,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Eye,
  Focus,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Send,
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

export type EditorWorkflowStatus =
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

const STATUS_META: Record<
  EditorWorkflowStatus,
  { label: string; hint: string; className: string; dot: string }
> = {
  draft: {
    label: "Draft",
    hint: "Private — not on the public site",
    className: "bg-slate-100 text-slate-700 ring-slate-200/80",
    dot: "bg-slate-400",
  },
  review: {
    label: "In review",
    hint: "Waiting on editorial review",
    className: "bg-amber-50 text-amber-800 ring-amber-200/80",
    dot: "bg-amber-500",
  },
  scheduled: {
    label: "Scheduled",
    hint: "Will go live at the set time",
    className: "bg-sky-50 text-sky-800 ring-sky-200/80",
    dot: "bg-sky-500",
  },
  published: {
    label: "Published",
    hint: "Live on the public site",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
    dot: "bg-emerald-500",
  },
  archived: {
    label: "Archived",
    hint: "Removed from active publishing",
    className: "bg-rose-50 text-rose-800 ring-rose-200/80",
    dot: "bg-rose-500",
  },
};

export function DocumentEditorBar({
  title,
  status,
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
  onStatusChange,
  canChangeStatus,
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
  status: EditorWorkflowStatus;
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
  onStatusChange?: (status: EditorWorkflowStatus) => void;
  canChangeStatus?: boolean;
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

  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const isLive = status === "published";
  const showPublishNow = Boolean(canPublish && onPublish && !isLive && status !== "archived");

  const statusOptions: EditorWorkflowStatus[] = canPublish
    ? ["draft", "review", "scheduled", "published", "archived"]
    : ["draft", "review"];

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link
          to="/admin/articles/all"
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Articles</span>
        </Link>

        <div className="h-5 w-px shrink-0 bg-border/80" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {canChangeStatus && onStatusChange ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset cms-transition hover:brightness-[0.98]",
                      meta.className,
                    )}
                    title={meta.hint}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                    {status === "draft" ? (
                      <span className="hidden font-medium opacity-70 sm:inline">· Private</span>
                    ) : null}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {statusOptions.map((key) => {
                    const option = STATUS_META[key];
                    return (
                      <DropdownMenuItem
                        key={key}
                        onSelect={() => onStatusChange(key)}
                        className="flex flex-col items-start gap-0.5 py-2"
                      >
                        <span className="inline-flex items-center gap-2 text-xs font-semibold">
                          <span className={cn("h-1.5 w-1.5 rounded-full", option.dot)} />
                          {option.label}
                          {key === "draft" ? (
                            <span className="font-normal text-muted-foreground">Private</span>
                          ) : null}
                          {key === status ? (
                            <Check className="ml-auto h-3.5 w-3.5 text-cat-green" />
                          ) : null}
                        </span>
                        <span className="pl-3.5 text-[10px] text-muted-foreground">
                          {option.hint}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset",
                  meta.className,
                )}
                title={meta.hint}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                {meta.label}
                {status === "draft" ? (
                  <span className="hidden font-medium opacity-70 sm:inline">· Private</span>
                ) : null}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : dirty ? (
                <span className="h-1.5 w-1.5 rounded-full bg-cat-amber" />
              ) : (
                <Check className="h-3 w-3 text-cat-green" />
              )}
              <span className="hidden sm:inline">{savedLabel}</span>
            </span>

            <span className="hidden text-[11px] text-muted-foreground md:inline">
              <strong className="font-semibold text-foreground">{stats.words}</strong> words
            </span>
            <span className="hidden text-[11px] text-muted-foreground md:inline">
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
            <span className="hidden truncate text-[11px] font-medium text-foreground xl:inline">
              {title.trim() || (isNew ? "Untitled article" : "Edit article")}
            </span>
          </div>
          {saveError || saveBlockedHint ? (
            <p
              className={cn(
                "mt-0.5 truncate text-[10px]",
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
            className={cn(cmsGhostButton, "lg:hidden")}
            onClick={onOpenSettings}
            title="Article settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
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

          <div className="ml-1 flex items-center gap-1.5 border-l border-border/70 pl-2">
            <button
              type="button"
              className={cn(cmsGhostButton, "h-8 rounded-lg px-3 text-xs font-semibold")}
              disabled={!canSave || saving}
              onClick={onSave}
              title={saveBlockedHint || saveLabel}
            >
              {saving && !showPublishNow ? "Saving…" : saveLabel}
            </button>

            {showPublishNow ? (
              <button
                type="button"
                className={cn(
                  cmsButton,
                  "h-8 gap-1.5 rounded-lg px-3.5 text-xs font-semibold shadow-sm",
                )}
                disabled={!canSave || saving}
                onClick={onPublish}
                title={
                  saveBlockedHint
                    ? saveBlockedHint
                    : "Save and publish this article live now"
                }
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Publish now
                  </>
                )}
              </button>
            ) : isLive && canPublish ? (
              <button
                type="button"
                className={cn(cmsButton, "h-8 rounded-lg px-3.5 text-xs font-semibold")}
                disabled={!canSave || saving}
                onClick={onSave}
              >
                {saving ? "Updating…" : "Update live"}
              </button>
            ) : null}
          </div>
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

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Focus,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Save,
  Send,
  Settings2,
  Share2,
  X,
} from "lucide-react";
import type { WritingStats } from "@/lib/writing-stats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  | "approved"
  | "scheduled"
  | "published"
  | "archived";

export function DocumentEditorBar({
  title,
  status,
  saving,
  publishing,
  dirty,
  lastSavedAt,
  stats: _stats,
  seoScore: _seoScore,
  mode,
  onModeChange,
  onSave,
  saveLabel: _saveLabel,
  canSave,
  saveError,
  saveBlockedHint,
  onPublish,
  canPublish,
  onStatusChange,
  canChangeStatus: _canChangeStatus,
  publishNotice,
  onDismissPublishNotice,
  liveUrl,
  publishIntentKey,
  articleId,
  isNew,
  publicSlug,
  canDuplicate,
  canArchive,
  onDuplicate,
  onArchive,
  onShare,
  onOpenSettings,
  onOpenSeo: _onOpenSeo,
  onOpenAi: _onOpenAi,
  onSubmitReview,
  canSubmitReview,
  pageTitle,
  pageDescription,
}: {
  title: string;
  status: EditorWorkflowStatus;
  saving: boolean;
  publishing?: boolean;
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
  publishNotice?: { title: string; slug?: string } | null;
  onDismissPublishNotice?: () => void;
  liveUrl?: string | null;
  /** Increment to open the confirm-publish dialog from outside (e.g. Story settings). */
  publishIntentKey?: number;
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
  onSubmitReview?: () => void;
  canSubmitReview?: boolean;
  pageTitle?: string;
  pageDescription?: string;
}) {
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const savedLabel =
    saving || publishing
      ? publishing
        ? "Publishing…"
        : "Saving…"
      : dirty
        ? "Unsaved changes"
        : lastSavedAt
          ? `Saved ${formatRelative(lastSavedAt)}`
          : "All changes saved";

  const isLive = status === "published";
  const showPublishNow = Boolean(canPublish && onPublish && !isLive && status !== "archived");
  const busy = saving || Boolean(publishing);

  useEffect(() => {
    if (publishIntentKey && publishIntentKey > 0 && canSave && !busy && onPublish) {
      setPublishDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishIntentKey]);

  const requestPublish = () => {
    if (!canSave || busy || !onPublish) return;
    setPublishDialogOpen(true);
  };

  const confirmPublish = () => {
    setPublishDialogOpen(false);
    onPublish?.();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white">
      <div className="space-y-4 px-5 py-4 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
          <Link to="/admin" className="hover:text-slate-800">
            Content
          </Link>
          <span className="text-slate-300">›</span>
          <Link to="/admin/articles" className="hover:text-slate-800">
            Articles
          </Link>
          <span className="text-slate-300">›</span>
          <span className="font-medium text-slate-700">
            {isNew ? "Create Article" : "Edit Article"}
          </span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {pageTitle ?? (isNew ? "Create New Article" : title.trim() || "Edit Article")}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {pageDescription ??
                    "Create SEO optimized, engaging and newsworthy content."}
                </p>
              </div>
            </div>
            {(saveError || saveBlockedHint || busy || dirty || lastSavedAt) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[3.25rem] text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : dirty ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ) : (
                    <Check className="h-3 w-3 text-emerald-500" />
                  )}
                  {savedLabel}
                </span>
                {saveError || saveBlockedHint ? (
                  <span className={saveError ? "text-rose-600" : "text-amber-600"}>
                    {saveError || saveBlockedHint}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => onModeChange(mode === "focus" ? "edit" : "focus")}>
                  <Focus className="h-3.5 w-3.5" /> Focus mode
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onModeChange(mode === "fullscreen" ? "edit" : "fullscreen")}
                >
                  {mode === "fullscreen" ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                  Full screen
                </DropdownMenuItem>
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
                <DropdownMenuItem onSelect={() => onOpenSettings()}>
                  <Settings2 className="h-3.5 w-3.5" /> Publishing options
                </DropdownMenuItem>
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

            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              disabled={!canSave || busy}
              onClick={onSave}
              title={saveBlockedHint || "Save without publishing"}
            >
              {saving && !publishing ? (
                "Saving…"
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Draft
                </>
              )}
            </button>

            {!isNew ? (
              <Link
                to="/admin/articles/preview/$articleId"
                params={{ articleId }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </Link>
            ) : (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm opacity-60"
                disabled
                title="Save the article first to preview"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
            )}

            {canSubmitReview && onSubmitReview ? (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-50"
                disabled={!canSave || busy || status === "review"}
                onClick={onSubmitReview}
              >
                Submit for Review
              </button>
            ) : null}

            {showPublishNow ? (
              <div className="flex">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-l-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={!canSave || busy}
                  onClick={requestPublish}
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    "Publish"
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-r-lg border-l border-blue-500 bg-blue-600 px-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      disabled={!canSave || busy}
                      aria-label="Publish options"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => requestPublish()}>
                      Publish now
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        onStatusChange?.("scheduled");
                        onOpenSettings();
                      }}
                    >
                      Schedule…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : isLive && canPublish ? (
              <>
                {liveUrl ? (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View live
                  </a>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={!canSave || busy}
                  onClick={onSave}
                >
                  {saving ? "Updating…" : "Update live"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {publishNotice ? (
        <div className="flex flex-col gap-2 border-b border-emerald-200/80 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-50">
          <div className="flex min-w-0 items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <div className="font-semibold">Article published</div>
              <div className="truncate text-xs text-emerald-800/80 dark:text-emerald-100/80">
                {publishNotice.title || "Untitled"} is live
                {publishNotice.slug ? ` · /article/${publishNotice.slug}` : ""}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {liveUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-700 px-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <ExternalLink className="h-3 w-3" /> View live
              </a>
            ) : null}
            {onShare ? (
              <button
                type="button"
                onClick={onShare}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300/80 bg-white/70 px-2.5 text-xs font-semibold text-emerald-900 hover:bg-white dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50"
              >
                <Share2 className="h-3 w-3" /> Copy link
              </button>
            ) : null}
            {onDismissPublishNotice ? (
              <button
                type="button"
                onClick={onDismissPublishNotice}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-800/70 hover:bg-emerald-100 hover:text-emerald-950 dark:hover:bg-emerald-900"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this article now?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Publishing only happens when you confirm. Autosave never publishes — drafts stay
                  private until you choose to go live.
                </p>
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-left text-xs text-foreground">
                  <div className="font-semibold">{title.trim() || "Untitled article"}</div>
                  <div className="mt-1 text-muted-foreground">
                    Status will change to <strong>Published</strong> and the story will appear on
                    the public site.
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSave || busy}
              onClick={(event) => {
                event.preventDefault();
                confirmPublish();
              }}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Confirm publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

function formatRelative(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return date.toLocaleString();
}

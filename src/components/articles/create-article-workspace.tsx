import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Code2,
  Eye,
  FileText,
  Globe2,
  History,
  Image as ImageIcon,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MapPin,
  Newspaper,
  Quote,
  Rocket,
  Save,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Wand2,
} from "lucide-react";
import { RichEditor } from "@/components/cms";
import type { ArticleEditorTabId } from "@/components/articles/article-editor-tabs";
import { ARTICLE_TYPE_OPTIONS } from "@/lib/article-cms-extras";
import type { Block } from "@/lib/blocks";
import { cn } from "@/lib/utils";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TABS: Array<{
  key: ArticleEditorTabId;
  label: string;
  icon: typeof FileText;
}> = [
  { key: "content", label: "Content", icon: FileText },
  { key: "media", label: "Media", icon: ImageIcon },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "publishing", label: "Publishing", icon: Globe2 },
  { key: "seo", label: "SEO", icon: Search },
  { key: "local-seo", label: "Local SEO", icon: MapPin },
  { key: "google-news", label: "Google News", icon: Newspaper },
  { key: "eeat", label: "EEAT", icon: ShieldCheck },
  { key: "schema", label: "Schema", icon: Code2 },
  { key: "social", label: "Social", icon: Share2 },
  { key: "ai", label: "AI Assistant", icon: Sparkles },
];

const SEO_CHECKLIST_LABELS = [
  "SEO Title",
  "Meta Description",
  "Focus Keyword",
  "Image Alt Text",
  "Internal Links",
  "External Links",
  "Schema Markup",
  "Open Graph",
];

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-blue-600" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SeoScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <svg width={100} height={100} viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5F7EC" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#16A34A"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="56"
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill="#111827"
      >
        {score}
      </text>
    </svg>
  );
}

export function CreateArticleWorkspace({
  isNew,
  articleId,
  activeTab,
  onTabChange,
  title,
  deck,
  slug,
  articleType,
  summary,
  status,
  scheduledAt,
  scheduleOn,
  expiryOn,
  onTitleChange,
  onDeckChange,
  onSlugChange,
  onArticleTypeChange,
  onSummaryChange,
  onScheduleOn,
  onExpiryOn,
  onOpenPublishing,
  onOpenSeo,
  blocks,
  onBlocksChange,
  onUploadImage,
  readOnly,
  wordCount,
  charCount,
  readingMinutes,
  lastSavedAt,
  dirty,
  saving,
  publishing,
  canSave,
  canPublish,
  canSubmitReview,
  saveBlockedHint,
  seoScore,
  contentScore = 0,
  eeatScore = 0,
  checklist,
  onSave,
  onSubmitReview,
  onPublish,
  onSchedulePublish,
  publishIntentKey,
  otherTabContent,
  banners,
}: {
  isNew: boolean;
  articleId: string;
  activeTab: ArticleEditorTabId;
  onTabChange: (tab: ArticleEditorTabId) => void;
  title: string;
  deck: string;
  slug: string;
  articleType: string;
  summary: string;
  status: string;
  scheduledAt?: string;
  scheduleOn: boolean;
  expiryOn: boolean;
  onTitleChange: (v: string) => void;
  onDeckChange: (v: string) => void;
  onSlugChange: (v: string) => void;
  onArticleTypeChange: (v: string) => void;
  onSummaryChange: (v: string) => void;
  onScheduleOn: (v: boolean) => void;
  onExpiryOn: (v: boolean) => void;
  onOpenPublishing: () => void;
  onOpenSeo: () => void;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  onUploadImage?: (file: File) => Promise<string>;
  readOnly?: boolean;
  wordCount: number;
  charCount: number;
  readingMinutes: number;
  lastSavedAt: Date | null;
  dirty: boolean;
  saving: boolean;
  publishing: boolean;
  canSave: boolean;
  canPublish: boolean;
  canSubmitReview: boolean;
  saveBlockedHint?: string | null;
  seoScore: number;
  contentScore?: number;
  eeatScore?: number;
  checklist: Array<{ label: string; ok: boolean }>;
  onSave: () => void;
  onSubmitReview: () => void;
  onPublish: () => void;
  onSchedulePublish: () => void;
  publishIntentKey?: number;
  otherTabContent?: ReactNode;
  banners?: ReactNode;
}) {
  const [publishOpen, setPublishOpen] = useState(false);
  const busy = saving || publishing;
  const showPublish = canPublish && status !== "published" && status !== "archived";
  const readability = wordCount > 400 ? 82 : wordCount > 200 ? 68 : 45;
  const engagement = Math.min(95, Math.round(contentScore * 0.9 + (wordCount > 300 ? 8 : 0)));
  const originality = Math.min(95, Math.round(eeatScore * 0.85 + 12));

  useEffect(() => {
    if (publishIntentKey && publishIntentKey > 0 && canSave && !busy) {
      setPublishOpen(true);
    }
  }, [publishIntentKey, canSave, busy]);

  const passed = checklist.filter((c) => c.ok).length;
  const total = Math.max(checklist.length, 1);
  const checklistItems =
    checklist.length > 0
      ? checklist.slice(0, 8)
      : SEO_CHECKLIST_LABELS.map((label) => ({ label, ok: false }));

  const savedLabel = busy
    ? publishing
      ? "Publishing…"
      : "Saving…"
    : dirty
      ? "Unsaved changes"
      : lastSavedAt
        ? `Saved ${formatRelative(lastSavedAt)}`
        : "Saved a few seconds ago";

  const publishDateLabel = scheduledAt
    ? new Date(scheduledAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not set";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 text-gray-900">
      <div className="px-6 py-6">
        <nav className="mb-3 flex items-center gap-1.5 text-sm text-gray-500">
          <Link to="/admin" className="hover:text-gray-800">
            Content
          </Link>
          <span>&gt;</span>
          <Link to="/admin/articles" className="hover:text-gray-800">
            Articles
          </Link>
          <span>&gt;</span>
          <span className="text-gray-900">{isNew ? "Create Article" : "Edit Article"}</span>
        </nav>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isNew ? "Create New Article" : title.trim() || "Edit Article"}
              </h1>
              <p className="text-sm text-gray-500">
                Create SEO optimized, engaging and newsworthy content.
              </p>
              {saveBlockedHint ? (
                <p className="mt-1 text-xs text-amber-600">{saveBlockedHint}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canSave || busy || readOnly}
              onClick={onSave}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving && !publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </button>

            {!isNew ? (
              <Link
                to="/admin/articles/preview/$articleId"
                params={{ articleId }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 opacity-50"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            )}

            {!isNew ? (
              <Link
                to="/admin/articles/revisions/$articleId"
                params={{ articleId }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <History className="h-4 w-4" />
                Version History
              </Link>
            ) : null}

            {canSubmitReview ? (
              <button
                type="button"
                disabled={!canSave || busy || readOnly}
                onClick={onSubmitReview}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Submit for Review
              </button>
            ) : null}

            {showPublish ? (
              <div className="flex">
                <button
                  type="button"
                  disabled={!canSave || busy}
                  onClick={() => setPublishOpen(true)}
                  className="flex items-center gap-2 rounded-l-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Publish
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={!canSave || busy}
                      className="rounded-r-lg border-l border-blue-500 bg-blue-600 px-2 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      aria-label="Publish options"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setPublishOpen(true)}>
                      Publish now
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onSchedulePublish}>Schedule…</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>
        </div>

        {banners}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onTabChange(tab.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "content" ? (
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-800">Headline *</label>
                      <span className="text-xs text-gray-400">{title.length}/120</span>
                    </div>
                    <input
                      value={title}
                      disabled={readOnly}
                      onChange={(e) => {
                        const next = e.target.value.slice(0, 120);
                        onTitleChange(next);
                        if (!slug.trim() && next.trim()) {
                          onSlugChange(slugify(next));
                        }
                      }}
                      placeholder="Write a compelling headline..."
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-800">Short Headline</label>
                      <span className="text-xs text-gray-400">{deck.length}/60</span>
                    </div>
                    <input
                      value={deck}
                      disabled={readOnly}
                      onChange={(e) => onDeckChange(e.target.value.slice(0, 60))}
                      placeholder="Short headline (optional)"
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-800">Slug</label>
                    <input
                      value={slug}
                      disabled={readOnly}
                      onChange={(e) => onSlugChange(slugify(e.target.value))}
                      placeholder="auto-generated-slug-will-appear-here"
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-gray-800">
                      Article Type
                      <span className="text-gray-400">ⓘ</span>
                    </label>
                    <select
                      value={articleType || "news"}
                      disabled={readOnly}
                      onChange={(e) => onArticleTypeChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      {ARTICLE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-800">
                      Summary (Meta Description)
                    </label>
                    <span className="text-xs text-gray-400">{summary.length}/160</span>
                  </div>
                  <textarea
                    value={summary}
                    disabled={readOnly}
                    onChange={(e) => onSummaryChange(e.target.value.slice(0, 160))}
                    placeholder="Write a short summary for meta description..."
                    rows={3}
                    className="w-full resize-y rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                    Rich Text Editor
                  </label>
                  <div className="rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="rounded p-1.5 text-gray-400">
                          <Undo2 className="h-4 w-4" />
                        </span>
                        <span className="rounded p-1.5 text-gray-400">
                          <Redo2 className="h-4 w-4" />
                        </span>
                        <div className="mx-1 h-5 w-px bg-gray-200" />
                        <span className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-600">
                          Paragraph
                          <ChevronDown className="h-3.5 w-3.5" />
                        </span>
                        <div className="mx-1 h-5 w-px bg-gray-200" />
                        <span className="rounded p-1.5 text-gray-400">
                          <Bold className="h-4 w-4" />
                        </span>
                        <span className="rounded p-1.5 text-gray-400">
                          <Italic className="h-4 w-4" />
                        </span>
                        <span className="rounded p-1.5 text-gray-400">
                          <Underline className="h-4 w-4" />
                        </span>
                        <div className="mx-1 h-5 w-px bg-gray-200" />
                        <span className="rounded p-1.5 text-gray-400">
                          <List className="h-4 w-4" />
                        </span>
                        <span className="rounded p-1.5 text-gray-400">
                          <ListOrdered className="h-4 w-4" />
                        </span>
                        <span className="rounded p-1.5 text-gray-400">
                          <Quote className="h-4 w-4" />
                        </span>
                        <span className="rounded p-1.5 text-gray-400">
                          <Link2 className="h-4 w-4" />
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTabChange("ai")}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Wand2 className="h-4 w-4" />
                        AI Write
                      </button>
                    </div>
                    <div className="min-h-[280px] px-2 py-2">
                      <RichEditor
                        value={blocks}
                        onChange={onBlocksChange}
                        readOnly={readOnly}
                        onUploadImage={onUploadImage}
                        onOpenAi={() => onTabChange("ai")}
                        className="border-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 px-3.5 py-2 text-xs text-gray-400">
                      <span>
                        Words: {wordCount} · Characters: {charCount} · Reading time:{" "}
                        {readingMinutes} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {savedLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">{otherTabContent}</div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Calendar className="h-4 w-4 text-gray-500" />
                Publish
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                    {status === "review" ? "In review" : status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Publish Date</span>
                  <span className="font-semibold text-gray-900">{publishDateLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Schedule</span>
                  <Toggle
                    checked={scheduleOn}
                    disabled={readOnly}
                    onChange={onScheduleOn}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Expiry Date</span>
                  <Toggle checked={expiryOn} disabled={readOnly} onChange={onExpiryOn} />
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenPublishing}
                className="mt-4 text-sm font-medium text-blue-600 hover:underline"
              >
                › Advanced Publishing Options
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">SEO Score</span>
                <button
                  type="button"
                  onClick={onOpenSeo}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  View Full Report
                </button>
              </div>
              <div className="flex items-center gap-4">
                <SeoScoreRing score={seoScore} />
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      seoScore >= 80
                        ? "text-green-600"
                        : seoScore >= 55
                          ? "text-amber-600"
                          : "text-rose-600",
                    )}
                  >
                    {seoScore >= 80 ? "Excellent!" : seoScore >= 55 ? "Good" : "Needs work"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {seoScore >= 80
                      ? "Your article is SEO ready."
                      : "Keep improving checklist items."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">SEO Checklist</span>
                <span className="text-sm text-gray-500">
                  {passed} / {total}
                </span>
              </div>
              <ul className="space-y-2.5">
                {checklistItems.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between text-sm text-gray-600"
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          item.ok ? "text-green-500" : "text-amber-400",
                        )}
                      />
                      {item.label}
                    </span>
                    {item.ok ? <Check className="h-4 w-4 text-green-500" /> : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Live Analysis</span>
                <span className="text-xs font-semibold text-gray-500">EEAT {eeatScore}</span>
              </div>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">Content score</div>
                  <div className="text-3xl font-bold tracking-tight text-gray-900">
                    {contentScore}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {wordCount.toLocaleString()} words
                  <br />
                  {readingMinutes} min read
                </div>
              </div>
              <div className="space-y-2.5">
                <AnalysisBar label="Readability" value={readability} />
                <AnalysisBar label="Engagement" value={engagement} />
                <AnalysisBar label="Originality" value={originality} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
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
                setPublishOpen(false);
                onPublish();
              }}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Confirm publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function AnalysisBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-semibold text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function formatRelative(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "a few seconds ago";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

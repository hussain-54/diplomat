import {
  Bot,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Code2,
  FileText,
  FolderTree,
  ImageIcon,
  MapPin,
  Newspaper,
  Search,
  Send,
  Share2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ARTICLE_EDITOR_TABS: Array<{
  id:
    | "content"
    | "media"
    | "categories"
    | "publishing"
    | "seo"
    | "local-seo"
    | "google-news"
    | "eeat"
    | "schema"
    | "social"
    | "ai";
  label: string;
  icon: LucideIcon;
}> = [
  { id: "content", label: "Content", icon: FileText },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "seo", label: "SEO", icon: Search },
  { id: "local-seo", label: "Local SEO", icon: MapPin },
  { id: "google-news", label: "Google News", icon: Newspaper },
  { id: "eeat", label: "EEAT", icon: ShieldCheck },
  { id: "schema", label: "Schema", icon: Code2 },
  { id: "social", label: "Social", icon: Share2 },
  { id: "ai", label: "AI Assistant", icon: Bot },
];

export type ArticleEditorTabId = (typeof ARTICLE_EDITOR_TABS)[number]["id"];

export function ArticleEditorTabs({
  active,
  onChange,
}: {
  active: ArticleEditorTabId;
  onChange: (id: ArticleEditorTabId) => void;
}) {
  return (
    <nav
      className="flex gap-0 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8"
      aria-label="Article editor sections"
    >
      {ARTICLE_EDITOR_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3.5 text-xs font-semibold cms-transition",
              active === tab.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className="h-3.5 w-3.5 opacity-80" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ArticleLiveAnalysis({
  wordCount,
  readingMinutes,
  seoScore,
  contentScore,
  eeatScore,
  checklist,
  status,
  scheduledAt,
  expiryAt,
  onStatusChange,
  onScheduledAtChange,
  onExpiryAtChange,
  onOpenPublishing,
  onOpenSeo,
  scheduleEnabled,
  onScheduleEnabled,
  expiryEnabled,
  onExpiryEnabled,
  canChangeStatus,
  readOnly,
}: {
  wordCount: number;
  readingMinutes: number;
  seoScore: number;
  contentScore: number;
  eeatScore: number;
  checklist: Array<{ label: string; ok: boolean }>;
  status?: string;
  scheduledAt?: string;
  expiryAt?: string;
  onStatusChange?: (status: string) => void;
  onScheduledAtChange?: (value: string) => void;
  onExpiryAtChange?: (value: string) => void;
  onOpenPublishing?: () => void;
  onOpenSeo?: () => void;
  scheduleEnabled?: boolean;
  onScheduleEnabled?: (v: boolean) => void;
  expiryEnabled?: boolean;
  onExpiryEnabled?: (v: boolean) => void;
  canChangeStatus?: boolean;
  readOnly?: boolean;
}) {
  const readability = wordCount > 400 ? 82 : wordCount > 200 ? 68 : 45;
  const engagement = Math.min(95, Math.round(contentScore * 0.9 + (wordCount > 300 ? 8 : 0)));
  const originality = Math.min(95, Math.round(eeatScore * 0.85 + 12));
  const passed = checklist.filter((c) => c.ok).length;
  const total = Math.max(checklist.length, 1);

  return (
    <aside className="sticky top-4 space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Publish</h3>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </label>
        <div className="relative mb-3">
          <select
            disabled={readOnly || !canChangeStatus}
            value={status ?? "draft"}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-border/70 bg-background px-3 pr-8 text-sm font-medium outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
          >
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Publish date
        </label>
        <div className="relative mb-3">
          <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="datetime-local"
            disabled={readOnly}
            value={toLocalInput(scheduledAt)}
            onChange={(e) => onScheduledAtChange?.(e.target.value)}
            className="h-10 w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
          />
        </div>

        <ToggleRow
          label="Schedule"
          on={Boolean(scheduleEnabled ?? scheduledAt)}
          disabled={readOnly}
          onToggle={(v) => onScheduleEnabled?.(v)}
        />
        <ToggleRow
          label="Expiry date"
          on={Boolean(expiryEnabled ?? expiryAt)}
          disabled={readOnly}
          onToggle={(v) => onExpiryEnabled?.(v)}
        />
        {(expiryEnabled || expiryAt) && (
          <input
            type="datetime-local"
            disabled={readOnly}
            value={toLocalInput(expiryAt)}
            onChange={(e) => onExpiryAtChange?.(e.target.value)}
            className="mb-3 mt-1 h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none"
          />
        )}

        <button
          type="button"
          onClick={onOpenPublishing}
          className="mt-1 text-xs font-semibold text-primary hover:underline"
        >
          + Advanced publishing options
        </button>
      </div>

      <ScoreCard
        title="SEO score"
        score={seoScore}
        message={
          seoScore >= 80
            ? "Excellent! Your article is SEO ready."
            : seoScore >= 55
              ? "Good progress — tighten a few SEO items."
              : "Needs work before publish."
        }
        onViewReport={onOpenSeo}
      />

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">SEO checklist</h3>
          <span className="text-xs font-bold tabular-nums text-muted-foreground">
            {passed} / {total}
          </span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary cms-transition"
            style={{ width: `${(passed / total) * 100}%` }}
          />
        </div>
        <ul className="space-y-1.5">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs">
              {item.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
              <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ScoreCard
        title="Content score"
        score={contentScore}
        message={
          contentScore >= 75
            ? "Good — strong structure and depth."
            : contentScore >= 50
              ? "Fair — expand body and highlights."
              : "Short — add more editorial substance."
        }
      >
        <div className="mt-3 space-y-2.5">
          <Bar label="Readability" value={readability} />
          <Bar label="Engagement" value={engagement} />
          <Bar label="Originality" value={originality} />
          <p className="pt-1 text-[11px] text-muted-foreground">
            {wordCount.toLocaleString()} words · {readingMinutes} min · EEAT {eeatScore}
          </p>
        </div>
      </ScoreCard>
    </aside>
  );
}

function ToggleRow({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
      <span className="text-xs font-medium">{label}</span>
      <button
        type="button"
        disabled={disabled}
        role="switch"
        aria-checked={on}
        onClick={() => onToggle?.(!on)}
        className={cn(
          "relative h-5 w-9 rounded-full cms-transition disabled:opacity-50",
          on ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow cms-transition",
            on ? "left-4" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  message,
  onViewReport,
  children,
}: {
  title: string;
  score: number;
  message: string;
  onViewReport?: () => void;
  children?: React.ReactNode;
}) {
  const tone =
    score >= 80 ? "text-emerald-600" : score >= 55 ? "text-amber-600" : "text-rose-600";
  const ring =
    score >= 80 ? "stroke-emerald-500" : score >= 55 ? "stroke-amber-500" : "stroke-rose-500";
  const pct = Math.max(0, Math.min(100, score));
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onViewReport ? (
          <button
            type="button"
            onClick={onViewReport}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            View full report
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 88 88" className="-rotate-90">
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/60"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className={ring}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-lg font-bold tabular-nums", tone)}>{score}</span>
            <span className="text-[9px] text-muted-foreground">/100</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
      {children}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary cms-transition"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

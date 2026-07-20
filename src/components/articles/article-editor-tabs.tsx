import { cn } from "@/lib/utils";

export const ARTICLE_EDITOR_TABS = [
  { id: "content", label: "Content" },
  { id: "media", label: "Media" },
  { id: "categories", label: "Categories" },
  { id: "publishing", label: "Publishing" },
  { id: "seo", label: "SEO" },
  { id: "local-seo", label: "Local SEO" },
  { id: "google-news", label: "Google News" },
  { id: "eeat", label: "EEAT" },
  { id: "schema", label: "Schema" },
  { id: "social", label: "Social" },
  { id: "ai", label: "AI Assistant" },
] as const;

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
      className="flex gap-1 overflow-x-auto border-b border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm"
      aria-label="Article editor sections"
    >
      {ARTICLE_EDITOR_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold cms-transition",
            active === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
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
}: {
  wordCount: number;
  readingMinutes: number;
  seoScore: number;
  contentScore: number;
  eeatScore: number;
  checklist: Array<{ label: string; ok: boolean }>;
}) {
  return (
    <aside className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">Live analysis</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Words" value={wordCount} />
        <Stat label="Read time" value={`${readingMinutes} min`} />
        <Stat label="SEO" value={`${seoScore}/100`} />
        <Stat label="Content" value={`${contentScore}/100`} />
        <Stat label="EEAT" value={`${eeatScore}/100`} />
        <Stat label="Readability" value={wordCount > 200 ? "Good" : "Short"} />
      </dl>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          SEO checklist
        </h4>
        <ul className="space-y-1.5 text-xs">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  item.ok ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

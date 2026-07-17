import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Eye, FileText } from "lucide-react";
import { CmsPageHeader, CmsPanel, CmsStat } from "@/components/cms-ui";
import { getAnalyticsOverview } from "@/lib/admin.functions";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "analytics:view"),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const analytics = useQuery({ queryKey: ["cms-analytics"], queryFn: getAnalyticsOverview });
  const data = analytics.data;
  const totalViews = (data?.metrics ?? []).reduce((sum, item) => sum + item.views, 0);
  const published = (data?.articles ?? []).filter((article) => article.status === "published").length;
  const pendingComments = (data?.comments ?? []).filter((comment) => comment.status === "pending").length;

  const daily = new Map<string, number>();
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    daily.set(date.toISOString().slice(0, 10), 0);
  }
  for (const metric of data?.metrics ?? []) {
    daily.set(metric.metric_date, (daily.get(metric.metric_date) ?? 0) + metric.views);
  }
  const dailyRows = [...daily.entries()];
  const maxDaily = Math.max(...dailyRows.map(([, views]) => views), 1);

  const storyTotals = new Map<string, { title: string; views: number }>();
  for (const metric of data?.metrics ?? []) {
    const article = Array.isArray(metric.articles) ? metric.articles[0] : metric.articles;
    const current = storyTotals.get(metric.article_id) ?? {
      title: article?.title ?? "Unknown article",
      views: 0,
    };
    current.views += metric.views;
    storyTotals.set(metric.article_id, current);
  }
  const topStories = [...storyTotals.values()].sort((a, b) => b.views - a.views).slice(0, 8);

  const sectionCounts = new Map<string, number>();
  for (const article of data?.articles ?? []) {
    const section = Array.isArray(article.sections) ? article.sections[0] : article.sections;
    const name = section?.name ?? "Unassigned";
    sectionCounts.set(name, (sectionCounts.get(name) ?? 0) + 1);
  }
  const maxSection = Math.max(...sectionCounts.values(), 1);

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Performance intelligence"
        title="Analytics"
        description="A rolling 30-day view of audience activity and newsroom output."
      />

      {analytics.error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {analytics.error.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CmsStat label="Article views" value={totalViews.toLocaleString()} detail="Rolling 30 days" trend="neutral" />
        <CmsStat label="Published" value={published} detail="Stories released" trend="up" />
        <CmsStat label="Comments" value={data?.comments.length ?? 0} detail={`${pendingComments} awaiting review`} />
        <CmsStat
          label="Avg. views / story"
          value={published ? Math.round(totalViews / published).toLocaleString() : "0"}
          detail="Published this period"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
        <CmsPanel title="Audience trend" description="Daily article views · last 30 days">
          <div className="p-5">
            <div className="flex h-64 items-end gap-1 border-b border-l border-border px-2 pt-4">
              {dailyRows.map(([date, views], index) => (
                <div key={date} className="group relative flex h-full min-w-0 flex-1 items-end">
                  <div
                    className="w-full bg-foreground/80 transition-colors group-hover:bg-cat-blue"
                    style={{ height: `${Math.max((views / maxDaily) * 100, views ? 3 : 0)}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground group-hover:block">
                    {new Date(`${date}T00:00:00Z`).toLocaleDateString()} · {views.toLocaleString()} views
                  </div>
                  {index % 7 === 0 && (
                    <span className="absolute top-full mt-2 text-[9px] text-muted-foreground">
                      {new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CmsPanel>

        <CmsPanel title="Output by category" description="Stories created in this period">
          <div className="space-y-4 p-5">
            {[...sectionCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted">
                    <div className="h-full bg-cat-blue" style={{ width: `${(count / maxSection) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </CmsPanel>
      </div>

      <CmsPanel title="Top stories" description="Ranked by article views in the selected period">
        {!topStories.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Analytics will populate as readers open published articles.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {topStories.map((story, index) => (
              <div key={`${story.title}-${index}`} className="flex items-center gap-4 px-5 py-4">
                <span className="w-7 text-right font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{story.title}</span>
                <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" /> {story.views.toLocaleString()}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

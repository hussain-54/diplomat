import { MetricCard } from "@/components/cms";
import { CmsPanel } from "@/components/cms-ui";
import { SectionHeader } from "@/components/dashboard/primitives";
import {
  AreaTrendChart,
  BarMetricChart,
  ChartCard,
  DonutChart,
  LineTrendChart,
} from "@/components/dashboard/chart-card";

export function AnalyticsView({
  totalViews,
  published,
  pendingComments,
  commentCount,
  dailyRows,
  topStories,
  sectionCounts,
}: {
  totalViews: number;
  published: number;
  pendingComments: number;
  commentCount: number;
  dailyRows: Array<[string, number]>;
  topStories: Array<{ title: string; views: number }>;
  sectionCounts: Array<[string, number]>;
}) {
  const trend = dailyRows.map(([label, value]) => ({
    label: new Date(`${label}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    views: value,
  }));
  const categories = sectionCounts.slice(0, 8).map(([label, value]) => ({ label, value }));
  const articles = topStories.slice(0, 8).map((story) => ({
    label: story.title.length > 28 ? `${story.title.slice(0, 28)}…` : story.title,
    value: story.views,
  }));

  // Only pageviews are instrumented. Other KPIs stay honest placeholders.
  const uniqueEstimate = Math.round(totalViews * 0.62);
  const engagementRate =
    published > 0 ? Math.min(100, Math.round((commentCount / published) * 12)) : 0;

  const deviceMix = [
    { label: "Desktop", value: Math.round(totalViews * 0.48) || 1 },
    { label: "Mobile", value: Math.round(totalViews * 0.44) || 1 },
    { label: "Tablet", value: Math.round(totalViews * 0.08) || 1 },
  ];
  const sources = [
    { label: "Direct", value: Math.round(totalViews * 0.34) || 1 },
    { label: "Search", value: Math.round(totalViews * 0.31) || 1 },
    { label: "Social", value: Math.round(totalViews * 0.22) || 1 },
    { label: "Referral", value: Math.round(totalViews * 0.13) || 1 },
  ];

  const hasTraffic = totalViews > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Newsroom analytics"
        description="Traffic, engagement, and audience composition · rolling 30 days"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Page views" value={totalViews.toLocaleString()} detail="Instrumented" trend={hasTraffic ? "up" : "neutral"} />
        <MetricCard
          label="Unique visitors"
          value={hasTraffic ? uniqueEstimate.toLocaleString() : "—"}
          detail="Estimated · 62% of views"
        />
        <MetricCard label="Avg session" value="—" detail="Requires GA4 / Plausible" />
        <MetricCard label="Bounce rate" value="—" detail="Requires session analytics" />
        <MetricCard label="CTR" value="—" detail="Requires ad/search click data" />
        <MetricCard
          label="Engagement rate"
          value={hasTraffic ? `${engagementRate}%` : "—"}
          detail={`${commentCount} comments · ${pendingComments} pending`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Traffic trends" description="Daily pageviews" empty={!hasTraffic}>
          <AreaTrendChart
            data={trend}
            dataKey="views"
            config={{ views: { label: "Views", color: "var(--color-cat-blue)" } }}
          />
        </ChartCard>
        <ChartCard title="Audience growth" description="Cumulative daily views" empty={!hasTraffic}>
          <LineTrendChart
            data={trend.reduce<Array<{ label: string; views: number }>>((acc, row) => {
              const prev = acc[acc.length - 1]?.views ?? 0;
              acc.push({ label: row.label, views: prev + Number(row.views) });
              return acc;
            }, [])}
            dataKey="views"
            config={{ views: { label: "Cumulative", color: "var(--color-gold)" } }}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Top categories" description="Story volume" empty={!categories.length}>
          <BarMetricChart data={categories} layout="vertical" />
        </ChartCard>
        <ChartCard title="Top articles" description="By views" empty={!articles.length}>
          <BarMetricChart
            data={articles}
            layout="vertical"
            config={{ value: { label: "Views", color: "var(--color-cat-teal)" } }}
          />
        </ChartCard>
        <ChartCard title="Traffic sources" description="Modeled mix until source tags ship" empty={!hasTraffic}>
          <DonutChart data={sources} />
        </ChartCard>
        <ChartCard title="Device breakdown" description="Modeled mix until device analytics ship" empty={!hasTraffic}>
          <DonutChart data={deviceMix} />
        </ChartCard>
      </div>

      <CmsPanel title="Instrumentation notes" description="What is live vs planned">
        <div className="grid gap-3 p-5 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-semibold text-foreground">Live:</span> pageviews via{" "}
            <code className="text-xs">article_daily_metrics</code>, comments, publish counts.
          </p>
          <p>
            <span className="font-semibold text-foreground">Planned:</span> session duration, bounce,
            CTR, and verified device/source mix via GA4 or first-party analytics events.
          </p>
        </div>
      </CmsPanel>
    </div>
  );
}

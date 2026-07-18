import {
  BarChart3,
  Eye,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { MetricCard } from "@/components/cms";
import { CmsPanel } from "@/components/cms-ui";
import { SectionHeader } from "@/components/dashboard/primitives";
import {
  AreaTrendChart,
  BarMetricChart,
  ChartCard,
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

  const hasTraffic = totalViews > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Newsroom analytics"
        description="Instrumented traffic and content mix · rolling 30 days"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Page views"
          value={totalViews.toLocaleString()}
          icon={Eye}
          detail="Instrumented"
          trend={hasTraffic ? "up" : "neutral"}
        />
        <MetricCard
          label="Unique visitors"
          value="—"
          icon={Sparkles}
          detail="Requires GA4 / Plausible"
        />
        <MetricCard label="Avg session" value="—" detail="Requires session analytics" />
        <MetricCard label="Bounce rate" value="—" detail="Requires session analytics" />
        <MetricCard label="CTR" value="—" detail="Requires ad/search click data" />
        <MetricCard
          label="Comments"
          value={commentCount}
          icon={MessageSquare}
          detail={`${pendingComments} pending · ${published} published`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Traffic trends" description="Daily pageviews" empty={!hasTraffic}>
          <AreaTrendChart
            data={trend}
            dataKey="views"
            config={{ views: { label: "Views", color: "var(--color-primary)" } }}
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
            config={{ views: { label: "Cumulative", color: "var(--color-cat-indigo)" } }}
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
        <ChartCard
          title="Traffic sources"
          description="Not instrumented"
          empty
          emptyTitle="Sources unavailable"
          emptyDescription="Connect GA4 or first-party referral events to populate source mix."
        >
          <div />
        </ChartCard>
        <ChartCard
          title="Device breakdown"
          description="Not instrumented"
          empty
          emptyTitle="Devices unavailable"
          emptyDescription="Device mix requires analytics SDK instrumentation."
        >
          <div />
        </ChartCard>
      </div>

      <CmsPanel title="Instrumentation notes" description="What is live vs planned">
        <div className="grid gap-3 p-5 text-sm text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-primary" /> Live:
            </span>{" "}
            pageviews via <code className="text-xs">article_daily_metrics</code>, comments, publish
            counts, and section volume.
          </p>
          <p>
            <span className="font-semibold text-foreground">Planned:</span> unique visitors, session
            duration, bounce, CTR, and verified device/source mix via GA4 or first-party analytics
            events.
          </p>
        </div>
      </CmsPanel>
    </div>
  );
}

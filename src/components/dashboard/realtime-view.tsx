import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { CmsEmptyState, CmsPanel, CmsStatus } from "@/components/cms-ui";
import { MetricCard, StatusBadge } from "@/components/cms";
import { SectionHeader } from "@/components/dashboard/primitives";
import { ChartCard, LineTrendChart } from "@/components/dashboard/chart-card";
import {
  authorName,
  sectionName,
  type DashboardArticle,
} from "@/components/dashboard/types";
import { Link } from "@tanstack/react-router";

const REFRESH_MS = 15_000;

export function RealtimeView({
  liveVisitors,
  presenceConnected,
  realtimeConnected,
  alerts,
  publishedToday,
  recentPublished,
  canViewArticles,
  dailyRows,
  topStories,
}: {
  liveVisitors: number;
  presenceConnected: boolean;
  realtimeConnected: boolean;
  alerts: Array<{ id?: string; text?: string; tag?: string | null }>;
  publishedToday: number;
  recentPublished: DashboardArticle[];
  canViewArticles: boolean;
  dailyRows: Array<[string, number]>;
  topStories: Array<{ title: string; views: number }>;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-articles"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [queryClient]);

  const spark = dailyRows.slice(-12).map(([label, value]) => ({
    label: label.slice(5),
    views: value,
  }));
  const trending = topStories.slice(0, 6);
  const activeArticles = recentPublished.slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Live newsroom monitor"
        description={`Presence + websocket desk feed · auto-refresh ${REFRESH_MS / 1000}s`}
        action={
          <div className="flex items-center gap-2 rounded-lg border border-border/80 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${realtimeConnected ? "bg-cat-green" : "bg-cat-amber"}`}
            />
            {realtimeConnected ? "WebSocket subscribed" : "Reconnecting"}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Live visitors"
          value={presenceConnected ? liveVisitors : "—"}
          detail={presenceConnected ? "Presence channel" : "Connecting"}
          trend={liveVisitors > 0 ? "up" : "neutral"}
        />
        <MetricCard label="Active articles" value={activeArticles.length} detail="Recently live" />
        <MetricCard
          label="Breaking alerts"
          value={alerts.length}
          detail="Ticker desk"
          trend={alerts.length ? "up" : "neutral"}
        />
        <MetricCard label="Published today" value={publishedToday} detail="Output pulse" />
        <MetricCard
          label="Current engagement"
          value={presenceConnected ? liveVisitors : "—"}
          detail="Concurrent readers"
        />
        <MetricCard
          label="Feed health"
          value={realtimeConnected ? "Online" : "Offline"}
          detail="Articles · comments · ticker"
          trend={realtimeConnected ? "up" : "down"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Breaking news alerts" description="Live ticker wire">
          {!alerts.length ? (
            <CmsEmptyState title="Wire is quiet" description="Ticker alerts stream here in real time." />
          ) : (
            <div className="divide-y divide-border/70">
              {alerts.slice(0, 10).map((alert, index) => (
                <div key={alert.id ?? index} className="flex items-start gap-3 px-5 py-4">
                  <Radio className="mt-0.5 h-4 w-4 text-cat-rose" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{alert.text}</div>
                    {alert.tag ? (
                      <div className="mt-1">
                        <CmsStatus tone="danger">{alert.tag}</CmsStatus>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CmsPanel>

        <CmsPanel title="Active articles" description="Just published">
          {!activeArticles.length ? (
            <CmsEmptyState title="No live pulse" description="Publishes appear here instantly." />
          ) : (
            <div className="divide-y divide-border/70">
              {activeArticles.map((article) => (
                <div key={article.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    {canViewArticles ? (
                      <Link
                        to="/admin/articles/$id"
                        params={{ id: article.id }}
                        className="truncate text-sm font-semibold hover:text-primary"
                      >
                        {article.title}
                      </Link>
                    ) : (
                      <div className="truncate text-sm font-semibold">{article.title}</div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {sectionName(article.sections)} · {authorName(article.author)}
                    </div>
                  </div>
                  <StatusBadge status="published">live</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </CmsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Live traffic pulse"
          description="Recent daily views"
          empty={!spark.some((r) => r.views)}
        >
          <LineTrendChart
            data={spark}
            dataKey="views"
            config={{ views: { label: "Views", color: "var(--color-primary)" } }}
          />
        </ChartCard>
        <CmsPanel title="Trending articles" description="Top by views">
          {!trending.length ? (
            <CmsEmptyState title="No trends yet" description="Traffic leaders appear here." />
          ) : (
            <div className="divide-y divide-border/70">
              {trending.map((story, index) => (
                <div
                  key={`${story.title}-${index}`}
                  className="flex justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="cms-metric flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="truncate text-sm font-semibold">{story.title}</div>
                  </div>
                  <div className="cms-metric shrink-0 text-sm font-semibold">
                    {story.views.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CmsPanel>
      </div>
    </div>
  );
}

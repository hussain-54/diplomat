import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import {
  getAnalyticsOverview,
  getDashboardMetrics,
  getDashboardSettingsSnapshot,
  getMe,
  listDashboardArticles,
} from "@/lib/admin.functions";
import { getTicker } from "@/lib/content.functions";
import { PageHeader } from "@/components/cms";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnalyticsView,
  DashboardViewTabs,
  EditorialView,
  NotificationsView,
  OverviewView,
  QuickActionsView,
  RealtimeView,
  RevenueView,
  SeoView,
  type DashboardArticle,
  type DashboardView,
} from "@/components/dashboard/newsroom-dashboard";
import { parseIntegrations } from "@/lib/settings";
import { useLiveVisitors } from "@/hooks/useLiveVisitors";
import { useNewsroomRealtime } from "@/hooks/useNewsroomRealtime";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "dashboard:view"),
  component: Overview,
});

function Overview() {
  const [view, setView] = useState<DashboardView>("overview");
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const canViewArticles = hasPermission(me.data?.roles, "articles:view");
  const canCreateArticles = hasPermission(me.data?.roles, "articles:create");
  const canViewAnalytics = hasPermission(me.data?.roles, "analytics:view");

  const articles = useQuery({
    queryKey: ["dashboard-articles"],
    queryFn: listDashboardArticles,
  });
  const alerts = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: getTicker,
  });
  const metrics = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: getDashboardMetrics,
  });
  const analytics = useQuery({
    queryKey: ["cms-analytics"],
    queryFn: getAnalyticsOverview,
    enabled: canViewAnalytics,
  });
  const settings = useQuery({
    queryKey: ["dashboard-settings-snapshot"],
    queryFn: getDashboardSettingsSnapshot,
  });

  const { count: liveVisitors, connected: presenceConnected } = useLiveVisitors();
  const realtimeConnected = useNewsroomRealtime();

  const list = (articles.data ?? []) as DashboardArticle[];
  const review = list.filter((a) => a.status === "review");
  const recentPublished = list
    .filter((a) => a.status === "published")
    .slice(0, 8);
  const breakingAlerts = alerts.data ?? [];
  const pendingComments =
    metrics.data?.pendingComments ??
    (analytics.data?.comments ?? []).filter((comment) => comment.status === "pending").length;
  const flaggedComments = metrics.data?.flaggedComments ?? 0;

  const analyticsModel = useMemo(() => {
    const data = analytics.data;
    const totalViews = (data?.metrics ?? []).reduce((sum, item) => sum + item.views, 0);
    const published = (data?.articles ?? []).filter((article) => article.status === "published").length;
    const pending = (data?.comments ?? []).filter((comment) => comment.status === "pending").length;

    const daily = new Map<string, number>();
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - offset);
      daily.set(date.toISOString().slice(0, 10), 0);
    }
    for (const metric of data?.metrics ?? []) {
      daily.set(metric.metric_date, (daily.get(metric.metric_date) ?? 0) + metric.views);
    }

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

    const sectionCounts = new Map<string, number>();
    for (const article of data?.articles ?? []) {
      const section = Array.isArray(article.sections) ? article.sections[0] : article.sections;
      const name = section?.name ?? "Unassigned";
      sectionCounts.set(name, (sectionCounts.get(name) ?? 0) + 1);
    }

    return {
      totalViews,
      published,
      pendingComments: pending,
      commentCount: data?.comments.length ?? 0,
      dailyRows: [...daily.entries()] as Array<[string, number]>,
      topStories: [...storyTotals.values()].sort((a, b) => b.views - a.views).slice(0, 8),
      sectionCounts: [...sectionCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [analytics.data]);

  const integrations = parseIntegrations(
    (settings.data as { integrations?: unknown } | null)?.integrations,
  );

  const isLoading =
    me.isLoading ||
    articles.isLoading ||
    alerts.isLoading ||
    metrics.isLoading ||
    (canViewAnalytics && analytics.isLoading);
  const error =
    me.error ?? articles.error ?? alerts.error ?? metrics.error ?? analytics.error ?? settings.error;

  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dateLabel}
        title={`Good ${greeting()}, ${me.data?.profile?.name?.split(" ")[0] ?? "editor"}`}
        description="Enterprise newsroom command center — editorial, SEO, analytics, revenue readiness, and live operations."
        actions={
          <>
            <div className="flex h-9 items-center gap-2 border border-border px-3 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeConnected ? "bg-cat-green" : "bg-gold"
                }`}
              />
              {realtimeConnected ? "Live updates on" : "Connecting…"}
            </div>
            {canCreateArticles && (
              <Link
                to="/admin/articles/$id"
                params={{ id: "new" }}
                className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-xs font-semibold text-primary-foreground"
              >
                <FileText className="h-4 w-4" /> New article
              </Link>
            )}
          </>
        }
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          Dashboard data could not be fully refreshed. {error.message}
        </div>
      )}

      <DashboardViewTabs active={view} onChange={setView} />

      {view === "overview" && (
        <OverviewView
          metrics={{
            publishedToday: metrics.data?.publishedToday ?? 0,
            pendingReview: metrics.data?.pendingReview ?? 0,
            drafts: metrics.data?.drafts ?? 0,
            scheduled: metrics.data?.scheduled ?? 0,
          }}
          liveVisitors={presenceConnected ? liveVisitors : "—"}
          presenceConnected={presenceConnected}
          articles={list}
          review={review}
          alerts={breakingAlerts}
          pendingComments={pendingComments}
          realtimeConnected={realtimeConnected}
          canViewArticles={canViewArticles}
          canCreateArticles={canCreateArticles}
        />
      )}

      {view === "editorial" && (
        <EditorialView
          articles={list}
          metrics={{
            pendingReview: metrics.data?.pendingReview ?? 0,
            drafts: metrics.data?.drafts ?? 0,
            scheduled: metrics.data?.scheduled ?? 0,
            archived: metrics.data?.archived ?? 0,
          }}
          canViewArticles={canViewArticles}
        />
      )}

      {view === "seo" && <SeoView articles={list} canViewArticles={canViewArticles} />}

      {view === "analytics" &&
        (canViewAnalytics ? (
          <AnalyticsView {...analyticsModel} />
        ) : (
          <div className="border border-border bg-card px-5 py-10 text-sm text-muted-foreground">
            Analytics requires the <span className="font-semibold text-foreground">analytics:view</span>{" "}
            permission.
          </div>
        ))}

      {view === "revenue" && (
        <RevenueView
          adManagerCode={integrations.google_ad_manager_network_code}
          totalViews={analyticsModel.totalViews}
          published={analyticsModel.published}
        />
      )}

      {view === "realtime" && (
        <RealtimeView
          liveVisitors={liveVisitors}
          presenceConnected={presenceConnected}
          realtimeConnected={realtimeConnected}
          alerts={breakingAlerts as Array<{ id?: string; text?: string; tag?: string | null }>}
          publishedToday={metrics.data?.publishedToday ?? 0}
          recentPublished={recentPublished}
          canViewArticles={canViewArticles}
        />
      )}

      {view === "notifications" && (
        <NotificationsView
          reviewCount={review.length}
          pendingComments={pendingComments}
          flaggedComments={flaggedComments}
          alertCount={breakingAlerts.length}
          realtimeConnected={realtimeConnected}
        />
      )}

      {view === "actions" && <QuickActionsView />}
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading newsroom dashboard">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 border border-border bg-card p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-4 border border-border bg-card p-5">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((__, row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

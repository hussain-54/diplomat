import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import {
  getAnalyticsOverview,
  getDashboardMetrics,
  getDashboardPerformance,
  getDashboardSettingsSnapshot,
  getMe,
  listDashboardArticles,
} from "@/lib/admin.functions";
import { getTicker } from "@/lib/content.functions";
import { PageHeader, CmsPageSkeleton, CmsAlert } from "@/components/cms";
import {
  DashboardViewTabs,
  OverviewView,
  type DashboardArticle,
  type DashboardView,
} from "@/components/dashboard/newsroom-dashboard";
import { parseIntegrations } from "@/lib/settings";
import { useLiveVisitors } from "@/hooks/useLiveVisitors";
import { useNewsroomRealtime } from "@/hooks/useNewsroomRealtime";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";
import { cmsButton } from "@/components/cms-ui";
import { Skeleton } from "@/components/ui/skeleton";

const EditorialView = lazy(() =>
  import("@/components/dashboard/editorial-view").then((m) => ({ default: m.EditorialView })),
);
const SeoView = lazy(() =>
  import("@/components/dashboard/seo-view").then((m) => ({ default: m.SeoView })),
);
const AnalyticsView = lazy(() =>
  import("@/components/dashboard/analytics-view").then((m) => ({ default: m.AnalyticsView })),
);
const RevenueView = lazy(() =>
  import("@/components/dashboard/revenue-view").then((m) => ({ default: m.RevenueView })),
);
const RealtimeView = lazy(() =>
  import("@/components/dashboard/realtime-view").then((m) => ({ default: m.RealtimeView })),
);
const NotificationsView = lazy(() =>
  import("@/components/dashboard/notifications-view").then((m) => ({
    default: m.NotificationsView,
  })),
);
const QuickActionsView = lazy(() =>
  import("@/components/dashboard/quick-actions-view").then((m) => ({
    default: m.QuickActionsView,
  })),
);

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "dashboard:view"),
  component: Overview,
});

function ViewFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function Overview() {
  const [view, setView] = useState<DashboardView>("overview");
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe(), staleTime: 60_000 });
  const canViewArticles = hasPermission(me.data?.roles, "articles:view");
  const canCreateArticles = hasPermission(me.data?.roles, "articles:create");
  const canViewAnalytics = hasPermission(me.data?.roles, "analytics:view");

  const articles = useQuery({
    queryKey: ["dashboard-articles"],
    queryFn: listDashboardArticles,
    staleTime: 15_000,
  });
  const alerts = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: getTicker,
    staleTime: 10_000,
    refetchInterval: view === "realtime" ? 15_000 : false,
  });
  const metrics = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: getDashboardMetrics,
    staleTime: 15_000,
    refetchInterval: view === "realtime" ? 15_000 : false,
  });
  const performance = useQuery({
    queryKey: ["dashboard-performance"],
    queryFn: getDashboardPerformance,
    staleTime: 30_000,
    refetchInterval: view === "realtime" ? 15_000 : false,
  });
  const analytics = useQuery({
    queryKey: ["cms-analytics"],
    queryFn: getAnalyticsOverview,
    enabled: canViewAnalytics && (view === "analytics" || view === "revenue"),
    staleTime: 30_000,
  });
  const settings = useQuery({
    queryKey: ["dashboard-settings-snapshot"],
    queryFn: getDashboardSettingsSnapshot,
    staleTime: 120_000,
  });

  const { count: liveVisitors, connected: presenceConnected } = useLiveVisitors();
  const realtimeConnected = useNewsroomRealtime();

  const list = (articles.data ?? []) as DashboardArticle[];
  const review = useMemo(() => list.filter((a) => a.status === "review"), [list]);
  const recentPublished = useMemo(
    () => list.filter((a) => a.status === "published").slice(0, 8),
    [list],
  );
  const breakingAlerts = alerts.data ?? [];
  const pendingComments = metrics.data?.pendingComments ?? 0;
  const flaggedComments = metrics.data?.flaggedComments ?? 0;
  const seoIssues = useMemo(
    () =>
      list.filter(
        (a) =>
          !a.seo_title?.trim() ||
          !a.meta_description?.trim() ||
          !a.focus_keyword?.trim() ||
          a.robots_index === false,
      ).length,
    [list],
  );

  const analyticsModel = useMemo(() => {
    const data = analytics.data;
    const totalViews =
      metrics.data?.monthlyViews ??
      (data?.metrics ?? []).reduce((sum, item) => sum + item.views, 0);
    const published =
      metrics.data?.publishedTotal ??
      (data?.articles ?? []).filter((article) => article.status === "published").length;
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
    if (!sectionCounts.size) {
      for (const article of list) {
        const section = Array.isArray(article.sections) ? article.sections[0] : article.sections;
        const name = section?.name ?? "Unassigned";
        sectionCounts.set(name, (sectionCounts.get(name) ?? 0) + 1);
      }
    }

    return {
      totalViews,
      published,
      pendingComments: pending || pendingComments,
      commentCount: data?.comments.length ?? pendingComments,
      dailyRows: (performance.data?.dailyRows ?? [...daily.entries()]) as Array<[string, number]>,
      topStories:
        performance.data?.topStories ??
        [...storyTotals.values()].sort((a, b) => b.views - a.views).slice(0, 8),
      sectionCounts: [...sectionCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [analytics.data, list, metrics.data, performance.data, pendingComments]);

  const integrations = parseIntegrations(
    (settings.data as { integrations?: unknown } | null)?.integrations,
  );
  const adManagerConfigured = Boolean(integrations.google_ad_manager_network_code?.trim());

  const isLoading =
    me.isLoading ||
    articles.isLoading ||
    alerts.isLoading ||
    metrics.isLoading ||
    performance.isLoading;
  const error =
    me.error ??
    articles.error ??
    alerts.error ??
    metrics.error ??
    performance.error ??
    analytics.error ??
    settings.error;

  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  if (isLoading) return <CmsPageSkeleton metrics={8} panels={2} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dateLabel}
        title={`Good ${greeting()}, ${me.data?.profile?.name?.split(" ")[0] ?? "editor"}`}
        description="Enterprise newsroom command center — editorial queues, SEO health, analytics, and live operations."
        breadcrumbs={[
          { label: "Newsroom", href: "/admin" },
          { label: "Dashboard" },
        ]}
        actions={
          <>
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border/80 px-3 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeConnected ? "bg-cat-green" : "bg-cat-amber"
                }`}
              />
              {realtimeConnected ? "Live updates on" : "Connecting…"}
            </div>
            {canCreateArticles && (
              <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                <FileText className="h-4 w-4" /> New article
              </Link>
            )}
          </>
        }
      />

      {error && (
        <CmsAlert>
          Dashboard data could not be fully refreshed. {error.message}
        </CmsAlert>
      )}

      <DashboardViewTabs
        active={view}
        onChange={setView}
        badges={{
          editorial: metrics.data?.pendingReview ?? 0,
          notifications:
            review.length + pendingComments + flaggedComments + breakingAlerts.length + seoIssues,
        }}
      />

      {view === "overview" && (
        <OverviewView
          metrics={{
            totalArticles: metrics.data?.totalArticles ?? 0,
            publishedTotal: metrics.data?.publishedTotal ?? 0,
            publishedToday: metrics.data?.publishedToday ?? 0,
            pendingReview: metrics.data?.pendingReview ?? 0,
            drafts: metrics.data?.drafts ?? 0,
            scheduled: metrics.data?.scheduled ?? 0,
            activeAuthors: metrics.data?.activeAuthors ?? 0,
            monthlyViews: metrics.data?.monthlyViews ?? 0,
            archived: metrics.data?.archived ?? 0,
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
          adManagerConfigured={adManagerConfigured}
          dailyRows={analyticsModel.dailyRows}
          topStories={analyticsModel.topStories}
        />
      )}

      <Suspense fallback={<ViewFallback />}>
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

        {view === "seo" && (
          <SeoView
            articles={list}
            canViewArticles={canViewArticles}
            monthlyViews={metrics.data?.monthlyViews ?? 0}
          />
        )}

        {view === "analytics" &&
          (canViewAnalytics ? (
            <AnalyticsView {...analyticsModel} />
          ) : (
            <div className="border border-border bg-card px-5 py-10 text-sm text-muted-foreground">
              Analytics requires the{" "}
              <span className="font-semibold text-foreground">analytics:view</span> permission.
            </div>
          ))}

        {view === "revenue" && (
          <RevenueView
            adManagerCode={integrations.google_ad_manager_network_code}
            totalViews={analyticsModel.totalViews}
            published={analyticsModel.published}
            dailyRows={analyticsModel.dailyRows}
            topStories={analyticsModel.topStories}
            sectionCounts={analyticsModel.sectionCounts}
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
            dailyRows={analyticsModel.dailyRows}
            topStories={analyticsModel.topStories}
          />
        )}

        {view === "notifications" && (
          <NotificationsView
            reviewCount={review.length}
            pendingComments={pendingComments}
            flaggedComments={flaggedComments}
            alertCount={breakingAlerts.length}
            realtimeConnected={realtimeConnected}
            seoIssues={seoIssues}
            adManagerConfigured={adManagerConfigured}
          />
        )}

        {view === "actions" && <QuickActionsView />}
      </Suspense>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

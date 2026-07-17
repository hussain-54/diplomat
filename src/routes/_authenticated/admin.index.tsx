import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Bell,
  CircleAlert,
  Clock3,
  FileText,
  Radio,
} from "lucide-react";
import {
  getAnalyticsOverview,
  getDashboardMetrics,
  getMe,
  listDashboardArticles,
} from "@/lib/admin.functions";
import { getTicker } from "@/lib/content.functions";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  CmsStat,
  CmsStatus,
} from "@/components/cms-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveVisitors } from "@/hooks/useLiveVisitors";
import { useNewsroomRealtime } from "@/hooks/useNewsroomRealtime";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "dashboard:view"),
  component: Overview,
});

function Overview() {
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
  const { count: liveVisitors, connected: presenceConnected } = useLiveVisitors();
  const realtimeConnected = useNewsroomRealtime();

  const list = articles.data ?? [];
  const review = list.filter((a) => a.status === "review");
  const pendingComments = (analytics.data?.comments ?? []).filter(
    (comment) => comment.status === "pending",
  ).length;
  const breakingAlerts = alerts.data ?? [];
  const recent = list.slice(0, 6);
  const isLoading =
    me.isLoading ||
    articles.isLoading ||
    alerts.isLoading ||
    metrics.isLoading ||
    (canViewAnalytics && analytics.isLoading);
  const error = me.error ?? articles.error ?? alerts.error ?? metrics.error ?? analytics.error;
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={dateLabel}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${me.data?.profile?.name?.split(" ")[0] ?? "editor"}`}
        description="A live view of publishing, editorial workflow, and audience activity."
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CmsStat
          label="Published Today"
          value={metrics.data?.publishedToday ?? 0}
          detail="Stories published since midnight"
          trend={metrics.data?.publishedToday ? "up" : "neutral"}
        />
        <CmsStat
          label="Pending Review"
          value={metrics.data?.pendingReview ?? 0}
          detail="Awaiting an editorial decision"
          trend={review.length ? "down" : "neutral"}
        />
        <CmsStat
          label="Live Visitors"
          value={presenceConnected ? liveVisitors : "—"}
          detail={presenceConnected ? "Readers currently on the site" : "Connecting to presence"}
          trend={liveVisitors > 0 ? "up" : "neutral"}
        />
        <CmsStat
          label="Breaking Alerts"
          value={breakingAlerts.length}
          detail="Active ticker alerts"
          trend={breakingAlerts.length ? "up" : "neutral"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <CmsPanel
          title="Recent Articles"
          description="Latest newsroom stories by update time"
          action={
            canViewArticles ? (
              <Link
                to="/admin/articles"
                className="flex items-center gap-1 text-xs font-semibold text-cat-blue"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        >
          <div className="divide-y divide-border">
            {!recent.length ? (
              <CmsEmptyState
                title="No recent articles"
                description="New and updated newsroom stories will appear here."
              />
            ) : (
              recent.map((article) => {
                const content = (
                  <>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{article.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" /> {new Date(article.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{sectionName(article.sections)}</span>
                  <CmsStatus tone={statusTone(article.status)}>{article.status}</CmsStatus>
                  </>
                );
                return canViewArticles ? (
                  <Link
                    key={article.id}
                    to="/admin/articles/$id"
                    params={{ id: article.id }}
                    className="grid gap-3 px-5 py-4 hover:bg-muted/30 sm:grid-cols-[1fr_150px_110px]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={article.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_150px_110px]"
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </CmsPanel>

        <CmsPanel title="Notifications" description="Items requiring newsroom attention">
          <div className="divide-y divide-border">
            <Notification
              icon={CircleAlert}
              label="Editorial review"
              detail={`${review.length} ${review.length === 1 ? "story" : "stories"} waiting`}
              active={review.length > 0}
            />
            <Notification
              icon={Bell}
              label="Comment moderation"
              detail={
                canViewAnalytics
                  ? `${pendingComments} pending ${pendingComments === 1 ? "comment" : "comments"}`
                  : "Not available for your role"
              }
              active={pendingComments > 0}
            />
            <Notification
              icon={Radio}
              label="Breaking news"
              detail={`${breakingAlerts.length} active ${breakingAlerts.length === 1 ? "alert" : "alerts"}`}
              active={breakingAlerts.length > 0}
            />
            <Notification
              icon={Activity}
              label="Realtime connection"
              detail={realtimeConnected ? "Dashboard is synchronized" : "Reconnecting"}
              active={!realtimeConnected}
            />
          </div>
        </CmsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Editorial Queue" description="Stories submitted for review">
          {!review.length ? (
            <CmsEmptyState
              title="Review queue is clear"
              description="Submitted stories will appear here automatically."
            />
          ) : (
            <div className="divide-y divide-border">
              {review.slice(0, 6).map((article) => (
                <div key={article.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{article.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {sectionName(article.sections)}
                    </div>
                  </div>
                  <CmsStatus tone="warning">Review</CmsStatus>
                  {canViewArticles && (
                    <Link
                      to="/admin/articles/$id"
                      params={{ id: article.id }}
                      className="text-xs font-semibold text-cat-blue"
                    >
                      Open
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CmsPanel>

        <CmsPanel title="Recent Activity" description="Latest publishing workflow changes">
          {!recent.length ? (
            <CmsEmptyState
              title="No newsroom activity"
              description="Article changes will be recorded here."
            />
          ) : (
            <div className="divide-y divide-border">
              {recent.map((article) => (
                <div key={article.id} className="flex gap-3 px-5 py-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cat-blue" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      <span className="font-semibold">{article.title}</span>{" "}
                      <span className="text-muted-foreground">is {article.status}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(article.updated_at).toLocaleString()} · {sectionName(article.sections)}
                    </div>
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

function sectionName(
  section: { name?: string } | { name?: string }[] | null | undefined,
) {
  return (Array.isArray(section) ? section[0]?.name : section?.name) ?? "Unassigned";
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "review") return "warning";
  return "neutral";
}

function Notification({
  icon: Icon,
  label,
  detail,
  active,
}: {
  icon: typeof Bell;
  label: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className={`flex h-8 w-8 items-center justify-center ${active ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</div>
      </div>
      {active && <span className="h-2 w-2 rounded-full bg-crimson" />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading newsroom dashboard">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
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

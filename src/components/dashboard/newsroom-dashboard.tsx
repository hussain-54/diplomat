import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  ArrowRight,
  Bell,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  Clock3,
  Eye,
  FilePenLine,
  FilePlus2,
  FileText,
  Radio,
  Users,
} from "lucide-react";
import {
  CmsEmptyState,
  CmsPanel,
  cmsButton,
} from "@/components/cms-ui";
import {
  MetricCard,
  SegmentedControl,
  SegmentedItem,
  StatusBadge,
} from "@/components/cms";
import { AreaTrendChart, ChartCard } from "@/components/dashboard/chart-card";
import { cn } from "@/lib/utils";

import {
  DASHBOARD_VIEWS,
  authorName,
  sectionName,
  type DashboardArticle,
  type DashboardView,
} from "@/components/dashboard/types";

export type { DashboardArticle, DashboardView } from "@/components/dashboard/types";
export { DASHBOARD_VIEWS, sectionName, authorName } from "@/components/dashboard/types";

export function DashboardViewTabs({
  active,
  onChange,
  badges,
}: {
  active: DashboardView;
  onChange: (view: DashboardView) => void;
  badges?: Partial<Record<DashboardView, number>>;
}) {
  return (
    <SegmentedControl className="w-full overflow-x-auto sm:w-auto">
      {DASHBOARD_VIEWS.map((view) => {
        const Icon = view.icon;
        const badge = badges?.[view.id] ?? 0;
        return (
          <SegmentedItem
            key={view.id}
            active={active === view.id}
            onClick={() => onChange(view.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
            <span className="sm:hidden">{view.label.split(" ")[0]}</span>
            {badge > 0 ? (
              <span
                className={cn(
                  "cms-metric rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active === view.id
                    ? "bg-primary/15 text-primary"
                    : "bg-foreground/10 text-muted-foreground",
                )}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </SegmentedItem>
        );
      })}
    </SegmentedControl>
  );
}

function ArticleRow({
  article,
  canOpen,
  trailing,
}: {
  article: DashboardArticle;
  canOpen: boolean;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{article.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {new Date(article.updated_at).toLocaleString()}
          </span>
          <span>{sectionName(article.sections)}</span>
          <span>{authorName(article.author)}</span>
        </div>
      </div>
      <StatusBadge status={article.status}>{article.status}</StatusBadge>
      {trailing}
    </>
  );

  if (!canOpen) {
    return (
      <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        {content}
      </div>
    );
  }

  return (
    <Link
      to="/admin/articles/$id"
      params={{ id: article.id }}
      className="grid gap-3 px-5 py-4 cms-transition hover:bg-accent/50 sm:grid-cols-[1fr_auto_auto] sm:items-center"
    >
      {content}
    </Link>
  );
}

function MiniBar({
  label,
  value,
  max,
  tone = "bg-foreground/80",
}: {
  label: string;
  value: number;
  max: number;
  tone?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="cms-metric tabular-nums text-muted-foreground">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full cms-transition", tone)}
          style={{ width: `${Math.max((value / max) * 100, value ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export function OverviewView({
  metrics,
  liveVisitors,
  presenceConnected,
  articles,
  review,
  alerts,
  pendingComments,
  realtimeConnected,
  canViewArticles,
  canCreateArticles,
  adManagerConfigured,
  dailyRows,
  topStories,
}: {
  metrics: {
    totalArticles: number;
    publishedTotal: number;
    publishedToday: number;
    pendingReview: number;
    drafts: number;
    scheduled: number;
    activeAuthors: number;
    monthlyViews: number;
    archived: number;
  };
  liveVisitors: number | string;
  presenceConnected: boolean;
  articles: DashboardArticle[];
  review: DashboardArticle[];
  alerts: unknown[];
  pendingComments: number;
  realtimeConnected: boolean;
  canViewArticles: boolean;
  canCreateArticles: boolean;
  adManagerConfigured: boolean;
  dailyRows: Array<[string, number]>;
  topStories: Array<{ title: string; views: number }>;
}) {
  const recentPublished = articles
    .filter((a) => a.status === "published")
    .slice(0, 6);
  const activity = articles.slice(0, 10);

  const categoryCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();
  for (const article of articles) {
    const cat = sectionName(article.sections);
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    const author = authorName(article.author);
    if (author !== "Unassigned") {
      authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
    }
  }
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topAuthors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCategory = Math.max(...topCategories.map(([, n]) => n), 1);
  const maxAuthor = Math.max(...topAuthors.map(([, n]) => n), 1);
  const publishRate =
    metrics.totalArticles > 0
      ? Math.round((metrics.publishedTotal / metrics.totalArticles) * 100)
      : 0;
  const backlog = metrics.pendingReview + metrics.drafts + metrics.scheduled;
  const hasTraffic = dailyRows.some(([, v]) => v > 0);
  const trend = dailyRows.map(([label, value]) => ({
    label: new Date(`${label}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    views: value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Published"
          value={metrics.publishedTotal}
          icon={FileText}
          detail={`${metrics.publishedToday} today`}
          trend={metrics.publishedToday ? "up" : "neutral"}
        />
        <MetricCard
          label="Drafts"
          value={metrics.drafts}
          icon={FilePenLine}
          detail="In progress"
        />
        <MetricCard
          label="Pending review"
          value={metrics.pendingReview}
          icon={ClipboardList}
          detail="Editorial queue"
          trend={metrics.pendingReview ? "down" : "neutral"}
        />
        <MetricCard
          label="Scheduled"
          value={metrics.scheduled}
          icon={CalendarClock}
          detail="Awaiting publish"
        />
        <MetricCard
          label="Monthly traffic"
          value={metrics.monthlyViews.toLocaleString()}
          icon={Eye}
          detail="Pageviews · 30d"
          trend={metrics.monthlyViews ? "up" : "neutral"}
        />
        <MetricCard
          label="Active authors"
          value={metrics.activeAuthors}
          icon={Users}
          detail={`${metrics.totalArticles} stories total`}
          trend={metrics.activeAuthors ? "up" : "neutral"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <CmsPanel
          title="Recent activity"
          description="Latest editorial movements across the desk"
          action={
            canViewArticles ? (
              <Link
                to="/admin/articles/all"
                className="flex items-center gap-1 text-xs font-semibold text-primary"
              >
                Open library <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        >
          <div className="divide-y divide-border/70">
            {!activity.length ? (
              <CmsEmptyState
                title="No activity yet"
                description="Article updates will stream into this feed."
              />
            ) : (
              activity.map((article) => (
                <ActivityFeedRow
                  key={article.id}
                  article={article}
                  canOpen={canViewArticles}
                />
              ))
            )}
          </div>
        </CmsPanel>

        <CmsPanel
          title="Recent publications"
          description="Stories live on the site"
          action={
            canViewArticles ? (
              <Link
                to="/admin/articles/published"
                className="flex items-center gap-1 text-xs font-semibold text-primary"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        >
          <div className="divide-y divide-border/70">
            {!recentPublished.length ? (
              <CmsEmptyState
                title="No publications yet"
                description="Published stories will appear here."
              />
            ) : (
              recentPublished.map((article) => (
                <ArticleRow key={article.id} article={article} canOpen={canViewArticles} />
              ))
            )}
          </div>
        </CmsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <CmsPanel title="Top categories" description="By story volume">
          <div className="space-y-3 p-5">
            {!topCategories.length ? (
              <CmsEmptyState title="No categories" description="Assign sections to stories." />
            ) : (
              topCategories.map(([name, count]) => (
                <MiniBar key={name} label={name} value={count} max={maxCategory} tone="bg-primary" />
              ))
            )}
          </div>
        </CmsPanel>

        <CmsPanel title="Top authors" description="By assigned articles">
          <div className="space-y-3 p-5">
            {!topAuthors.length ? (
              <CmsEmptyState title="No authors" description="Assign bylines to populate." />
            ) : (
              topAuthors.map(([name, count]) => (
                <MiniBar
                  key={name}
                  label={name}
                  value={count}
                  max={maxAuthor}
                  tone="bg-cat-indigo"
                />
              ))
            )}
          </div>
        </CmsPanel>

        <CmsPanel title="Quick stats" description="Operational snapshot">
          <div className="divide-y divide-border/70">
            <QuickStatRow label="Publish rate" value={`${publishRate}%`} detail="Published / total" />
            <QuickStatRow
              label="Editorial backlog"
              value={String(backlog)}
              detail="Draft + review + scheduled"
            />
            <QuickStatRow
              label="Archived"
              value={String(metrics.archived)}
              detail="Library archive"
            />
            <QuickStatRow
              label="Live visitors"
              value={presenceConnected ? String(liveVisitors) : "—"}
              detail={presenceConnected ? "On site now" : "Presence offline"}
            />
            <QuickStatRow
              label="Pending comments"
              value={String(pendingComments)}
              detail="Awaiting moderation"
            />
            <QuickStatRow
              label="Breaking alerts"
              value={String(alerts.length)}
              detail="Active ticker items"
            />
          </div>
        </CmsPanel>

        <CmsPanel title="Attention" description="Needs action now">
          <div className="divide-y divide-border/70">
            <AttentionRow
              icon={CircleAlert}
              label="Editorial review"
              detail={`${review.length} waiting`}
              active={review.length > 0}
              href="/admin/articles/review"
            />
            <AttentionRow
              icon={Bell}
              label="Comments"
              detail={`${pendingComments} pending`}
              active={pendingComments > 0}
              href="/admin/comments"
            />
            <AttentionRow
              icon={Radio}
              label="Breaking"
              detail={`${alerts.length} alerts`}
              active={alerts.length > 0}
            />
            <AttentionRow
              icon={Activity}
              label="Realtime"
              detail={realtimeConnected ? "Synchronized" : "Reconnecting"}
              active={!realtimeConnected}
            />
            <AttentionRow
              icon={Archive}
              label="Revenue"
              detail={
                adManagerConfigured ? "GAM linked · reports pending" : "Connect Ad Manager"
              }
              active={!adManagerConfigured}
              href="/admin/settings"
            />
          </div>
          {canCreateArticles ? (
            <div className="border-t border-border/70 p-4">
              <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                <FilePlus2 className="h-4 w-4" /> New article
              </Link>
            </div>
          ) : null}
        </CmsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <ChartCard
          title="Performance snapshot"
          description="Traffic over the last 30 days"
          empty={!hasTraffic}
          emptyTitle="No traffic data yet"
          emptyDescription="Daily pageviews will chart here as analytics accumulate."
        >
          <div className="p-2 sm:p-4">
            <AreaTrendChart
              data={trend}
              dataKey="views"
              config={{ views: { label: "Views", color: "var(--color-primary)" } }}
            />
            <div className="mt-2 flex justify-between px-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <span>{dailyRows[0]?.[0] ?? "—"}</span>
              <span className="cms-metric text-foreground">
                {metrics.monthlyViews.toLocaleString()} views · 30d
              </span>
              <span>{dailyRows[dailyRows.length - 1]?.[0] ?? "—"}</span>
            </div>
          </div>
        </ChartCard>

        <CmsPanel title="Top stories" description="By views this period">
          <div className="divide-y divide-border/70">
            {!topStories.length ? (
              <CmsEmptyState
                title="No view leaders"
                description="Story rankings appear with traffic."
              />
            ) : (
              topStories.slice(0, 6).map((story, index) => (
                <div
                  key={`${story.title}-${index}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="cms-metric flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="truncate text-sm font-semibold text-foreground">
                      {story.title}
                    </div>
                  </div>
                  <div className="cms-metric shrink-0 text-sm font-semibold text-foreground">
                    {story.views.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CmsPanel>
      </div>
    </div>
  );
}

function ActivityFeedRow({
  article,
  canOpen,
}: {
  article: DashboardArticle;
  canOpen: boolean;
}) {
  const verb =
    article.status === "published"
      ? "Published"
      : article.status === "review"
        ? "Submitted for review"
        : article.status === "scheduled"
          ? "Scheduled"
          : article.status === "archived"
            ? "Archived"
            : "Updated draft";

  const dotTone =
    article.status === "published"
      ? "bg-cat-green"
      : article.status === "review"
        ? "bg-cat-amber"
        : article.status === "scheduled"
          ? "bg-cat-sky"
          : article.status === "archived"
            ? "bg-cat-purple"
            : "bg-muted-foreground/50";

  const body = (
    <>
      <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotTone)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">{verb}</span>
          {" · "}
          {article.title}
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>{sectionName(article.sections)}</span>
          <span>{authorName(article.author)}</span>
          <span className="cms-metric">{new Date(article.updated_at).toLocaleString()}</span>
        </div>
      </div>
      <StatusBadge status={article.status}>{article.status}</StatusBadge>
    </>
  );

  if (!canOpen) {
    return <div className="flex items-start gap-3 px-5 py-4">{body}</div>;
  }

  return (
    <Link
      to="/admin/articles/$id"
      params={{ id: article.id }}
      className="flex items-start gap-3 px-5 py-4 cms-transition hover:bg-primary/[0.03]"
    >
      {body}
    </Link>
  );
}

function QuickStatRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>
      </div>
      <div className="cms-metric shrink-0 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  label,
  detail,
  active,
  href,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  active: boolean;
  href?: string;
}) {
  const body = (
    <>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          active ? "bg-cat-amber/15 text-cat-amber" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
      </div>
      {active ? <span className="h-2 w-2 rounded-full bg-cat-rose" /> : null}
    </>
  );
  if (href) {
    return (
      <Link
        to={href}
        className="flex items-center gap-3 px-5 py-4 cms-transition hover:bg-primary/[0.03]"
      >
        {body}
      </Link>
    );
  }
  return <div className="flex items-center gap-3 px-5 py-4">{body}</div>;
}

export { EditorialView } from "@/components/dashboard/editorial-view";
export { SeoView } from "@/components/dashboard/seo-view";
export { AnalyticsView } from "@/components/dashboard/analytics-view";
export { RevenueView } from "@/components/dashboard/revenue-view";
export { RealtimeView } from "@/components/dashboard/realtime-view";
export { NotificationsView } from "@/components/dashboard/notifications-view";
export { QuickActionsView, FLOATING_QUICK_ACTIONS } from "@/components/dashboard/quick-actions-view";

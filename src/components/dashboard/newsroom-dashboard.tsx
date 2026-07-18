import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CircleAlert,
  Clock3,
  DollarSign,
  FilePlus2,
  FileText,
  FolderTree,
  Gauge,
  ImagePlus,
  LineChart,
  MessageSquareText,
  Radio,
  Search,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  CmsEmptyState,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms-ui";
import {
  MetricCard,
  NotificationCenter,
  RoleGuard,
  SegmentedControl,
  SegmentedItem,
  StatusBadge,
} from "@/components/cms";
import { cn } from "@/lib/utils";

export type DashboardView =
  | "overview"
  | "editorial"
  | "seo"
  | "analytics"
  | "revenue"
  | "realtime"
  | "notifications"
  | "actions";

export const DASHBOARD_VIEWS: Array<{ id: DashboardView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "editorial", label: "Editorial", icon: FileText },
  { id: "seo", label: "SEO", icon: Search },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "realtime", label: "Real-Time", icon: Radio },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "actions", label: "Quick Actions", icon: Zap },
];

export type DashboardArticle = {
  id: string;
  slug: string;
  title: string;
  status: string;
  badge_type?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  updated_at: string;
  section_id?: string | null;
  author_id?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  robots_index?: boolean | null;
  canonical_url?: string | null;
  sections?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
  author?: { name?: string | null } | { name?: string | null }[] | null;
};

export function sectionName(
  section: { name?: string } | { name?: string }[] | null | undefined,
) {
  return (Array.isArray(section) ? section[0]?.name : section?.name) ?? "Unassigned";
}

export function authorName(
  author: { name?: string | null } | { name?: string | null }[] | null | undefined,
) {
  return (Array.isArray(author) ? author[0]?.name : author?.name) ?? "Unassigned";
}

export function DashboardViewTabs({
  active,
  onChange,
}: {
  active: DashboardView;
  onChange: (view: DashboardView) => void;
}) {
  return (
    <SegmentedControl className="w-full sm:w-auto">
      {DASHBOARD_VIEWS.map((view) => {
        const Icon = view.icon;
        return (
          <SegmentedItem
            key={view.id}
            active={active === view.id}
            onClick={() => onChange(view.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
            <span className="sm:hidden">{view.label.split(" ")[0]}</span>
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
        <span className="tabular-nums text-muted-foreground">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 overflow-hidden bg-muted">
        <div
          className={cn("h-full cms-transition", tone)}
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
}: {
  metrics: {
    publishedToday: number;
    pendingReview: number;
    drafts: number;
    scheduled: number;
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
}) {
  const recent = articles.slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <MetricCard label="Published today" value={metrics.publishedToday} detail="Since midnight" trend={metrics.publishedToday ? "up" : "neutral"} />
        <MetricCard label="Pending review" value={metrics.pendingReview} detail="Editorial queue" trend={metrics.pendingReview ? "down" : "neutral"} />
        <MetricCard label="Drafts" value={metrics.drafts} detail="In progress" />
        <MetricCard label="Scheduled" value={metrics.scheduled} detail="Awaiting publish" />
        <MetricCard
          label="Live visitors"
          value={presenceConnected ? liveVisitors : "—"}
          detail={presenceConnected ? "On site now" : "Connecting"}
          trend={typeof liveVisitors === "number" && liveVisitors > 0 ? "up" : "neutral"}
        />
        <MetricCard label="Breaking alerts" value={alerts.length} detail="Active ticker" trend={alerts.length ? "up" : "neutral"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <CmsPanel
          title="Recent articles"
          description="Latest newsroom updates"
          action={
            canViewArticles ? (
              <Link to="/admin/articles" className="flex items-center gap-1 text-xs font-semibold text-cat-blue">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        >
          <div className="divide-y divide-border">
            {!recent.length ? (
              <CmsEmptyState title="No recent articles" description="Stories will appear as the newsroom publishes." />
            ) : (
              recent.map((article) => (
                <ArticleRow key={article.id} article={article} canOpen={canViewArticles} />
              ))
            )}
          </div>
        </CmsPanel>

        <div className="space-y-6">
          <CmsPanel title="Attention" description="What needs action now">
            <div className="divide-y divide-border">
              <AttentionRow
                icon={CircleAlert}
                label="Editorial review"
                detail={`${review.length} waiting`}
                active={review.length > 0}
                href="/admin/articles"
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
            </div>
          </CmsPanel>

          {canCreateArticles && (
            <CmsPanel title="Jump in" description="Start the next story">
              <div className="p-5">
                <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                  <FilePlus2 className="h-4 w-4" /> New article
                </Link>
              </div>
            </CmsPanel>
          )}
        </div>
      </div>
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
      <div className={cn("flex h-8 w-8 items-center justify-center", active ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
      </div>
      {active && <span className="h-2 w-2 rounded-full bg-crimson" />}
    </>
  );
  if (href) {
    return (
      <Link to={href} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30">
        {body}
      </Link>
    );
  }
  return <div className="flex items-center gap-3 px-5 py-4">{body}</div>;
}

export function EditorialView({
  articles,
  metrics,
  canViewArticles,
}: {
  articles: DashboardArticle[];
  metrics: { pendingReview: number; drafts: number; scheduled: number; archived: number };
  canViewArticles: boolean;
}) {
  const byStatus = {
    review: articles.filter((a) => a.status === "review"),
    draft: articles.filter((a) => a.status === "draft"),
    scheduled: articles.filter((a) => a.status === "scheduled"),
    published: articles.filter((a) => a.status === "published").slice(0, 8),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="In review" value={metrics.pendingReview} detail="Needs decision" trend={metrics.pendingReview ? "down" : "neutral"} />
        <MetricCard label="Drafts" value={metrics.drafts} detail="Being written" />
        <MetricCard label="Scheduled" value={metrics.scheduled} detail="Ready to go live" />
        <MetricCard label="Archived" value={metrics.archived} detail="Retired stories" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Review queue" description="Stories waiting for editorial sign-off">
          <QueueList items={byStatus.review} canOpen={canViewArticles} empty="Review queue is clear" />
        </CmsPanel>
        <CmsPanel title="Scheduled pipeline" description="Timed for publication">
          <QueueList
            items={byStatus.scheduled}
            canOpen={canViewArticles}
            empty="Nothing scheduled"
            showSchedule
          />
        </CmsPanel>
        <CmsPanel title="Active drafts" description="Work in progress">
          <QueueList items={byStatus.draft.slice(0, 8)} canOpen={canViewArticles} empty="No drafts" />
        </CmsPanel>
        <CmsPanel title="Recently published" description="Latest live stories">
          <QueueList items={byStatus.published} canOpen={canViewArticles} empty="No published stories yet" />
        </CmsPanel>
      </div>
    </div>
  );
}

function QueueList({
  items,
  canOpen,
  empty,
  showSchedule,
}: {
  items: DashboardArticle[];
  canOpen: boolean;
  empty: string;
  showSchedule?: boolean;
}) {
  if (!items.length) {
    return <CmsEmptyState title={empty} description="The queue updates as the newsroom works." />;
  }
  return (
    <div className="divide-y divide-border">
      {items.map((article) => (
        <ArticleRow
          key={article.id}
          article={article}
          canOpen={canOpen}
          trailing={
            showSchedule && article.scheduled_at ? (
              <span className="text-[11px] text-muted-foreground">
                {new Date(article.scheduled_at).toLocaleString()}
              </span>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}

export function SeoView({
  articles,
  canViewArticles,
}: {
  articles: DashboardArticle[];
  canViewArticles: boolean;
}) {
  const missingTitle = articles.filter((a) => !a.seo_title?.trim());
  const missingDesc = articles.filter((a) => !a.meta_description?.trim());
  const missingKeyword = articles.filter((a) => !a.focus_keyword?.trim());
  const noindex = articles.filter((a) => a.robots_index === false);
  const issues = articles.filter(
    (a) => !a.seo_title?.trim() || !a.meta_description?.trim() || !a.focus_keyword?.trim() || a.robots_index === false,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Missing SEO title" value={missingTitle.length} detail="Fallback to headline" trend={missingTitle.length ? "down" : "up"} />
        <MetricCard label="Missing description" value={missingDesc.length} detail="Weak SERP snippets" trend={missingDesc.length ? "down" : "up"} />
        <MetricCard label="No focus keyword" value={missingKeyword.length} detail="Unoptimized stories" />
        <MetricCard label="Noindex pages" value={noindex.length} detail="Hidden from search" trend={noindex.length ? "down" : "neutral"} />
      </div>

      <CmsPanel title="SEO opportunities" description="Stories that need metadata attention">
        {!issues.length ? (
          <CmsEmptyState title="SEO looks healthy" description="Recent stories have titles, descriptions, and keywords." />
        ) : (
          <div className="divide-y divide-border">
            {issues.slice(0, 12).map((article) => {
              const gaps = [
                !article.seo_title?.trim() && "title",
                !article.meta_description?.trim() && "description",
                !article.focus_keyword?.trim() && "keyword",
                article.robots_index === false && "noindex",
              ].filter(Boolean);
              return (
                <ArticleRow
                  key={article.id}
                  article={article}
                  canOpen={canViewArticles}
                  trailing={
                    <div className="flex flex-wrap gap-1">
                      {gaps.map((gap) => (
                        <CmsStatus key={String(gap)} tone="warning">
                          {gap}
                        </CmsStatus>
                      ))}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

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
  const maxDaily = Math.max(...dailyRows.map(([, views]) => views), 1);
  const maxSection = Math.max(...sectionCounts.map(([, count]) => count), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Article views" value={totalViews.toLocaleString()} detail="Rolling 30 days" />
        <MetricCard label="Published" value={published} detail="This period" trend="up" />
        <MetricCard label="Comments" value={commentCount} detail={`${pendingComments} awaiting review`} />
        <MetricCard
          label="Avg views / story"
          value={published ? Math.round(totalViews / published).toLocaleString() : "0"}
          detail="Published this period"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.5fr)]">
        <CmsPanel title="Audience trend" description="Daily views · last 30 days">
          <div className="p-5">
            <div className="flex h-56 items-end gap-1 border-b border-l border-border px-2 pt-4">
              {dailyRows.map(([date, views], index) => (
                <div key={date} className="group relative flex h-full min-w-0 flex-1 items-end">
                  <div
                    className="w-full bg-foreground/80 transition-colors group-hover:bg-cat-blue"
                    style={{ height: `${Math.max((views / maxDaily) * 100, views ? 3 : 0)}%` }}
                  />
                  {index % 7 === 0 && (
                    <span className="absolute top-full mt-2 text-[9px] text-muted-foreground">
                      {new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CmsPanel>
        <CmsPanel title="Output by category" description="Stories created this period">
          <div className="space-y-4 p-5">
            {sectionCounts.length ? (
              sectionCounts.map(([name, count]) => (
                <MiniBar key={name} label={name} value={count} max={maxSection} tone="bg-cat-blue" />
              ))
            ) : (
              <CmsEmptyState title="No category data" description="Publish stories to populate this chart." />
            )}
          </div>
        </CmsPanel>
      </div>

      <CmsPanel title="Top stories" description="Ranked by views">
        {!topStories.length ? (
          <CmsEmptyState title="No view data yet" description="Article traffic will appear here." />
        ) : (
          <div className="divide-y divide-border">
            {topStories.map((story, index) => (
              <div key={`${story.title}-${index}`} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{story.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">#{index + 1} this period</div>
                </div>
                <div className="tabular-nums text-sm font-semibold text-foreground">
                  {story.views.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

export function RevenueView({
  adManagerCode,
  totalViews,
  published,
}: {
  adManagerCode?: string | null;
  totalViews: number;
  published: number;
}) {
  const configured = Boolean(adManagerCode?.trim());
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ad Manager"
          value={configured ? "Connected" : "Not set"}
          detail={configured ? adManagerCode! : "Add network code in Settings"}
          trend={configured ? "up" : "neutral"}
        />
        <MetricCard label="Inventory proxy" value={totalViews.toLocaleString()} detail="30-day page views" />
        <MetricCard label="Monetizable stories" value={published} detail="Published this period" />
        <MetricCard label="RPM" value="—" detail="Connect GAM reporting to populate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Revenue readiness" description="Enterprise ad stack configuration">
          <div className="space-y-4 p-5 text-sm">
            <div className="flex items-center justify-between border border-border px-4 py-3">
              <span>Google Ad Manager network</span>
              <StatusBadge tone={configured ? "success" : "warning"}>
                {configured ? "Configured" : "Missing"}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between border border-border px-4 py-3">
              <span>Revenue reporting API</span>
              <StatusBadge tone="neutral">Pending integration</StatusBadge>
            </div>
            <div className="flex items-center justify-between border border-border px-4 py-3">
              <span>Audience inventory signal</span>
              <StatusBadge tone={totalViews > 0 ? "success" : "warning"}>
                {totalViews > 0 ? "Receiving views" : "No traffic yet"}
              </StatusBadge>
            </div>
            <RoleGuard permission="settings:manage">
              <Link to="/admin/settings" className={cmsSecondaryButton}>
                <Settings className="h-4 w-4" /> Open integrations
              </Link>
            </RoleGuard>
          </div>
        </CmsPanel>
        <CmsPanel title="Notes" description="How revenue is handled in this CMS">
          <div className="space-y-3 p-5 text-sm text-muted-foreground">
            <p>
              Revenue figures are not invented. Configure Google Ad Manager under Settings → Integrations,
              then connect reporting credentials via environment variables for live RPM/revenue.
            </p>
            <p>
              Until then, this board tracks readiness and uses page-view volume as an inventory proxy for
              editorial planning.
            </p>
          </div>
        </CmsPanel>
      </div>
    </div>
  );
}

export function RealtimeView({
  liveVisitors,
  presenceConnected,
  realtimeConnected,
  alerts,
  publishedToday,
  recentPublished,
  canViewArticles,
}: {
  liveVisitors: number;
  presenceConnected: boolean;
  realtimeConnected: boolean;
  alerts: Array<{ id?: string; text?: string; tag?: string | null }>;
  publishedToday: number;
  recentPublished: DashboardArticle[];
  canViewArticles: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Live visitors"
          value={presenceConnected ? liveVisitors : "—"}
          detail={presenceConnected ? "Presence channel" : "Connecting"}
          trend={liveVisitors > 0 ? "up" : "neutral"}
        />
        <MetricCard
          label="Realtime feed"
          value={realtimeConnected ? "Online" : "Offline"}
          detail="Articles · comments · metrics"
          trend={realtimeConnected ? "up" : "down"}
        />
        <MetricCard label="Published today" value={publishedToday} detail="Live output" />
        <MetricCard label="Ticker alerts" value={alerts.length} detail="Breaking desk" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Live wire" description="Active breaking alerts">
          {!alerts.length ? (
            <CmsEmptyState title="Wire is quiet" description="Ticker alerts will stream here." />
          ) : (
            <div className="divide-y divide-border">
              {alerts.slice(0, 10).map((alert, index) => (
                <div key={alert.id ?? index} className="flex items-start gap-3 px-5 py-4">
                  <Radio className="mt-0.5 h-4 w-4 text-crimson" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{alert.text}</div>
                    {alert.tag && (
                      <div className="mt-1">
                        <CmsStatus tone="danger">{alert.tag}</CmsStatus>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CmsPanel>
        <CmsPanel title="Just published" description="Freshly live stories">
          <QueueList
            items={recentPublished}
            canOpen={canViewArticles}
            empty="No publishes yet today"
          />
        </CmsPanel>
      </div>
    </div>
  );
}

export function NotificationsView({
  reviewCount,
  pendingComments,
  flaggedComments,
  alertCount,
  realtimeConnected,
}: {
  reviewCount: number;
  pendingComments: number;
  flaggedComments: number;
  alertCount: number;
  realtimeConnected: boolean;
}) {
  return (
    <NotificationCenter
      title="Notification center"
      description="Editorial, moderation, and system signals"
      items={[
        {
          id: "review",
          icon: CircleAlert,
          label: "Editorial review",
          detail: `${reviewCount} ${reviewCount === 1 ? "story" : "stories"} waiting`,
          active: reviewCount > 0,
          href: "/admin/articles",
        },
        {
          id: "comments",
          icon: MessageSquareText,
          label: "Comment moderation",
          detail: `${pendingComments} pending · ${flaggedComments} flagged`,
          active: pendingComments + flaggedComments > 0,
          href: "/admin/comments",
        },
        {
          id: "breaking",
          icon: Radio,
          label: "Breaking news desk",
          detail: `${alertCount} active ticker ${alertCount === 1 ? "alert" : "alerts"}`,
          active: alertCount > 0,
        },
        {
          id: "realtime",
          icon: Activity,
          label: "Realtime connection",
          detail: realtimeConnected ? "Dashboard synchronized" : "Reconnecting to live channels",
          active: !realtimeConnected,
        },
      ]}
    />
  );
}

export function QuickActionsView() {
  const actions: Array<{
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    permission?: Parameters<typeof RoleGuard>[0]["permission"];
    params?: Record<string, string>;
  }> = [
    {
      title: "New article",
      description: "Open the block editor and start a draft",
      href: "/admin/articles/$id",
      params: { id: "new" },
      icon: FilePlus2,
      permission: "articles:create",
    },
    {
      title: "Moderate comments",
      description: "Clear the pending and flagged queues",
      href: "/admin/comments",
      icon: MessageSquareText,
      permission: "comments:moderate",
    },
    {
      title: "Upload media",
      description: "Add assets to the digital library",
      href: "/admin/media",
      icon: ImagePlus,
      permission: "media:upload",
    },
    {
      title: "Manage categories",
      description: "Reorder taxonomy and visibility",
      href: "/admin/categories",
      icon: FolderTree,
      permission: "categories:manage",
    },
    {
      title: "Staff directory",
      description: "Invite editors and assign roles",
      href: "/admin/staff",
      icon: Users,
      permission: "staff:manage",
    },
    {
      title: "Analytics",
      description: "Open the full 30-day performance board",
      href: "/admin/analytics",
      icon: BarChart3,
      permission: "analytics:view",
    },
    {
      title: "Settings",
      description: "Integrations, SEO defaults, security",
      href: "/admin/settings",
      icon: Settings,
      permission: "settings:manage",
    },
    {
      title: "All articles",
      description: "Filter, bulk manage, and publish",
      href: "/admin/articles",
      icon: Sparkles,
      permission: "articles:view",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        const card = (
          <Link
            to={action.href}
            params={action.params}
            className="group border border-border bg-card p-5 shadow-[var(--cms-shadow)] cms-transition hover:border-foreground/20 hover:shadow-[var(--cms-shadow-hover)]"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-muted text-foreground group-hover:bg-foreground group-hover:text-background">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-4 text-sm font-semibold text-foreground">{action.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
          </Link>
        );
        if (!action.permission) return <div key={action.title}>{card}</div>;
        return (
          <RoleGuard key={action.title} permission={action.permission}>
            {card}
          </RoleGuard>
        );
      })}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  ClipboardList,
  FilePenLine,
  FilePlus2,
  FileText,
  List,
} from "lucide-react";
import { getDashboardMetrics, getMe, listAdminArticles } from "@/lib/admin.functions";
import { CmsAlert, CmsPageHeader, CmsPanel, MetricCard, cmsButton } from "@/components/cms";
import { hasPermission } from "@/lib/permissions";

export function ArticlesDashboardPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 60_000 });
  const metrics = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: getDashboardMetrics,
    staleTime: 30_000,
  });
  const articles = useQuery({
    queryKey: ["admin-articles"],
    queryFn: listAdminArticles,
    staleTime: 30_000,
  });

  const canCreate = hasPermission(me.data?.roles, "articles:create");
  const recent = (articles.data ?? []).slice(0, 6);
  const review = (articles.data ?? []).filter((a) => a.status === "review").slice(0, 5);

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Content · Articles"
        title="Articles dashboard"
        description="Newsroom content overview — queues, output, and quick entry points."
        actions={
          canCreate ? (
            <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
              <FilePlus2 className="h-4 w-4" /> Create article
            </Link>
          ) : null
        }
      />

      {metrics.error ? <CmsAlert>{metrics.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Published"
          value={metrics.data?.publishedTotal ?? 0}
          detail={`${metrics.data?.publishedToday ?? 0} today`}
          trend={metrics.data?.publishedToday ? "up" : "neutral"}
        />
        <MetricCard label="Drafts" value={metrics.data?.drafts ?? 0} detail="In progress" />
        <MetricCard
          label="Pending review"
          value={metrics.data?.pendingReview ?? 0}
          detail="Editorial queue"
          trend={metrics.data?.pendingReview ? "down" : "neutral"}
        />
        <MetricCard label="Scheduled" value={metrics.data?.scheduled ?? 0} detail="Timed publishes" />
        <MetricCard
          label="Views · 30d"
          value={(metrics.data?.monthlyViews ?? 0).toLocaleString()}
          detail="Traffic proxy"
          trend={metrics.data?.monthlyViews ? "up" : "neutral"}
        />
        <MetricCard
          label="Archived"
          value={metrics.data?.archived ?? 0}
          detail="Retired stories"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { to: "/admin/articles/all", label: "All Articles", icon: List },
          { to: "/admin/articles/drafts", label: "Drafts", icon: FilePenLine },
          { to: "/admin/articles/review", label: "Pending Review", icon: ClipboardList },
          { to: "/admin/articles/scheduled", label: "Scheduled", icon: CalendarClock },
          { to: "/admin/articles/published", label: "Published", icon: FileText },
          { to: "/admin/articles/archived", label: "Archived", icon: Archive },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 border border-border bg-card p-4 cms-transition hover:border-foreground/20 hover:shadow-[var(--cms-shadow-hover)]"
            >
              <div className="flex h-9 w-9 items-center justify-center bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Editorial queue" description="Stories waiting in review">
          <div className="divide-y divide-border">
            {!review.length ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Review queue is clear.
              </div>
            ) : (
              review.map((article) => (
                <Link
                  key={article.id}
                  to="/admin/articles/$id"
                  params={{ id: article.id }}
                  className="block px-5 py-3.5 cms-transition hover:bg-accent/50"
                >
                  <div className="truncate text-sm font-semibold">{article.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Updated {new Date(article.updated_at).toLocaleString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </CmsPanel>

        <CmsPanel title="Recently updated" description="Latest desk activity">
          <div className="divide-y divide-border">
            {!recent.length ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No articles yet.
              </div>
            ) : (
              recent.map((article) => (
                <Link
                  key={article.id}
                  to="/admin/articles/$id"
                  params={{ id: article.id }}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 cms-transition hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{article.title}</div>
                    <div className="mt-1 text-[11px] capitalize text-muted-foreground">
                      {article.status}
                    </div>
                  </div>
                  <div className="cms-metric shrink-0 text-[11px] text-muted-foreground">
                    {new Date(article.updated_at).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </CmsPanel>
      </div>
    </div>
  );
}

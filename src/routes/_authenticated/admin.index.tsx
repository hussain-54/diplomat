import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, FileText } from "lucide-react";
import { getAnalyticsOverview, getMe, listAdminArticles } from "@/lib/admin.functions";
import { CmsPageHeader, CmsPanel, CmsStat, CmsStatus } from "@/components/cms-ui";
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
    queryKey: ["admin-articles"],
    queryFn: () => listAdminArticles(),
    enabled: canViewArticles,
  });
  const analytics = useQuery({
    queryKey: ["cms-analytics"],
    queryFn: getAnalyticsOverview,
    enabled: canViewAnalytics,
  });
  const list = articles.data ?? [];
  const published = list.filter((a) => a.status === "published").length;
  const review = list.filter((a) => a.status === "review");
  const drafts = list.filter((a) => a.status === "draft").length;
  const views = (analytics.data?.metrics ?? []).reduce((sum, metric) => sum + metric.views, 0);
  const pendingComments = (analytics.data?.comments ?? []).filter((comment) => comment.status === "pending").length;
  const bySection: Record<string, number> = {};
  for (const a of list) {
    const section = a.sections as { name?: string } | { name?: string }[] | null | undefined;
    const name = Array.isArray(section)
      ? (section[0]?.name ?? "Unassigned")
      : (section?.name ?? "Unassigned");
    bySection[name] = (bySection[name] ?? 0) + 1;
  }
  const maxSection = Math.max(...Object.values(bySection), 1);
  const recent = list.slice(0, 8);
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={dateLabel}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${me.data?.profile?.name?.split(" ")[0] ?? "editor"}`}
        description="Your newsroom at a glance. Monitor the publishing queue, audience activity, and editorial output."
        actions={canCreateArticles ?
          <Link
            to="/admin/articles/$id"
            params={{ id: "new" }}
            className="inline-flex h-9 items-center gap-2 bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <FileText className="h-4 w-4" /> New article
          </Link>
        : null}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CmsStat label="Published" value={published} detail="All published stories" />
        <CmsStat label="In review" value={review.length} detail="Awaiting editorial decision" trend={review.length ? "down" : "neutral"} />
        <CmsStat label="Drafts" value={drafts} detail="Work currently in progress" />
        <CmsStat
          label={canViewAnalytics ? "30-day views" : "Your total stories"}
          value={canViewAnalytics ? views.toLocaleString() : list.length}
          detail={canViewAnalytics ? `${pendingComments} comments require review` : "Visible under your role"}
          trend={canViewAnalytics && views > 0 ? "up" : "neutral"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <CmsPanel
          title="Editorial queue"
          description="Stories currently awaiting review"
          action={
            <Link to="/admin/articles" className="flex items-center gap-1 text-xs font-semibold text-cat-blue">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="divide-y divide-border">
            {review.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-sm font-semibold text-foreground">Review queue is clear</div>
                <p className="mt-1 text-xs text-muted-foreground">New submissions will appear here.</p>
              </div>
            ) : (
              review.slice(0, 8).map((article) => (
                <Link
                  key={article.id}
                  to="/admin/articles/$id"
                  params={{ id: article.id }}
                  className="grid gap-3 px-5 py-4 hover:bg-muted/30 sm:grid-cols-[1fr_150px_130px]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{article.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" /> Updated {new Date(article.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(Array.isArray(article.sections)
                      ? article.sections[0]?.name
                      : (article.sections as { name?: string } | null)?.name) ?? "Unassigned"}
                  </span>
                  <CmsStatus tone="warning">In review</CmsStatus>
                </Link>
              ))
            )}
          </div>
        </CmsPanel>

        <CmsPanel title="Category output" description="All stories by editorial desk">
          <div className="space-y-4 p-5">
            {Object.entries(bySection)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1 bg-muted">
                    <div className="h-full bg-foreground/80" style={{ width: `${(count / maxSection) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </CmsPanel>
      </div>

      <CmsPanel title="Recent newsroom activity" description="Latest article updates across the desk">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Story</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((article) => (
                <tr key={article.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <Link
                      to="/admin/articles/$id"
                      params={{ id: article.id }}
                      className="font-semibold text-foreground hover:text-cat-blue"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {(Array.isArray(article.sections)
                      ? article.sections[0]?.name
                      : (article.sections as { name?: string } | null)?.name) ?? "Unassigned"}
                  </td>
                  <td className="px-5 py-4">
                    <CmsStatus
                      tone={article.status === "published" ? "success" : article.status === "review" ? "warning" : "neutral"}
                    >
                      {article.status}
                    </CmsStatus>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {new Date(article.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CmsPanel>
    </div>
  );
}

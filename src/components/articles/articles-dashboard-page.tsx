import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  FilePenLine,
  FilePlus2,
  FileText,
  List,
  Search,
  Sparkles,
} from "lucide-react";
import { getArticlesDashboardSnapshot, getMe } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  CmsPageSkeleton,
  MetricCard,
  StatusBadge,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { BarMetricChart, ChartCard } from "@/components/dashboard/chart-card";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function ArticlesDashboardPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 60_000 });
  const snapshot = useQuery({
    queryKey: ["articles-dashboard"],
    queryFn: getArticlesDashboardSnapshot,
    staleTime: 20_000,
  });

  const canCreate = hasPermission(me.data?.roles, "articles:create");
  const data = snapshot.data;
  const kpis = data?.kpis;

  if (snapshot.isLoading) {
    return <CmsPageSkeleton metrics={6} panels={3} />;
  }

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Content · Articles"
        title="Articles dashboard"
        description="Publishing health, editorial queues, and content performance across the desk."
        actions={
          canCreate ? (
            <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
              <FilePlus2 className="h-4 w-4" /> Create article
            </Link>
          ) : null
        }
      />

      {snapshot.error ? <CmsAlert>{snapshot.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label="Total Articles"
          value={(kpis?.published ?? 0) + (kpis?.drafts ?? 0) + (kpis?.pendingReview ?? 0) + (kpis?.scheduled ?? 0)}
          icon={FileText}
          detail="Active library"
        />
        <MetricCard
          label="Published"
          value={kpis?.published ?? 0}
          icon={FileText}
          changePercent={kpis?.publishedChange}
          detail={`${kpis?.publishedToday ?? 0} today`}
        />
        <MetricCard
          label="Drafts"
          value={kpis?.drafts ?? 0}
          icon={FilePenLine}
          changePercent={kpis?.draftsChange}
          detail="In progress"
        />
        <MetricCard
          label="Pending review"
          value={kpis?.pendingReview ?? 0}
          icon={ClipboardList}
          changePercent={kpis?.pendingReviewChange}
          detail="Editorial queue"
          trend={kpis?.pendingReview ? "down" : "neutral"}
        />
        <MetricCard
          label="Scheduled"
          value={kpis?.scheduled ?? 0}
          icon={CalendarClock}
          changePercent={kpis?.scheduledChange}
          detail="Timed publishes"
        />
        <MetricCard
          label="Views today"
          value={(kpis?.viewsToday ?? 0).toLocaleString()}
          icon={Eye}
          changePercent={kpis?.viewsTodayChange}
          detail="vs yesterday"
        />
      </div>

      <CmsPanel title="Article modules" description="Jump into newsroom workflows">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            { to: "/admin/articles/all", label: "All Articles", sub: "Library", icon: List },
            { to: "/admin/articles/$id", label: "Create Article", sub: "New story", icon: FilePlus2, params: { id: "new" }, createOnly: true },
            { to: "/admin/articles/drafts", label: "Drafts", sub: `${kpis?.drafts ?? 0} open`, icon: FilePenLine },
            { to: "/admin/articles/review", label: "Pending Review", sub: `${kpis?.pendingReview ?? 0} waiting`, icon: ClipboardList },
            { to: "/admin/articles/approved", label: "Approved", sub: "Ready to publish", icon: CheckCircle2 },
            { to: "/admin/articles/published", label: "Published", sub: `${kpis?.published ?? 0} live`, icon: FileText },
            { to: "/admin/articles/scheduled", label: "Scheduled", sub: `${kpis?.scheduled ?? 0} timed`, icon: CalendarClock },
            { to: "/admin/articles/archived", label: "Archived", sub: "Pipeline archive", icon: Archive },
            { to: "/admin/articles/trash", label: "Trash", sub: "Restore or purge", icon: Search },
            { to: "/admin/articles/ai-writing", label: "AI Writer", sub: "Assist desk", icon: Sparkles },
            { to: "/admin/articles/content-score", label: "Content Score", sub: "Quality", icon: Search },
            { to: "/admin/articles/workflow", label: "Workflow", sub: "Stages", icon: ClipboardList },
          ].map((item) => {
            if ("createOnly" in item && item.createOnly && !canCreate) return null;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                params={"params" in item ? item.params : undefined}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-3 shadow-sm cms-transition hover:border-foreground/20 hover:bg-accent/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.sub}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </CmsPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCard
          title="Publishing activity"
          description="Publishes per day · last 14 days"
          empty={!data?.publishingActivity.some((d) => d.count > 0)}
          emptyTitle="No publishes in range"
          emptyDescription="Scheduled and live output will chart here."
        >
          <BarMetricChart
            data={(data?.publishingActivity ?? []).map((row) => ({
              label: new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
              value: row.count,
            }))}
            config={{ value: { label: "Publishes", color: "var(--color-cat-blue)" } }}
          />
        </ChartCard>

        <CmsPanel title="Content health summary" description="Metadata coverage on recent stories">
          <div className="space-y-4 p-5">
            <HealthBar
              label="SEO health"
              value={data?.contentHealth.seoHealth ?? 0}
              max={100}
              tone={(data?.contentHealth.seoHealth ?? 0) >= 70 ? "bg-cat-green" : "bg-gold"}
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <HealthStat label="Strong (75+)" value={data?.contentHealth.seoStrong ?? 0} />
              <HealthStat label="Weak (<50)" value={data?.contentHealth.seoWeak ?? 0} />
              <HealthStat label="Missing meta" value={data?.contentHealth.missingMeta ?? 0} />
              <HealthStat label="Backlog" value={data?.contentHealth.backlog ?? 0} />
            </div>
            <Link to="/admin/articles/content-score" className={cmsSecondaryButton}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Open content score
            </Link>
          </div>
        </CmsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <CmsPanel
          title="Top performing articles"
          description="Views · last 7 days"
          action={
            <Link to="/admin/articles/published" className="text-xs font-semibold text-cat-blue">
              View published
            </Link>
          }
        >
          {!data?.topPerforming.length ? (
            <CmsEmptyState
              title="No traffic leaders yet"
              description="Pageviews will rank stories here."
            />
          ) : (
            <div className="divide-y divide-border">
              {data.topPerforming.map((story, index) => (
                <Link
                  key={story.id}
                  to="/admin/articles/$id"
                  params={{ id: story.id }}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 cms-transition hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      #{index + 1} {story.title}
                    </div>
                  </div>
                  <div className="cms-metric shrink-0 text-sm font-semibold">
                    {story.views.toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CmsPanel>

        <CmsPanel
          title="Editorial queue"
          description="Pending review"
          action={
            <Link to="/admin/articles/review" className="text-xs font-semibold text-cat-blue">
              Open queue
            </Link>
          }
        >
          {!data?.editorialQueue.length ? (
            <CmsEmptyState title="Queue clear" description="Nothing waiting for review." />
          ) : (
            <div className="divide-y divide-border">
              {data.editorialQueue.map((article) => (
                <Link
                  key={article.id}
                  to="/admin/articles/$id"
                  params={{ id: article.id }}
                  className="block px-5 py-3.5 cms-transition hover:bg-accent/50"
                >
                  <div className="truncate text-sm font-semibold">{article.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{article.author ?? "Unassigned"}</span>
                    <span className="cms-metric">
                      {new Date(article.updated_at).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CmsPanel>

        <CmsPanel title="Recently updated" description="Latest desk edits">
          {!data?.recentlyUpdated.length ? (
            <CmsEmptyState title="No activity" description="Edits will appear here." />
          ) : (
            <div className="divide-y divide-border">
              {data.recentlyUpdated.map((article) => (
                <Link
                  key={article.id}
                  to="/admin/articles/$id"
                  params={{ id: article.id }}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 cms-transition hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{article.title}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {article.section ?? "Unassigned"} · {article.author ?? "—"}
                    </div>
                  </div>
                  <StatusBadge status={article.status}>{article.status}</StatusBadge>
                </Link>
              ))}
            </div>
          )}
        </CmsPanel>
      </div>
    </div>
  );
}

function HealthBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="cms-metric font-semibold">{value}/{max}</span>
      </div>
      <div className="h-2 overflow-hidden bg-muted">
        <div
          className={cn("h-full cms-transition", tone)}
          style={{ width: `${Math.max((value / max) * 100, value ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function HealthStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="cms-metric mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

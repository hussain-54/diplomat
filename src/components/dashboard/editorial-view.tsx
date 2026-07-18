import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays } from "lucide-react";
import { CmsEmptyState, CmsPanel } from "@/components/cms-ui";
import { MetricCard, StatusBadge } from "@/components/cms";
import { PipelineBar, SectionHeader } from "@/components/dashboard/primitives";
import { BarMetricChart, ChartCard, DonutChart } from "@/components/dashboard/chart-card";
import {
  authorName,
  sectionName,
  type DashboardArticle,
} from "@/components/dashboard/types";

export function EditorialView({
  articles,
  metrics,
  canViewArticles,
}: {
  articles: DashboardArticle[];
  metrics: { pendingReview: number; drafts: number; scheduled: number; archived: number };
  canViewArticles: boolean;
}) {
  const draft = articles.filter((a) => a.status === "draft");
  const review = articles.filter((a) => a.status === "review");
  const scheduled = articles.filter((a) => a.status === "scheduled");
  const published = articles.filter((a) => a.status === "published");
  const approved = published.slice(0, 8);

  const workload = new Map<string, number>();
  for (const article of [...draft, ...review, ...scheduled]) {
    const name = authorName(article.author);
    workload.set(name, (workload.get(name) ?? 0) + 1);
  }
  const editorWorkload = [...workload.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const sectionMap = new Map<string, number>();
  for (const article of articles) {
    const name = sectionName(article.sections);
    sectionMap.set(name, (sectionMap.get(name) ?? 0) + 1);
  }
  const sectionPerf = [...sectionMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const calendar = [...scheduled]
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
    .slice(0, 8);

  const bottlenecks = [
    { label: "Review waiters", value: review.length },
    { label: "Stale drafts (>7d)", value: draft.filter(isStale).length },
    { label: "Unassigned authors", value: [...draft, ...review].filter((a) => !a.author_id).length },
    { label: "Scheduled window", value: scheduled.length },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Editorial workflow"
        description="Draft → review → schedule → publish visibility across the desk"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Draft queue" value={metrics.drafts} detail="In progress" />
        <MetricCard
          label="Pending review"
          value={metrics.pendingReview}
          detail="Needs decision"
          trend={metrics.pendingReview ? "down" : "neutral"}
        />
        <MetricCard label="Scheduled" value={metrics.scheduled} detail="Timed to publish" />
        <MetricCard label="Approved / live" value={published.length} detail="In recent set" trend="up" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CmsPanel title="Draft queue" description="Work in progress">
          <QueueList items={draft.slice(0, 8)} canOpen={canViewArticles} empty="No drafts" />
        </CmsPanel>
        <CmsPanel title="Pending review queue" description="Awaiting editorial sign-off">
          <QueueList items={review} canOpen={canViewArticles} empty="Review queue is clear" />
        </CmsPanel>
        <CmsPanel title="Approved articles" description="Recently published">
          <QueueList items={approved} canOpen={canViewArticles} empty="No approved stories yet" />
        </CmsPanel>
        <CmsPanel title="Scheduled publications" description="Timed for go-live">
          <QueueList
            items={scheduled}
            canOpen={canViewArticles}
            empty="Nothing scheduled"
            showSchedule
          />
        </CmsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <CmsPanel title="Editorial calendar" description="Upcoming scheduled publishes">
          {!calendar.length ? (
            <CmsEmptyState title="Calendar clear" description="Schedule stories to fill the week." />
          ) : (
            <div className="divide-y divide-border">
              {calendar.map((article) => (
                <div key={article.id} className="flex items-start gap-3 px-5 py-4">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    {canViewArticles ? (
                      <Link
                        to="/admin/articles/$id"
                        params={{ id: article.id }}
                        className="text-sm font-semibold text-foreground hover:text-cat-blue"
                      >
                        {article.title}
                      </Link>
                    ) : (
                      <div className="text-sm font-semibold">{article.title}</div>
                    )}
                    <div className="mt-1 cms-metric text-[11px] text-muted-foreground">
                      {article.scheduled_at
                        ? new Date(article.scheduled_at).toLocaleString()
                        : "Unscheduled"}
                    </div>
                  </div>
                  <StatusBadge status="scheduled">scheduled</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </CmsPanel>

        <CmsPanel title="Workflow progress" description="Content pipeline mix">
          <PipelineBar
            stages={[
              { label: "Draft", value: draft.length, tone: "bg-muted-foreground/50" },
              { label: "Review", value: review.length, tone: "bg-gold" },
              { label: "Scheduled", value: scheduled.length, tone: "bg-cat-blue" },
              { label: "Published", value: published.length, tone: "bg-cat-green" },
            ]}
          />
        </CmsPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <CmsPanel title="Content pipeline" description="Stage counts">
          <div className="divide-y divide-border">
            {[
              ["Draft", draft.length],
              ["Review", review.length],
              ["Scheduled", scheduled.length],
              ["Published", published.length],
              ["Archived", metrics.archived],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="cms-metric font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </CmsPanel>

        <CmsPanel title="Review bottlenecks" description="Where work stalls">
          <div className="divide-y divide-border">
            {bottlenecks.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="cms-metric font-semibold text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </CmsPanel>

        <ChartCard
          title="Editor workload"
          description="Open assignments by author"
          empty={!editorWorkload.length}
          emptyTitle="No open workload"
          emptyDescription="Assign authors to drafts and reviews."
        >
          <BarMetricChart data={editorWorkload} layout="vertical" />
        </ChartCard>

        <ChartCard
          title="Section performance"
          description="Story volume by desk"
          empty={!sectionPerf.length}
        >
          <DonutChart data={sectionPerf} />
        </ChartCard>
      </div>
    </div>
  );
}

function isStale(article: DashboardArticle) {
  const age = Date.now() - new Date(article.updated_at).getTime();
  return age > 7 * 24 * 60 * 60 * 1000;
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
      {items.map((article) => {
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{article.title}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span>{sectionName(article.sections)}</span>
                <span>{authorName(article.author)}</span>
                {showSchedule && article.scheduled_at ? (
                  <span className="cms-metric">
                    {new Date(article.scheduled_at).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>
            <StatusBadge status={article.status}>{article.status}</StatusBadge>
          </>
        );
        if (!canOpen) {
          return (
            <div key={article.id} className="flex items-center gap-3 px-5 py-4">
              {body}
            </div>
          );
        }
        return (
          <Link
            key={article.id}
            to="/admin/articles/$id"
            params={{ id: article.id }}
            className="flex items-center gap-3 px-5 py-4 cms-transition hover:bg-accent/50"
          >
            {body}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

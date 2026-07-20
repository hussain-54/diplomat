import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { ArticlesScheduledCalendar } from "@/components/articles/articles-scheduled-calendar";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { DonutChart } from "@/components/dashboard/chart-card";
import {
  emptyTrash,
  getArticlesQueueSnapshot,
  purgeArticle,
  restoreArticle,
} from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type ArticleStatus = Database["public"]["Enums"]["article_status"];
type QueueKey = "review" | "approved" | "published" | "scheduled" | "archived" | "trash";

const QUEUE_META: Record<
  QueueKey,
  { title: string; description: string; icon: LucideIcon; lockedStatus?: ArticleStatus }
> = {
  review: {
    title: "Pending Review",
    description: "Articles awaiting editorial approval.",
    icon: ClipboardList,
    lockedStatus: "review",
  },
  approved: {
    title: "Approved",
    description: "Articles approved and ready to publish or schedule.",
    icon: CheckCircle2,
    lockedStatus: "approved",
  },
  published: {
    title: "Published",
    description: "Live articles visible to your audience.",
    icon: FileText,
    lockedStatus: "published",
  },
  scheduled: {
    title: "Scheduled",
    description: "Timed publishes waiting to go live.",
    icon: CalendarClock,
    lockedStatus: "scheduled",
  },
  archived: {
    title: "Archived Articles",
    description: "Stories removed from the active publishing pipeline.",
    icon: Archive,
    lockedStatus: "archived",
  },
  trash: {
    title: "Trash",
    description: "Deleted articles that can be restored or permanently removed.",
    icon: Trash2,
  },
};

export function ArticlesQueuePage({ queue }: { queue: QueueKey }) {
  const meta = QUEUE_META[queue];
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar" | "timeline">("list");

  const snapshot = useQuery({
    queryKey: ["articles-queue", queue],
    queryFn: () => getArticlesQueueSnapshot({ data: { queue } }),
    staleTime: 15_000,
  });

  const restore = useMutation({
    mutationFn: (id: string) => restoreArticle({ data: { id } }),
    onSuccess: () => {
      toast.success("Article restored");
      void qc.invalidateQueries({ queryKey: ["articles-queue"] });
      void qc.invalidateQueries({ queryKey: ["admin-articles"] });
      void qc.invalidateQueries({ queryKey: ["articles-library-counts"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const purge = useMutation({
    mutationFn: (id: string) => purgeArticle({ data: { id } }),
    onSuccess: () => {
      toast.success("Permanently deleted");
      void qc.invalidateQueries({ queryKey: ["articles-queue"] });
      void qc.invalidateQueries({ queryKey: ["articles-library-counts"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const empty = useMutation({
    mutationFn: emptyTrash,
    onSuccess: () => {
      toast.success("Trash emptied");
      void qc.invalidateQueries({ queryKey: ["articles-queue"] });
      void qc.invalidateQueries({ queryKey: ["articles-library-counts"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (snapshot.isLoading) return <CmsPageSkeleton metrics={5} panels={2} />;

  const Icon = meta.icon;
  const kpis = snapshot.data?.kpis ?? [];
  const trashItems = queue === "trash" ? snapshot.data?.items ?? [] : [];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={`Home · Content · Articles · ${meta.title}`}
        title={meta.title}
        description={meta.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {queue === "scheduled" ? (
              <>
                <button
                  type="button"
                  className={view === "list" ? cmsButton : cmsSecondaryButton}
                  onClick={() => setView("list")}
                >
                  List
                </button>
                <button
                  type="button"
                  className={view === "calendar" ? cmsButton : cmsSecondaryButton}
                  onClick={() => setView("calendar")}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  className={view === "timeline" ? cmsButton : cmsSecondaryButton}
                  onClick={() => setView("timeline")}
                >
                  Timeline
                </button>
              </>
            ) : null}
            {queue === "trash" ? (
              <button
                type="button"
                className={cn(cmsSecondaryButton, "text-destructive")}
                disabled={empty.isPending}
                onClick={() => {
                  if (window.confirm("Permanently delete all trashed articles?")) empty.mutate();
                }}
              >
                Empty Trash
              </button>
            ) : null}
            {queue === "approved" ? (
              <Link to="/admin/articles/scheduled" className={cmsButton}>
                Schedule / Publish
              </Link>
            ) : null}
            <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
              <Icon className="h-4 w-4" /> New Article
            </Link>
          </div>
        }
      />

      {snapshot.error ? <CmsAlert>{snapshot.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {kpis.map((kpi) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            detail={typeof (kpi as { detail?: string }).detail === "string" ? (kpi as { detail?: string }).detail : undefined}
            icon={Icon}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          {queue === "trash" ? (
            <CmsPanel title="Trashed articles">
              {trashItems.length === 0 ? (
                <CmsEmptyState title="Trash is empty" description="Deleted articles will appear here." />
              ) : (
                <ul className="divide-y divide-border/50">
                  {trashItems.map((row) => {
                    const item = row as {
                      id: string;
                      title: string;
                      deleted_at?: string | null;
                      delete_reason?: string | null;
                      hero_image_url?: string | null;
                    };
                    const daysLeft = item.deleted_at
                      ? Math.max(
                          0,
                          30 -
                            Math.floor(
                              (Date.now() - new Date(item.deleted_at).getTime()) / 86400000,
                            ),
                        )
                      : 30;
                    return (
                      <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                        {item.hero_image_url ? (
                          <img src={item.hero_image_url} alt="" className="h-12 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-16 rounded bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium line-clamp-1">{item.title}</div>
                          <p className="text-xs text-muted-foreground">
                            {item.delete_reason || "Deleted"} ·{" "}
                            <span className="text-destructive">{daysLeft} days left</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          className={cmsSecondaryButton}
                          onClick={() => restore.mutate(item.id)}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className={cn(cmsSecondaryButton, "text-destructive")}
                          onClick={() => {
                            if (window.confirm("Permanently delete this article?")) purge.mutate(item.id);
                          }}
                        >
                          Delete forever
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CmsPanel>
          ) : queue === "scheduled" && view !== "list" ? (
            <ArticlesScheduledCalendar
              mode={view}
              items={(snapshot.data?.upcoming ?? snapshot.data?.items ?? []) as Array<{
                id: string;
                title: string;
                scheduled_at?: string | null;
                hero_image_url?: string | null;
                sections?: { name?: string } | null;
              }>}
            />
          ) : (
            <ArticlesListPanel
              title={meta.title}
              description={meta.description}
              lockedStatus={meta.lockedStatus}
            />
          )}
        </div>

        <aside className="space-y-4">
          {queue === "review" ? (
            <CmsPanel title="Review summary">
              <DonutChart
                data={[
                  { label: "Pending", value: snapshot.data?.counts.review ?? 0 },
                  { label: "Approved", value: snapshot.data?.counts.approved ?? 0 },
                  { label: "Drafts", value: snapshot.data?.counts.draft ?? 0 },
                ]}
              />
            </CmsPanel>
          ) : null}
          {queue === "approved" ? (
            <CmsPanel title="Publishing overview">
              <DonutChart
                data={[
                  { label: "Ready", value: snapshot.data?.counts.approved ?? 0 },
                  { label: "Scheduled", value: snapshot.data?.counts.scheduled ?? 0 },
                ]}
              />
              <Link to="/admin/articles/$id" params={{ id: "new" }} className={cn(cmsButton, "mt-4 w-full justify-center")}>
                Publish workflow
              </Link>
            </CmsPanel>
          ) : null}
          {queue === "published" ? (
            <CmsPanel title="Overview (last 7 days)">
              <CmsEmptyState
                title="Connect analytics"
                description="Views, engagement, and shares will chart here."
              />
            </CmsPanel>
          ) : null}
          {queue === "scheduled" ? (
            <CmsPanel title="Upcoming (next 5)">
              {(snapshot.data?.upcoming?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming publishes.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {(snapshot.data?.upcoming ?? []).map((row, i) => {
                    const item = row as { id: string; title: string; scheduled_at?: string | null };
                    return (
                      <li key={item.id} className="flex gap-2">
                        <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                        <div className="min-w-0">
                          <Link
                            to="/admin/articles/$id"
                            params={{ id: item.id }}
                            className="font-medium hover:text-primary line-clamp-1"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.scheduled_at
                              ? new Date(item.scheduled_at).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CmsPanel>
          ) : null}
          {queue === "archived" || queue === "trash" ? (
            <CmsPanel title="Quick actions">
              <div className="space-y-2 text-sm">
                <Link to="/admin/articles/all" className="block rounded-lg border border-border/60 px-3 py-2 hover:bg-accent">
                  Browse all articles
                </Link>
                <Link to="/admin/articles/archived" className="block rounded-lg border border-border/60 px-3 py-2 hover:bg-accent">
                  Archive library
                </Link>
              </div>
            </CmsPanel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}


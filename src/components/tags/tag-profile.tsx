import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Pencil, Search, Settings2 } from "lucide-react";
import { TAGS_PROFILE_TABS } from "@/components/tags/nav";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  MetricCard,
  cmsSecondaryButton,
} from "@/components/cms";
import { LineTrendChart } from "@/components/dashboard/chart-card";
import { getTagArticles, getTagDetail } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export function TagProfileShell({
  tagId,
  children,
}: {
  tagId: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const detailQ = useQuery({
    queryKey: ["tag-detail", tagId],
    queryFn: () => getTagDetail({ data: { id: tagId } }),
  });

  if (detailQ.isLoading) return <CmsPageSkeleton metrics={4} panels={2} />;
  if (detailQ.error) return <CmsAlert>{detailQ.error.message}</CmsAlert>;

  const tag = detailQ.data?.tag;
  if (!tag) return <CmsAlert>Tag not found.</CmsAlert>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-4">
          {tag.cover_image_url ? (
            <img
              src={tag.cover_image_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-border/60"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold text-primary">
              {tag.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold tracking-tight">{tag.name}</h1>
              <CmsStatus
                tone={
                  tag.status === "published"
                    ? "success"
                    : tag.status === "scheduled"
                      ? "warning"
                      : "neutral"
                }
              >
                {tag.status}
              </CmsStatus>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(tag.created_at).toLocaleDateString()} · Language{" "}
              {(tag.language || "en").toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/tags/$id/edit" params={{ id: tagId }} className={cmsSecondaryButton}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <Link to="/admin/tags/$id/analytics" params={{ id: tagId }} className={cmsSecondaryButton}>
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <Link to="/admin/tags/seo" className={cmsSecondaryButton}>
            <Search className="h-4 w-4" /> SEO
          </Link>
          <Link to="/admin/tags/$id/edit" params={{ id: tagId }} className={cmsSecondaryButton}>
            <Settings2 className="h-4 w-4" /> Settings
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border/60 pb-px">
        {TAGS_PROFILE_TABS.map((tab) => {
          const to =
            tab.to === "profile" ? "/admin/tags/$id" : "/admin/tags/$id/analytics";
          const active =
            tab.to === "profile"
              ? location.pathname === `/admin/tags/${tagId}` ||
                location.pathname === `/admin/tags/${tagId}/`
              : location.pathname.startsWith(`/admin/tags/${tagId}/analytics`);
          return (
            <Link
              key={tab.to}
              to={to}
              params={{ id: tagId }}
              className={cn(
                "relative px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground" /> : null}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

export function TagProfileOverview({ tagId }: { tagId: string }) {
  const detailQ = useQuery({
    queryKey: ["tag-detail", tagId],
    queryFn: () => getTagDetail({ data: { id: tagId } }),
  });
  const articlesQ = useQuery({
    queryKey: ["tag-articles", tagId],
    queryFn: () => getTagArticles({ data: { tag_id: tagId, pageSize: 8 } }),
  });

  if (detailQ.isLoading) return <CmsPageSkeleton metrics={4} panels={2} />;
  const data = detailQ.data;
  const tag = data?.tag;
  if (!tag) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Articles" value={data.stats.articles} />
        <MetricCard label="Views" value="—" detail="Connect analytics" />
        <MetricCard label="Traffic" value="—" detail="Connect analytics" />
        <MetricCard label="Search volume" value="—" detail="Search Console not connected" />
        <MetricCard label="SEO score" value={data.stats.seoScore} detail="/100" />
        <MetricCard label="Language" value={(tag.language || "en").toUpperCase()} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CmsPanel title="Description" className="xl:col-span-2">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {tag.description || "No description provided."}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Parent" value={data.parent?.name ?? "None"} />
            <Info label="Slug" value={tag.slug} />
            <Info label="Focus keyword" value={tag.focus_keyword ?? "—"} />
            <Info label="Country" value={tag.country ?? "—"} />
            <Info label="Updated" value={new Date(tag.updated_at).toLocaleString()} />
            <Info label="AI optimized" value={tag.ai_optimized ? "Yes" : "No"} />
          </dl>
        </CmsPanel>

        <CmsPanel title="Performance">
          <dl className="space-y-2 text-sm">
            <Stat label="Traffic" value="—" muted />
            <Stat label="Impressions" value="—" muted />
            <Stat label="Clicks" value="—" muted />
            <Stat label="CTR" value="—" muted />
          </dl>
        </CmsPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CmsPanel title="Traffic trend">
          <CmsEmptyState title="No traffic data" description="Connect analytics to chart trends." />
        </CmsPanel>
        <CmsPanel title="Search trend">
          <CmsEmptyState title="No search data" description="Connect Search Console to chart trends." />
        </CmsPanel>
        <CmsPanel title="Engagement trend">
          <LineTrendChart data={[]} />
          <p className="mt-2 text-xs text-muted-foreground">Engagement tracking not connected.</p>
        </CmsPanel>
      </div>

      <CmsPanel title="Top articles using tag">
        {(articlesQ.data?.items.length ?? 0) === 0 ? (
          <CmsEmptyState title="No articles" description="Articles linked to this tag will appear here." />
        ) : (
          <ul className="divide-y divide-border/50">
            {articlesQ.data?.items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                {a.hero_image_url ? (
                  <img src={a.hero_image_url} alt="" className="h-12 w-16 rounded-md object-cover" />
                ) : (
                  <div className="h-12 w-16 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to="/admin/articles/$id"
                    params={{ id: a.id }}
                    className="font-medium hover:text-primary line-clamp-1"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString() : a.status} · Views —
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CmsPanel>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums font-medium", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}

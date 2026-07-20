import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTagAnalytics, getTagsModuleAnalytics } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
} from "@/components/cms";
import { DonutChart, LineTrendChart } from "@/components/dashboard/chart-card";

export function TagsAnalyticsPage() {
  const analyticsQ = useQuery({
    queryKey: ["tags-module-analytics"],
    queryFn: getTagsModuleAnalytics,
    staleTime: 20_000,
  });

  if (analyticsQ.isLoading) return <CmsPageSkeleton metrics={6} panels={3} />;
  if (analyticsQ.error) return <CmsAlert>{analyticsQ.error.message}</CmsAlert>;

  const data = analyticsQ.data;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Tag analytics"
        description="Traffic, search, and engagement across the tag library."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Total Traffic" value="—" detail="Connect analytics" />
        <MetricCard label="Search Volume" value="—" detail="Search Console not connected" />
        <MetricCard label="Impressions" value="—" />
        <MetricCard label="Clicks" value="—" />
        <MetricCard label="CTR" value="—" />
        <MetricCard label="Average Position" value="—" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CmsPanel title="Traffic over time">
          {(data?.trafficOverTime.length ?? 0) === 0 ? (
            <CmsEmptyState title="No traffic series" description="Connect analytics to populate this chart." />
          ) : (
            <LineTrendChart data={data?.trafficOverTime ?? []} />
          )}
        </CmsPanel>
        <CmsPanel title="Search trend">
          <CmsEmptyState title="No search trend" description="Connect Search Console to populate this chart." />
        </CmsPanel>
        <CmsPanel title="Engagement trend">
          <CmsEmptyState title="No engagement trend" description="Connect analytics to populate this chart." />
        </CmsPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Country breakdown">
          {(data?.countryBreakdown.length ?? 0) === 0 ? (
            <CmsEmptyState title="No country data" description="Geographic analytics not connected." />
          ) : (
            <DonutChart data={data?.countryBreakdown ?? []} />
          )}
        </CmsPanel>
        <CmsPanel title="SEO score distribution">
          <DonutChart data={data?.seoBuckets ?? []} />
        </CmsPanel>
      </div>

      <CmsPanel title="Top performing tags">
        {(data?.topPerforming.length ?? 0) === 0 ? (
          <CmsEmptyState title="No tags" description="Create tags to see performance." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-muted-foreground">
                <th className="py-2 text-left font-semibold">Tag</th>
                <th className="py-2 text-right font-semibold">Articles</th>
                <th className="py-2 text-right font-semibold">SEO</th>
              </tr>
            </thead>
            <tbody>
              {data?.topPerforming.map((row) => (
                <tr key={row.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5">
                    <Link to="/admin/tags/$id" params={{ id: row.id }} className="font-medium hover:text-primary">
                      {row.name}
                    </Link>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{row.articles}</td>
                  <td className="py-2.5 text-right tabular-nums">{row.seoScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CmsPanel>
    </div>
  );
}

export function TagDetailAnalyticsPage({ tagId }: { tagId: string }) {
  const analyticsQ = useQuery({
    queryKey: ["tag-analytics", tagId],
    queryFn: () => getTagAnalytics({ data: { id: tagId } }),
  });

  if (analyticsQ.isLoading) return <CmsPageSkeleton metrics={6} panels={2} />;
  if (analyticsQ.error) return <CmsAlert>{analyticsQ.error.message}</CmsAlert>;

  const data = analyticsQ.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Total Traffic" value="—" />
        <MetricCard label="Search Volume" value="—" />
        <MetricCard label="Impressions" value="—" />
        <MetricCard label="Clicks" value="—" />
        <MetricCard label="CTR" value="—" />
        <MetricCard label="Articles" value={data?.metrics.articles ?? 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CmsPanel title="Traffic over time">
          {(data?.trafficOverTime.length ?? 0) === 0 ? (
            <CmsEmptyState title="No series yet" description="Publishing activity will appear here." />
          ) : (
            <LineTrendChart data={data?.trafficOverTime ?? []} />
          )}
        </CmsPanel>
        <CmsPanel title="Search trend">
          <CmsEmptyState title="No search data" description="Search Console not connected." />
        </CmsPanel>
        <CmsPanel title="Engagement trend">
          <CmsEmptyState title="No engagement data" description="Analytics not connected." />
        </CmsPanel>
      </div>

      <CmsPanel title="Top articles">
        {(data?.topArticles.length ?? 0) === 0 ? (
          <CmsEmptyState title="No articles" description="Link articles to this tag to populate the list." />
        ) : (
          <ul className="space-y-2 text-sm">
            {data?.topArticles.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <Link to="/admin/articles/$id" params={{ id: a.id }} className="hover:text-primary line-clamp-1">
                  {a.title}
                </Link>
                <span className="text-muted-foreground">—</span>
              </li>
            ))}
          </ul>
        )}
      </CmsPanel>
    </div>
  );
}

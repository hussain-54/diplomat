import { useQuery } from "@tanstack/react-query";
import { getCategoryAnalytics } from "@/lib/admin.functions";
import {
  CmsEmptyState,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
} from "@/components/cms";
import { BarMetricChart, ChartCard, DonutChart, LineTrendChart } from "@/components/dashboard/chart-card";

export function CategoryAnalyticsPage({ categoryId }: { categoryId: string }) {
  const analyticsQ = useQuery({
    queryKey: ["category-analytics", categoryId],
    queryFn: () => getCategoryAnalytics({ data: { id: categoryId } }),
  });

  if (analyticsQ.isLoading) return <CmsPageSkeleton metrics={6} panels={3} />;

  const data = analyticsQ.data;
  const m = data?.metrics;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Total views" value="—" detail="Analytics not connected" />
        <MetricCard label="Sessions" value="—" detail="Connect site analytics" />
        <MetricCard label="Avg. time" value="—" />
        <MetricCard label="Bounce rate" value="—" />
        <MetricCard label="CTR" value="—" />
        <MetricCard label="Articles" value={m?.articles ?? 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Publishing volume" description="Articles published over time (real data)">
          {data?.viewsOverTime?.length ? (
            <LineTrendChart data={data.viewsOverTime} />
          ) : (
            <CmsEmptyState title="No publish history yet" description="Publish articles to see trends." />
          )}
        </ChartCard>

        <ChartCard title="Status breakdown" description="Published vs draft in this category">
          <DonutChart data={data?.statusBreakdown ?? []} />
        </ChartCard>

        <ChartCard title="Traffic sources" description="Requires analytics integration" empty emptyTitle="Not connected">
          <CmsEmptyState title="Traffic sources unavailable" description="Connect Google Analytics or similar to see source breakdown." />
        </ChartCard>

        <ChartCard title="Top countries" description="Requires analytics integration" empty emptyTitle="Not connected">
          <CmsEmptyState title="Geographic data unavailable" description="Audience location will appear when analytics is connected." />
        </ChartCard>

        <ChartCard title="Device breakdown" description="Requires analytics integration">
          <CmsEmptyState title="Device data unavailable" description="Connect analytics to see mobile vs desktop." />
        </ChartCard>

        <ChartCard title="Search impressions" description="Requires Search Console">
          <CmsEmptyState title="Search data unavailable" description="Connect Search Console for impressions and clicks." />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Top keywords">
          {data?.topKeywords?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-left">Keyword</th>
                  <th className="py-2 text-right">Clicks</th>
                  <th className="py-2 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.topKeywords.map((k) => (
                  <tr key={k.keyword} className="border-b border-border/40">
                    <td className="py-2">{k.keyword}</td>
                    <td className="py-2 text-right text-muted-foreground">—</td>
                    <td className="py-2 text-right text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <CmsEmptyState title="No keywords" description="Add focus keywords in category SEO settings." />
          )}
        </CmsPanel>

        <CmsPanel title="Top articles">
          <CmsEmptyState title="Article views unavailable" description="Connect analytics to rank articles by views." />
        </CmsPanel>
      </div>
    </div>
  );
}

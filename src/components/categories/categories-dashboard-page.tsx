import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  FileText,
  FolderTree,
  Globe2,
  Newspaper,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { getCategoriesDashboard } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
  StatusBadge,
} from "@/components/cms";
import { BarMetricChart, ChartCard, DonutChart, LineTrendChart } from "@/components/dashboard/chart-card";

export function CategoriesDashboardPage() {
  const snapshot = useQuery({
    queryKey: ["categories-dashboard"],
    queryFn: getCategoriesDashboard,
    staleTime: 20_000,
  });

  if (snapshot.isLoading) return <CmsPageSkeleton metrics={8} panels={4} />;

  const data = snapshot.data;
  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Organize · Categories"
        title="Categories dashboard"
        description="Taxonomy health, SEO readiness, and editorial structure at a glance."
        actions={
          <Link to="/admin/categories/create" className="text-sm font-semibold text-primary hover:underline">
            Create category
          </Link>
        }
      />

      {snapshot.error ? <CmsAlert>{snapshot.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <MetricCard label="Total Categories" value={kpis?.total ?? 0} icon={FolderTree} changePercent={kpis?.growthPct} />
        <MetricCard label="Active Categories" value={kpis?.active ?? 0} icon={Eye} detail="Public on site" />
        <MetricCard label="Total Articles" value={kpis?.articleTotal ?? 0} icon={FileText} detail="Across all categories" />
        <MetricCard label="Total Views" value="—" icon={TrendingUp} detail="Connect analytics to track" />
        <MetricCard label="Google Indexed" value="—" icon={Globe2} detail="Search Console not connected" />
        <MetricCard label="Google News Eligible" value={kpis?.newsEligible ?? 0} icon={Newspaper} />
        <MetricCard label="Discover Eligible" value={kpis?.discoverEligible ?? 0} icon={Sparkles} />
        <MetricCard label="Avg SEO Score" value={kpis?.avgSeo ?? 0} icon={Globe2} detail="/100" />
        <MetricCard label="AI Optimization" value={kpis?.avgAi ?? 0} icon={Sparkles} detail="/100" />
        <MetricCard label="Featured" value={kpis?.featured ?? 0} icon={Star} />
        <MetricCard label="Hidden" value={kpis?.hidden ?? 0} icon={EyeOff} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Top performing categories" description="By article count">
          {(data?.topPerforming?.length ?? 0) === 0 ? (
            <CmsEmptyState title="No categories yet" description="Create your first category to see performance." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="py-2 text-left font-semibold">Category</th>
                    <th className="py-2 text-right font-semibold">Articles</th>
                    <th className="py-2 text-right font-semibold">Views</th>
                    <th className="py-2 text-right font-semibold">SEO</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topPerforming.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5">
                        <Link
                          to="/admin/categories/$id"
                          params={{ id: row.id }}
                          className="font-medium hover:text-primary"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{row.articles}</td>
                      <td className="py-2.5 text-right text-muted-foreground">—</td>
                      <td className="py-2.5 text-right">
                        <StatusBadge tone={row.seoScore >= 70 ? "success" : row.seoScore >= 50 ? "warning" : "neutral"}>
                          {row.seoScore}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CmsPanel>

        <ChartCard
          title="Stories by category"
          description="Share of articles assigned to each category"
          empty={!data?.trafficByCategory?.length}
          emptyTitle="No article distribution yet"
        >
          <DonutChart data={data?.trafficByCategory ?? []} />
        </ChartCard>

        <ChartCard title="SEO score distribution" description="Categories by SEO score band">
          <BarMetricChart data={data?.seoBuckets ?? []} />
        </ChartCard>

        <ChartCard title="Category growth" description="New categories created per month">
          <LineTrendChart data={data?.growthTrend ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}

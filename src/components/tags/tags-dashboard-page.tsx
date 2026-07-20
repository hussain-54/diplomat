import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Globe2,
  Percent,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { getTagsDashboard } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
  StatusBadge,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { DonutChart } from "@/components/dashboard/chart-card";

export function TagsDashboardPage() {
  const snapshot = useQuery({
    queryKey: ["tags-dashboard"],
    queryFn: getTagsDashboard,
    staleTime: 20_000,
  });

  if (snapshot.isLoading) return <CmsPageSkeleton metrics={8} panels={4} />;

  const data = snapshot.data;
  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Content · Tags"
        title="Tags dashboard"
        description="Taxonomy health, SEO readiness, and trending coverage at a glance."
        actions={
          <Link to="/admin/tags/create" className="text-sm font-semibold text-primary hover:underline">
            Create tag
          </Link>
        }
      />

      {snapshot.error ? <CmsAlert>{snapshot.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <MetricCard label="Total Tags" value={kpis?.total ?? 0} icon={Tag} changePercent={kpis?.growthPct} />
        <MetricCard label="Published Tags" value={kpis?.published ?? 0} icon={Sparkles} detail="Live on site" />
        <MetricCard label="Trending Tags" value={kpis?.trending ?? 0} icon={TrendingUp} detail="This week" />
        <MetricCard label="Google Indexed Tags" value="—" icon={Globe2} detail="Search Console not connected" />
        <MetricCard label="SEO Optimized %" value={`${kpis?.seoOptimizedPct ?? 0}%`} icon={Percent} />
        <MetricCard label="Average SEO Score" value={kpis?.avgSeo ?? 0} icon={Globe2} detail="/100" />
        <MetricCard label="Articles Using Tags" value={kpis?.articlesUsingTags ?? 0} icon={FileText} />
        <MetricCard label="Total Traffic" value="—" icon={TrendingUp} detail="Connect analytics to track" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Top performing tags" description="By article count">
          {(data?.topPerforming?.length ?? 0) === 0 ? (
            <CmsEmptyState title="No tags yet" description="Create your first tag to see performance." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="py-2 text-left font-semibold">Tag</th>
                    <th className="py-2 text-right font-semibold">Articles</th>
                    <th className="py-2 text-right font-semibold">Views</th>
                    <th className="py-2 text-right font-semibold">SEO Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topPerforming.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5">
                        <Link
                          to="/admin/tags/$id"
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

        <CmsPanel title="Trending tags this week">
          {(data?.trending?.length ?? 0) === 0 ? (
            <CmsEmptyState
              title="No trending tags"
              description="Tags linked to recently published articles will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {data?.trending.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link to="/admin/tags/$id" params={{ id: t.id }} className="font-medium hover:text-primary">
                    {t.name}
                  </Link>
                  <span className="inline-flex items-center gap-1 tabular-nums text-emerald-600">
                    {t.growthPct >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                    )}
                    {t.growthPct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CmsPanel>

        <CmsPanel title="SEO health">
          {(data?.seoBuckets?.every((b) => b.value === 0) ?? true) ? (
            <CmsEmptyState title="No SEO data" description="Add SEO metadata to tags to populate this chart." />
          ) : (
            <DonutChart data={data?.seoBuckets ?? []} />
          )}
        </CmsPanel>

        <CmsPanel title="Quick actions">
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/tags/create" className={cmsButton}>
              Create Tag
            </Link>
            <Link to="/admin/tags/import-export" className={cmsSecondaryButton}>
              Import Tags
            </Link>
            <Link to="/admin/tags/import-export" className={cmsSecondaryButton}>
              Export Tags
            </Link>
            <Link to="/admin/tags/seo" className={cmsSecondaryButton}>
              Manage SEO
            </Link>
          </div>
        </CmsPanel>
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { listTrendingTags } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
} from "@/components/cms";

export function TagsTrendingPage() {
  const trendingQ = useQuery({
    queryKey: ["tags-trending"],
    queryFn: listTrendingTags,
    staleTime: 20_000,
  });

  if (trendingQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;
  if (trendingQ.error) return <CmsAlert>{trendingQ.error.message}</CmsAlert>;

  const items = trendingQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Trending tags"
        description="Tags gaining coverage from recently published articles."
      />
      <CmsPanel title={trendingQ.data?.weekLabel ?? "This week"}>
        {items.length === 0 ? (
          <CmsEmptyState
            title="No trending tags"
            description="Publish articles with tags to surface weekly trends."
          />
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0">
                    <Link
                      to="/admin/tags/$id"
                      params={{ id: t.id }}
                      className="font-medium hover:text-primary"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t.weekArticles} article{t.weekArticles === 1 ? "" : "s"} this week
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 tabular-nums text-emerald-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {t.growthPct}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </CmsPanel>
    </div>
  );
}

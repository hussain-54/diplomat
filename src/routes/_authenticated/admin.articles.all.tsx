import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { CmsAlert, CmsPageSkeleton, MetricCard } from "@/components/cms";
import { getArticlesQueueSnapshot } from "@/lib/admin.functions";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/all")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: AllArticlesPage,
});

function AllArticlesPage() {
  const snapshot = useQuery({
    queryKey: ["articles-queue", "all"],
    queryFn: () => getArticlesQueueSnapshot({ data: { queue: "all" } }),
    staleTime: 15_000,
  });

  if (snapshot.isLoading) {
    return <CmsPageSkeleton metrics={6} panels={1} />;
  }

  const kpis = snapshot.data?.kpis ?? [];

  return (
    <div className="space-y-5">
      {snapshot.error ? <CmsAlert>{snapshot.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={FileText}
            detail={
              typeof (kpi as { detail?: string }).detail === "string"
                ? (kpi as { detail?: string }).detail
                : undefined
            }
          />
        ))}
      </div>

      <ArticlesListPanel title="All articles" description="" />
    </div>
  );
}

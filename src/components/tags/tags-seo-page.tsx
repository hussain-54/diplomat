import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { listSeoTagsQueue, optimizeTagSeo } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  MetricCard,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";

export function TagsSeoPage() {
  const qc = useQueryClient();
  const seoQ = useQuery({
    queryKey: ["tags-seo-queue"],
    queryFn: listSeoTagsQueue,
    staleTime: 15_000,
  });

  const optimize = useMutation({
    mutationFn: (id: string) => optimizeTagSeo({ data: { id } }),
    onSuccess: () => {
      toast.success("Tag SEO optimized");
      void qc.invalidateQueries({ queryKey: ["tags-seo-queue"] });
      void qc.invalidateQueries({ queryKey: ["tags-table"] });
      void qc.invalidateQueries({ queryKey: ["tags-dashboard"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (seoQ.isLoading) return <CmsPageSkeleton metrics={4} panels={1} />;
  if (seoQ.error) return <CmsAlert>{seoQ.error.message}</CmsAlert>;

  const summary = seoQ.data?.summary;
  const items = seoQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="SEO tags"
        description="Fix missing metadata, lift low scores, and review Discover eligibility."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Average SEO Score" value={summary?.avgSeo ?? 0} detail="/100" />
        <MetricCard label="Missing Metadata" value={summary?.missingMetadata ?? 0} />
        <MetricCard label="Low Performing" value={summary?.lowPerforming ?? 0} detail="Score under 50" />
        <MetricCard label="Discover Eligible" value={summary?.discoverEligible ?? 0} />
      </div>

      <CmsPanel title="SEO queue" description="Internal linking suggestions appear once article graphs are available.">
        {items.length === 0 ? (
          <CmsEmptyState title="No tags" description="Create tags to manage SEO." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="py-2 text-left font-semibold">Tag</th>
                  <th className="py-2 text-left font-semibold">SEO Score</th>
                  <th className="py-2 text-left font-semibold">Gaps</th>
                  <th className="py-2 text-left font-semibold">Discover</th>
                  <th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const gaps = [
                    row.missingTitle ? "Title" : null,
                    row.missingMeta ? "Meta" : null,
                    row.missingKeyword ? "Keyword" : null,
                  ].filter(Boolean);
                  return (
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
                      <td className="py-2.5">
                        <CmsStatus
                          tone={row.seoScore >= 70 ? "success" : row.seoScore >= 50 ? "warning" : "danger"}
                        >
                          {row.seoScore}
                        </CmsStatus>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {gaps.length ? gaps.join(", ") : "Complete"}
                      </td>
                      <td className="py-2.5">{row.discoverEligible ? "Eligible" : "—"}</td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-2">
                          <Link
                            to="/admin/tags/$id/edit"
                            params={{ id: row.id }}
                            className={cmsSecondaryButton}
                          >
                            Improve SEO
                          </Link>
                          <button
                            type="button"
                            className={cmsButton}
                            disabled={optimize.isPending}
                            onClick={() => optimize.mutate(row.id)}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {row.aiOptimized ? "Re-optimize" : "Generate Metadata"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

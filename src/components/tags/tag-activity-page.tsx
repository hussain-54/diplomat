import { useQuery } from "@tanstack/react-query";
import { listTagActivity } from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
} from "@/components/cms";

export function TagActivityPage() {
  const activityQ = useQuery({
    queryKey: ["tag-activity"],
    queryFn: () => listTagActivity({ data: { pageSize: 50 } }),
    staleTime: 15_000,
  });

  if (activityQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;
  if (activityQ.error) return <CmsAlert>{activityQ.error.message}</CmsAlert>;

  const items = activityQ.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Tag activity logs"
        description="Created, updated, SEO, image, and status changes across the module."
      />
      <CmsPanel>
        {items.length === 0 ? (
          <CmsEmptyState title="No activity yet" description="Tag changes will be logged here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="py-2 text-left font-semibold">User</th>
                  <th className="py-2 text-left font-semibold">Action</th>
                  <th className="py-2 text-left font-semibold">Details</th>
                  <th className="py-2 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                  const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
                  return (
                    <tr key={row.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5">{profile?.name || profile?.email || "Staff"}</td>
                      <td className="py-2.5 font-medium">{formatAction(row.action)}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {row.details || tag?.name || "—"}
                      </td>
                      <td className="py-2.5 text-right text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
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

function formatAction(action: string) {
  const map: Record<string, string> = {
    "tag.created": "Tag Created",
    "tag.updated": "Tag Updated",
    "tag.seo_updated": "SEO Updated",
    "tag.image_updated": "Image Updated",
    "tag.status_changed": "Status Changed",
    "tag.deleted": "Tag Deleted",
    "tag.import": "Import",
  };
  return map[action] || action;
}

import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/scheduled")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesListPanel
      title="Scheduled"
      description="Timed publications."
      lockedStatus="scheduled"
    />
  ),
});

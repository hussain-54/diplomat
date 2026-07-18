import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/review")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesListPanel
      eyebrow="Articles · Queue"
      title="Pending Review"
      description="Editorial review queue. Approve / reject / request-changes actions deepen in Phase 12."
      lockedStatus="review"
    />
  ),
});
